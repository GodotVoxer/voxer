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

## Anonimato

Los mensajes solo llevan datos, sin la clave `notification`, así la app o el service worker arman la fila visible. Nunca llevan quién actuó, el dueño, el autor, el nombre de usuario, el texto del comentario, IPs, quién denunció ni ids internos. Las categorías del grupo `nsfw` ocultan el título y la miniatura, porque las notificaciones se ven en la pantalla de bloqueo. `server/push/payload.test.ts` lo fija estructuralmente.

## Agrupado

Los comentarios del mismo vox comparten una sola fila de notificación por canal (`collapseKey`). Cada comentario nuevo la reemplaza con un contador actualizado («N nuevos»), lleva al último comentario y muestra la miniatura del vox una sola vez. Las denuncias tienen una fila por contenido denunciado. Android tiene canales separados para comentarios en vox seguidos, respuestas y denuncias (solo staff), así cada usuario los configura por separado.

## Escritorio

- El servidor hace POST al endpoint que registró el navegador, así que `server/push/webPushSubscription.ts` solo acepta hosts de servicios de push conocidos (Google, Mozilla, Apple, Microsoft): cualquier otro host convertiría cada comentario en un pedido del servidor a una URL arbitraria.
- `public/push-sw.js` se registra con el alcance `/push-sw/`, así no controla ninguna página ni choca con el worker de MSW. Al tocar la notificación, enfoca una pestaña abierta y le pide que navegue con el router, o abre una ventana nueva.
- Se activa con un clic en la campana (`components/Notifications/DesktopPushToggle.tsx`). `hooks/device/useWebPushBridge.ts` nunca crea suscripciones: solo vuelve a registrar una existente después de iniciar sesión de nuevo o de rotar la clave VAPID. Dentro de la app Android no aparece, porque ahí el push es nativo.

## UnifiedPush

- El endpoint pertenece al distribuidor que use cada persona, muchas veces en su propio servidor, así que no sirve la lista de hosts de Web Push. En cambio, `server/push/unifiedPushEndpoint.ts` solo acepta `https` en el puerto por defecto y rechaza los nombres locales y las direcciones privadas, de loopback, link-local y reservadas. Además, el envío resuelve el hostname con una búsqueda que falla si alguna dirección no es pública, lo que también cubre el DNS rebinding. El pedido no sigue redirecciones, tiene un límite de tiempo y nunca lee el cuerpo de la respuesta. Los mensajes van cifrados y firmados con VAPID como cualquier Web Push, y llevan el mismo mapa de datos que FCM, en JSON.
- Sin un distribuidor instalado no hay push. En ese caso la campana de la app muestra un aviso con un link a ntfy en F-Droid (`components/Notifications/PushDistributorHint.tsx`), y la app se registra en cuanto el usuario instala uno y vuelve.

## Android

La app guarda su token y la página lo registra con `POST /api/push/devices` (ver el [README de Android](../android/README.md)). El token se registra solo después de que el usuario acepta el permiso de notificaciones.

Cuando un vox se abre dentro de la app, la página le pide que borre las notificaciones de ese vox (`clearVoxNotifications`, desde `hooks/notifications/useClearNativeVoxNotifications.ts`), junto con el resumen del grupo si queda vacío. Lo vuelve a pedir si llega un push con el vox abierto o al volver a la app. Cada fila guarda el id del vox; las que mostraron versiones anteriores a la 1.1.1 se reconocen por su `collapseKey`, salvo las de denuncias, que se van recién cuando el contador llega a cero.

## Configuración

`PUSH_ENABLED=true`, más la cuenta de servicio de Firebase (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) para la versión `gms` de Android y/o el par VAPID (`NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY`, `WEB_PUSH_VAPID_PRIVATE_KEY`, `WEB_PUSH_VAPID_SUBJECT`) para escritorio y UnifiedPush. Solo el servidor contacta a los servicios de push, así que la CSP no necesita cambios.
