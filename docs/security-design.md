# Diseño de seguridad

Cómo protege Voxer a sus usuarios, y las invariantes que cualquier cambio tiene que respetar. Para reportar una vulnerabilidad, ver [SECURITY.md](../SECURITY.md).

## Anonimato

- Las respuestas públicas de la API, los eventos en tiempo real y las notificaciones push no llevan identidad real: ni ids de autor o dueño, ni IPs. Ver [arquitectura](architecture.md#anonimato).
- Las IPs se leen solo de la cabecera del proxy que realmente está delante de la app (`TRUSTED_PROXY`, `server/http/requestIp.ts`); cualquier otra cabecera la controla el cliente. Se guardan solo como un HMAC con `VOXER_CLIENT_IP_PEPPER` (`server/http/clientIpHash.ts`) y nunca se devuelven.
- Las banderas de país salen de un código ISO que manda la cabecera del proxy de confianza al crear el comentario; la IP en sí no se guarda.

## Sesiones y cuentas

- La sesión es un JWT en una cookie `httpOnly` y `SameSite=Lax` (`secure` en producción), firmado con `AUTH_SECRET`. Incluye `sessionVersion`: cerrar sesión la incrementa, lo que invalida todas las demás sesiones y borra los dispositivos de push del usuario.
- Las sesiones duran `SESSION_TTL_SEC` (7 días) y se renuevan solas: `GET /api/auth/me` reemite la cookie cuando ya pasó la mitad de su vida, así una app instalada no vence mientras se usa.
- El login verifica un hash argon2 ficticio cuando el usuario no existe, así el tiempo de respuesta no revela qué cuentas existen.
- El registro puede exigir un token de Cloudflare Turnstile (`TURNSTILE_SECRET_KEY`); la IP del cliente no se le manda a Cloudflare.
- Para publicar hay que aceptar la versión vigente de las reglas de la comunidad, y lo exige el servidor.

## Pedidos

- `proxy.ts` rechaza las mutaciones de `/api/*` con `Sec-Fetch-Site: cross-site` y exige un `Origin` o `Referer` del propio sitio (`server/http/apiMutationOrigin.ts`). Las lecturas se limitan a 300 por minuto por IP e instancia, en memoria.
- Los límites de uso de login, registro, publicaciones, subidas, denuncias y búsquedas van por IP (`server/http/rateLimits.ts`); las acciones con sesión, como favoritos, votos o registro de push, van por usuario (`server/http/userActionRateLimit.ts`). Todo endpoint nuevo con sesión que escriba en la base necesita un límite ahí. Con Redis configurado los límites se comparten; si Redis falla, pasan a memoria en vez de hacer fallar el pedido.
- Los route handlers validan los cuerpos con zod, y las escrituras de temas rechazan los cuerpos sin un `Content-Length` válido antes de leerlos.

## Content Security Policy

`lib/http/contentSecurityPolicy.ts` arma una política aplicada (no solo de reporte): sin `'unsafe-eval'` en producción, `frame-ancestors 'self'`, `object-src 'none'`, `upgrade-insecure-requests`, y los orígenes de imágenes, multimedia y conexiones limitados al almacenamiento, al Worker de tiempo real y a YouTube. No usa nonces a propósito: obligarían a renderizar cada página en el momento. `CSP_REPORT_ONLY=1` la pasa a modo reporte sin tocar el código. Cada origen nuevo que cargue el navegador se agrega ahí y en su test.

## Multimedia

- Los archivos subidos siempre se recodifican o se limpian de metadatos, y si algo falla se rechazan; ffmpeg corre con un demuxer fijo, protocolos limitados a `file`, un chequeo del contenedor y un límite de tiempo; la decodificación de imágenes está acotada contra las bombas de descompresión. Ver [multimedia](media-pipeline.md).
- Las subidas directas caen en `incoming/`, que el dominio público del almacenamiento no debe servir, y solo el servidor publica la copia procesada en `uploads/`.
- Un vox o un comentario solo puede referenciar URLs de subidas propias o YouTube. Los embeds de YouTube usan `youtube-nocookie.com` con un `sandbox` restringido.
- Un admin puede bloquear para siempre el hash de un archivo.

## Tiempo real

El Worker valida los ids de sala, compara el secreto de emisión en tiempo constante, solo acepta las salas y eventos de la lista compartida, y exige un JWT de corta duración para las salas privadas de usuario. Ver [tiempo real](realtime.md).

## Push

Los mensajes no llevan identidad ni contenido (ver [notificaciones push](push.md)). El servidor solo hace POST a endpoints de servicios de push conocidos o, para UnifiedPush, a direcciones públicas; nunca a cualquier host que registre un cliente.

## App Android

El puente con JavaScript expone lo mínimo y nunca devuelve la sesión; compartir recibe un path y la app arma la URL. El WebView no carga nada local, bloquea el contenido mixto y las cookies de terceros, y la cookie de sesión queda excluida de los backups. La app bloquea las navegaciones a otros dominios que el usuario no pidió.

## Moderación

Los controles de rol corren en el servidor (`lib/moderation/roleGuards.ts`, `server/moderation/protectedContent.ts`) y, para el contenido de un admin, verifican también la identidad, no solo el rol. Ver [moderación](moderation.md).
