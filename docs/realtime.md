# Tiempo real

Las novedades en vivo viajan por WebSockets que sirve un Worker de Cloudflare con Durable Objects (`realtime/`). La app de Next.js nunca mantiene sockets: le manda los eventos al Worker por HTTP, y el Worker los reparte entre los clientes de cada sala.

```
navegador ──WebSocket /ws?room=…──▶ Worker ──▶ Durable Object (uno por sala)
servidor Next.js ──POST /internal/emit (secreto Bearer)──▶ Worker ──▶ la misma sala
```

## Salas y eventos

Una sala es un Durable Object (`idFromName(room)`) y forma parte de la URL, así que no hay un protocolo para entrar o salir: el cliente abre un socket por cada sala que necesita.

| Sala              | Quién escucha                                        | Eventos                                                                         |
| ----------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------- |
| `feed:home`       | La grilla del inicio (lista principal, sin búsqueda) | `vox:created`, `vox:activity`, `vox:deleted`, `vox:bulk-deleted`, `vox:updated` |
| `vox:<id>`        | El detalle del vox                                   | eventos de comentarios, encuestas y cambios del vox                             |
| `user:<id>`       | Las pestañas del propio usuario con sesión           | notificaciones, cambios de tema                                                 |
| `presence:global` | Todos                                                | cantidad de usuarios en línea                                                   |

`lib/realtime/rooms.ts` es la única lista de salas y eventos permitidos. El Worker la importa directamente, así que un evento nuevo se tiene que agregar ahí o el Worker lo rechaza. Las salas de usuario exigen un JWT de corta duración de `GET /api/auth/socket` (120 s, firmado con `AUTH_SECRET`; ver `lib/realtime/socketToken.ts`), que el cliente pide en **cada** intento de conexión: un token guardado se rechazaría justo al reconectar. Si el Worker tiene `ALLOWED_ORIGIN` (orígenes del sitio separados por comas), rechaza los sockets que abra una página de otro sitio; sin esa variable no chequea nada, y un handshake sin `Origin` (un script, no un navegador) siempre pasa, porque ese encabezado se puede falsificar (`lib/realtime/socketOrigin.ts`).

Las salas públicas solo llevan datos anónimos. Cuando un evento revelaría algo propio de cada lector (por ejemplo, qué opción votó en una encuesta), la emisión pública lo omite y el cliente lo combina con su propio estado.

## Cliente

- `features/realtime/roomClient.ts` comparte una conexión por sala entre todos los que la usan, con conteo de referencias; los hooks solo usan `features/realtime/acquire.ts`.
- Un keepalive cada 60 s verifica el `pong`: una conexión medio abierta sigue diciendo `OPEN` y descartaría eventos en silencio. Cuando la pestaña recupera el foco o vuelve la red, manda un ping enseguida y reconecta si el pong no llega en 5 s.
- Dentro de la app Android, pasar a segundo plano cierra todas las salas, y nada reconecta hasta que la app vuelve a estar visible; ahí cada sala recupera lo perdido una vez. Pausar el WebView frena el JavaScript pero no la red, así que un socket abierto seguía despertando la radio del teléfono; con la app cerrada, los avisos llegan por push. En escritorio, las pestañas ocultas conservan sus sockets, porque el contador de no leídos del título y el sonido de las notificaciones dependen de ellos.
- No hay polling por HTTP. Solo una reconexión real dispara un único pedido para ponerse al día por sala (la primera página del inicio, el hilo de comentarios, los contadores de notificaciones); un socket sano al volver el foco no hace ningún pedido HTTP.

## Servidor

`server/realtime/broadcast.ts` hace POST a `SOCKET_SERVER_URL/internal/emit` con `SOCKET_BROADCAST_SECRET`, que el Worker compara en tiempo constante. La emisión nunca lanza errores y corre dentro de `after()`, así que una caída del Worker no puede hacer fallar un pedido.

## Configuración

Las dos mitades se configuran por separado y pueden quedar desalineadas:

- El **cliente** elige el transporte al compilar: `NEXT_PUBLIC_REALTIME_MODE=durable` y `NEXT_PUBLIC_SOCKET_URL`.
- El **servidor** decide en tiempo de ejecución si emite: `REALTIME_BROADCAST_ENABLED=true`, `SOCKET_SERVER_URL` y `SOCKET_BROADCAST_SECRET`.

Con el cliente conectado pero la emisión apagada o mal apuntada, los sockets abren, los keepalives responden y no llega ningún evento, sin ningún error. El staff puede revisar la mitad del servidor en `GET /api/moderation/realtime-health` (`server/realtime/broadcastHealth.ts`). Esa prueba apunta a propósito a una sala inválida: el Worker valida el secreto antes que la sala, así que un 400 demuestra que el secreto es correcto sin emitir nada.

Si el Worker está detrás de una zona con protección contra bots, emití por el hostname de `workers.dev` (u otra ruta que no pase por los desafíos de la zona) y dejá el dominio propio para los navegadores: un desafío a las IPs del servidor corta todas las emisiones en el borde, sin que se vea ni en `wrangler tail`.

## Desarrollo local

```bash
cd realtime
cp .dev.vars.example .dev.vars   # tiene que coincidir con SOCKET_BROADCAST_SECRET y AUTH_SECRET de la app
npx wrangler dev --port 8799
node scripts/smoke.mjs           # en otra terminal: reparto, aislamiento entre salas y autenticación
```

Apuntá la app ahí con `NEXT_PUBLIC_REALTIME_MODE=durable`, `NEXT_PUBLIC_SOCKET_URL=http://127.0.0.1:8799`, `REALTIME_BROADCAST_ENABLED=true` y `SOCKET_SERVER_URL=http://127.0.0.1:8799`.
