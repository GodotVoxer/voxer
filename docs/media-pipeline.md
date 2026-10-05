# Multimedia

Los vox y los comentarios aceptan una imagen, un video o un link de YouTube. Cada archivo subido se recodifica o se limpia de metadatos en el servidor antes de que alguien lo pueda ver, y los archivos idénticos se guardan una sola vez.

## Caminos de subida

**Subida directa (con almacenamiento de objetos configurado).** La multimedia nunca pasa por el servidor de la app:

1. `POST /api/upload/blob-token` verifica la sesión, los bans y los cupos, y devuelve una URL firmada para hacer PUT a una clave dentro de `incoming/` (`server/upload/blobFinalizeUrl.ts`). Una fila de `BlobPendingPutFinalize` asocia esa clave al usuario durante una hora.
2. El navegador hace el PUT del archivo al bucket.
3. `POST /api/upload/blob-image-finalize` o `/blob-video-finalize` lee el original por la API S3 (nunca por la URL pública, donde un CDN lo cachearía con sus metadatos), lo procesa, escribe el resultado en una clave **nueva** dentro de `uploads/` con un `Cache-Control` inmutable y borra el original.

Los originales viven en `incoming/`, que el dominio público del almacenamiento no debe servir (bloqueá ese prefijo en el borde): hasta que se finalizan todavía tienen EXIF. Cada reserva se finaliza una sola vez: el finalize la reclama de forma atómica (`consumedAt`), así dos pedidos simultáneos no procesan el mismo archivo. La fila no se borra al terminar sino al vencer, porque la URL firmada sigue sirviendo 15 minutos: `pruneExpiredBlobPendingFinalizes` borra entonces lo que haya quedado en esa clave, incluidas las reservas que nunca llegaron al finalize.

Los objetos de `uploads/` nunca se reescriben en el lugar. Servir dos versiones de un MP4 bajo la misma URL hacía que los CDN y los navegadores mezclaran rangos de bytes y el video se congelaba.

**Subida multipart.** `POST /api/upload` recibe el archivo como `FormData`, lo procesa igual y guarda el resultado en el bucket, o en `public/uploads/` en el disco local si no hay bucket configurado. Es el único camino sin almacenamiento de objetos, y el que usa el cliente como respaldo cuando la subida directa no está disponible.

Los cuatro puntos de entrada comparten `server/upload/guard.ts` (chequeos de base de datos, sesión, almacenamiento, límite de uso y ban).

## Procesamiento

Todo falla cerrado: si el procesamiento falla, la subida se rechaza y el objeto se borra. Nunca se guardan los bytes originales como respaldo.

- **Las imágenes** se recodifican con sharp (`server/media/imageProcess.ts`), que descarta el EXIF y el resto de los metadatos. Los límites de píxeles decodificados se verifican sobre la cabecera y se le pasan a sharp como `limitInputPixels`, contra las bombas de descompresión. Las imágenes fijas y las animadas tienen límites distintos (`lib/media/uploadLimits.ts`): una foto se acota por ancho × alto, y una animación por tamaño del lienzo, cantidad de cuadros y píxeles totales. El error le dice al usuario cuál se superó.
- **Los GIF animados se convierten en MP4** (`server/media/animatedGifToVideo.ts`). Recodificar un GIF largo con libvips lleva decenas de segundos de CPU y da un archivo más pesado; H.264 tarda menos de un segundo y queda varias veces más chico. La fila se marca con `animatedImage`, y `components/Media/LoopingVideo.tsx` lo reproduce en bucle, sin sonido y sin controles, así que se sigue viendo como un GIF. `muted` es lo que permite la reproducción automática en los navegadores y en el WebView de Android. Un GIF de un solo cuadro se queda como GIF.
- **Los videos** pasan por ffmpeg (`server/media/stripVideoMetadata.ts`) sin los mapas de metadatos. ffmpeg corre con un demuxer fijo (`-f mov` o `-f matroska`), `-protocol_whitelist file`, un chequeo previo de los bytes del contenedor y un límite de 60 s: sin eso, un `.mp4` que en realidad es una playlist HLS hace que ffmpeg lea archivos locales y los publique.
- **Los posters de video** son un cuadro sacado con ffmpeg y guardado como WebP de 480 px en el mismo pedido (`server/media/videoPoster.ts`). Esta parte falla abierta: si no sale un cuadro, la subida sigue con el placeholder `/video-thumb.svg`.

