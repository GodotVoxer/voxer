# Notificaciones push

Las notificaciones llegan por la campana dentro de la app (en vivo, por la sala `user:<id>` de tiempo real) y, con Voxer cerrado, como notificaciones del sistema en Android y en los navegadores de escritorio.

## Canales

| Plataforma                | Transporte                                        | Servidor                                                                             | Cliente                           |
| ------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------- |
| Android (versión `gms`)   | Firebase Cloud Messaging, API HTTP v1             | `server/push/fcmClient.ts`, token de OAuth firmado con `jose` (sin `firebase-admin`) | `VoxerMessagingService` en la app |
| Android (versión F-Droid) | UnifiedPush: Web Push al distribuidor del usuario | `server/push/unifiedPushClient.ts`                                                   | `VoxerPushService` en la app      |
| Navegadores de escritorio | Web Push estándar con VAPID                       | `server/push/webPushClient.ts` (`web-push`)                                          | `public/push-sw.js`               |

Todos se guardan en `PushDevice` (`platform` = `ANDROID`, `UNIFIED_PUSH` o `WEB`; los de Web Push guardan el endpoint en `token` y sus claves en `webP256dh`/`webAuth`). El token es único a nivel global porque identifica una instalación, no a un usuario. Cerrar sesión borra todos los dispositivos del usuario.

## Envío

`sendPushToUserIds` (`server/push/send.ts`) reparte los destinatarios por plataforma y nunca lanza errores: sin `PUSH_ENABLED`, o sin credenciales, todo el módulo no hace nada. Siempre corre dentro de `after()`, nunca dentro de una transacción de la base. Los tokens que el servicio de push informa como inexistentes se borran; las fallas transitorias se cuentan y los dispositivos abandonados se purgan después.

Los destinatarios salen de las mismas filas que la campana (`buildCommentNotificationRows` en `server/notifications/recipients.ts`), así que silenciar un vox o las respuestas a un comentario apaga a la vez la campana, el aviso en vivo y todos los canales de push.

## Anonimato y contenido

Los mensajes solo llevan datos, sin la clave `notification`, así la app o el service worker arman la fila visible. Nunca llevan quién actuó, el dueño, el autor, el nombre de usuario, IPs, quién denunció, el detalle que escribió el denunciante ni ids internos. `server/push/payload.test.ts` lo fija estructuralmente.

Sí llevan texto que ya es público en el sitio, para que no haga falta abrir la notificación:

- **Comentarios.** El título dice el motivo y el vox («Te respondieron en «…»») y el cuerpo es el comentario, sin los `>>TAG` (`lib/comments/notificationText.ts`). Un comentario sin texto dice «Imagen», «Video» o «GIF»; el archivo nunca viaja.
- **Denuncias** (solo staff). El título dice qué se denunció y el motivo; el cuerpo es el comentario denunciado o el título del vox, en todas las categorías.

`body` es una línea de hasta 140 caracteres para la fila contraída. `expandedBody` es el texto de la fila expandida, de hasta 600: el comentario completo, o el título y la descripción del vox denunciado. Solo se envía si agrega algo a `body`. Los navegadores tienen un único cuerpo que el sistema corta y expande por su cuenta, así que reciben el largo. El tope sale del límite de 4 KB de FCM y de Web Push, y vale para cualquier alfabeto.

Las notificaciones se ven en la pantalla de bloqueo. Por eso, en las categorías del grupo `nsfw` el push de un comentario no dice de qué vox es: no lleva el título ni la miniatura, solo el texto del comentario. En Android con FCM el contenido pasa por Google sin cifrado de extremo a extremo; Web Push y UnifiedPush van cifrados hasta el dispositivo.

## Agrupado

Los comentarios del mismo vox comparten una sola fila de notificación por canal (`collapseKey`). Cada comentario nuevo la reemplaza con su texto y un contador actualizado («N nuevos»), lleva al último comentario y muestra la miniatura del vox una sola vez. Las denuncias tienen una fila por contenido denunciado. Android tiene canales separados para comentarios en vox seguidos, respuestas y denuncias (solo staff), así cada usuario los configura por separado.

## Campana

Cada fila de la campana muestra debajo del mensaje un fragmento del comentario, y la de denuncias el del comentario denunciado. El fragmento no se guarda en la notificación: se lee del comentario en cada listado, así un comentario borrado deja de mostrarse y uno editado se ve como quedó.

### Lectura con el vox abierto

Con un vox abierto, sus notificaciones se marcan como leídas solas, pero solo las de comentarios que ya están en el hilo. La página manda a `POST /api/notifications/mark-read` la fecha del comentario más nuevo que tiene en pantalla (`seenThrough`) y el servidor marca hasta ahí; responde cuántas del vox quedaron sin leer (`remaining`). Así, en modo diferido, la notificación de un comentario que todavía espera detrás del «+N» sigue sin leer hasta que se lo revela, y lo mismo pasa mientras los comentarios cargan o la pestaña está oculta. Las notificaciones de comentarios borrados se marcan igual, porque ya no hay nada para ver. Sin `seenThrough` (la campana, al tocar una fila) se marcan todas las del vox.

La lógica está en `features/notifications/markVoxRead.ts` y `hooks/notifications/useMarkVoxNotificationsRead.ts`.

## Escritorio

- El servidor hace POST al endpoint que registró el navegador, así que `server/push/webPushSubscription.ts` solo acepta hosts de servicios de push conocidos (Google, Mozilla, Apple, Microsoft): cualquier otro host convertiría cada comentario en un pedido del servidor a una URL arbitraria.
- `public/push-sw.js` se registra con el alcance `/push-sw/`, así no controla ninguna página ni choca con el worker de MSW. Al tocar la notificación, enfoca una pestaña abierta y le pide que navegue con el router, o abre una ventana nueva.
- Se activa con un clic en la campana (`components/Notifications/DesktopPushToggle.tsx`). `hooks/device/useWebPushBridge.ts` nunca crea suscripciones: solo vuelve a registrar una existente después de iniciar sesión de nuevo o de rotar la clave VAPID. Dentro de la app Android no aparece, porque ahí el push es nativo.

## UnifiedPush

- El endpoint pertenece al distribuidor que use cada persona, muchas veces en su propio servidor, así que no sirve la lista de hosts de Web Push. En cambio, `server/push/unifiedPushEndpoint.ts` solo acepta `https` en el puerto por defecto y rechaza los nombres locales y las direcciones privadas, de loopback, link-local y reservadas. Además, el envío resuelve el hostname con una búsqueda que falla si alguna dirección no es pública, lo que también cubre el DNS rebinding. El pedido no sigue redirecciones, tiene un límite de tiempo y nunca lee el cuerpo de la respuesta. Los mensajes van cifrados y firmados con VAPID como cualquier Web Push, y llevan el mismo mapa de datos que FCM, en JSON.
- Sin un distribuidor instalado no hay push. En ese caso la campana de la app muestra un aviso con un link a ntfy en F-Droid (`components/Notifications/PushDistributorHint.tsx`), y la app se registra en cuanto el usuario instala uno y vuelve.

## Android

La app guarda su token y la página lo registra con `POST /api/push/devices` (ver el [README de Android](../android/README.md)). El token se registra solo después de que el usuario acepta el permiso de notificaciones.

Expandida, la fila muestra el texto completo (`BigTextStyle`) y la miniatura del vox queda chica a la derecha. Las versiones anteriores a la que lee `expandedBody` muestran la línea de `body`.

Cuando un vox se abre dentro de la app, la página le pide que borre las notificaciones de ese vox (`clearVoxNotifications`, desde `hooks/notifications/useClearNativeVoxNotifications.ts`), junto con el resumen del grupo si queda vacío. Lo pide recién cuando no queda nada del vox sin ver (ver [Lectura con el vox abierto](#lectura-con-el-vox-abierto)), y lo vuelve a pedir si llega un push con el vox abierto o al volver a la app. Cada fila guarda el id del vox; las que mostraron versiones anteriores a la 1.1.1 se reconocen por su `collapseKey`, salvo las de denuncias, que se van recién cuando el contador llega a cero.

## Configuración

`PUSH_ENABLED=true`, más la cuenta de servicio de Firebase (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) para la versión `gms` de Android y/o el par VAPID (`NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY`, `WEB_PUSH_VAPID_PRIVATE_KEY`, `WEB_PUSH_VAPID_SUBJECT`) para escritorio y UnifiedPush. Solo el servidor contacta a los servicios de push, así que la CSP no necesita cambios.