## Deduplicación y bloqueo

`StoredMediaByHash` asocia el SHA-256 de los bytes procesados con sus URLs guardadas. Una subida repetida reutiliza el archivo existente y renueva `lastUsedAt`. El cliente puede mandar un hash para ahorrarse el PUT, pero el finalize siempre lo vuelve a calcular sobre los bytes reales.

Un admin puede bloquear un archivo al purgarlo: la fila se conserva con `blockedAt` como lápida, y todos los caminos de subida rechazan ese hash con un 403 antes de registrarlo. El bloqueo solo coincide con los bytes exactos; un recorte o una recompresión dan otro hash.

## Limpieza

- `cleanupManagedUploadUrlsIfUnreferenced` borra un archivo cuando ninguna fila de `Vox` ni de `Comment` lo referencia (contando las borradas con soft delete, así deshacer una acción de moderación recupera su multimedia). Un período de gracia de 24 h (`STORED_MEDIA_SWEEP_GRACE_MS`) protege los adjuntos de borradores que se subieron pero todavía no se publicaron.
- Las purgas del staff (`/api/moderation/*/purge-media`) se saltean esa gracia, porque una purga existe justamente para bajar algo subido hace minutos, pero siguen respetando otras referencias al mismo archivo.
- `npm run storage:purge-orphans` hace un barrido completo a mano.

## Del lado del cliente

- **Nunca exigir leer el archivo en JavaScript.** Subir un archivo lo transmite desde el disco sin que JavaScript lo lea; `arrayBuffer()` es otra cosa, y en Android hay archivos que el navegador deja subir pero no leer (`NotReadableError`). Cada lectura (miniatura, hash) es un intento que puede fallar sin consecuencias.
- `features/media/pickedFileIntake.ts` es la única entrada para los archivos elegidos, pegados o soltados: valida el tipo y el tamaño y, si puede, lee el archivo a memoria enseguida, así una referencia que caduca mientras el usuario escribe falla al principio y no al publicar. `features/media/readFileBytes.ts` reintenta un `Blob.arrayBuffer()` fallido con `FileReader`, que llega al archivo por otro camino.
- `features/media/clientImagePrep.ts` achica en un `<canvas>` las imágenes pesadas o de más de 2048 px antes de subirlas. Los navegadores con protección contra fingerprinting (Tor Browser, Mullvad Browser, LibreWolf, Firefox con `privacy.resistFingerprinting`) contestan las lecturas del canvas con píxeles falsos: un patrón de 8 píxeles al azar repetido, que se ve como rayas. Por eso, antes de recodificar, `features/media/canvasReadbackProbe.ts` dibuja colores conocidos y los vuelve a leer; si no coinciden, se sube el original y el servidor lo procesa igual. La vista previa muestra el original, así que no delata el problema.
- Los inputs de archivo **no tienen el atributo `accept`**, a propósito: cuando solo admite multimedia, Chrome en Android abre el selector de Google Fotos en vez del completo (cámara, archivos, otras apps). El tipo se valida al elegir el archivo.
- `components/Media/LocalVideoPreview.tsx` reproduce sin sonido el video recién elegido y lo pausa en el primer cuadro visible: un `<video>` que nunca se reprodujo no muestra nada en Chrome para móviles ni en el WebView de Android.
- Al publicar solo se aceptan URLs de subidas ya procesadas del almacenamiento del sitio (claves `uploads/`) o links de YouTube; los embeds de YouTube usan `youtube-nocookie.com` con un `sandbox` restringido y no se cargan hasta que se toca play: antes solo se muestra la miniatura (`components/Media/LazyYoutubeEmbed.tsx`), igual que con los videos subidos.
