# Self-hosting

Una instancia completa es un servidor Linux con Docker Compose (app, PostgreSQL, Redis, Caddy) y un bucket compatible con S3 para la multimedia, más servicios opcionales: el Worker de tiempo real en Cloudflare, las claves de Firebase y VAPID para push, y Turnstile para proteger el registro. Todo lo opcional queda apagado hasta que lo configures (ver [`.env.example`](../.env.example)).

Los archivos están en [`deploy/`](../deploy). Están pensados para un servidor chico: 2 GB de RAM alcanzan para dos copias de la app y la base.

## 1. Compilar las imágenes

```bash
docker build --target runner  -t registry.example.com/voxer:$(git rev-parse --short HEAD) \
  --build-arg NEXT_PUBLIC_APP_URL=https://www.example.com \
  --build-arg NEXT_PUBLIC_REALTIME_MODE=durable \
  --build-arg NEXT_PUBLIC_SOCKET_URL=https://realtime.example.com \
  --build-arg NEXT_PUBLIC_R2_PUBLIC_BASE_URL=https://media.example.com \
  .
docker build --target migrate -t registry.example.com/voxer-migrate:$(git rev-parse --short HEAD) .
```

Los valores `NEXT_PUBLIC_*` quedan incrustados al compilar (también `NEXT_PUBLIC_TURNSTILE_SITE_KEY` y `NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY` si los usás), así que cada instancia compila su propia imagen. Subí las dos imágenes a un registro del que el servidor pueda descargarlas.

## 2. Preparar el servidor

Copiá el contenido de `deploy/` a una carpeta del servidor y creá sus tres archivos de entorno a partir de los ejemplos:

| Archivo      | Lo lee                       | Contiene                                                                                      |
| ------------ | ---------------------------- | --------------------------------------------------------------------------------------------- |
| `.env`       | Docker Compose y `deploy.sh` | imagen, contraseña de la base, token de Redis, configuración del túnel y de la purga de caché |
| `app.env`    | la app                       | las variables de la app del `.env.example` de la raíz                                         |
| `backup.env` | `backup.sh`                  | credenciales del bucket de backups                                                            |

Después levantá todo y hacé el primer deploy con el tag que compilaste:

```bash
docker compose up -d
./deploy.sh <tag>
```

`deploy.sh` aplica las migraciones, reemplaza `app-blue` y después `app-green`, espera a que cada una quede sana (`GET /api/health`) y vuelve atrás una copia que no lo logra. Por eso las migraciones tienen que funcionar con la versión anterior todavía corriendo.

## 3. Publicarlo en internet

Caddy sirve HTTP plano; algo delante tiene que terminar el TLS y poner la cabecera con la IP del cliente que nombra `TRUSTED_PROXY`.

- **Cloudflare Tunnel** (recomendado): poné `COMPOSE_PROFILES=tunnel` y `CLOUDFLARE_TUNNEL_TOKEN`, apuntá el túnel a `http://caddy:80` y no abras ningún puerto web. Dejá `TRUSTED_PROXY=cloudflare`. Las métricas de `cloudflared` (latencia de cada conexión al borde, errores) quedan en `http://127.0.0.1:20241/metrics`, accesibles solo desde el servidor.
- **Un reverse proxy en el propio servidor**: Caddy escucha en `HTTP_BIND` (por defecto `127.0.0.1:8080`). Usá `TRUSTED_PROXY=xff` solo si ese proxy reescribe `X-Forwarded-For`.

Si un CDN cachea las páginas, purgalo después de cada deploy (`CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_PURGE_TOKEN`, `CLOUDFLARE_PURGE_HOSTS`): el HTML cacheado apuntaría a los archivos del build anterior. Cacheá solo las respuestas marcadas como públicas (`s-maxage`); la API y el detalle de los vox mandan `no-store`.

## 4. Almacenamiento de la multimedia

Creá un bucket (Cloudflare R2 o cualquier servicio compatible con S3) con un dominio público y completá las variables `R2_*`. Su política de CORS tiene que permitir `PUT`, `GET` y `HEAD` desde el origen del sitio, porque los navegadores suben directo. **Bloqueá el prefijo `incoming/` en el dominio público**: ahí esperan los originales, con sus metadatos, hasta que el servidor los procesa.

En producción hace falta un bucket. El respaldo en disco local (`public/uploads/`) solo funciona con `next dev`: el servidor de producción no sirve archivos agregados a `public/` después del build.

## 5. Worker de tiempo real

```bash
cd realtime
npx wrangler secret put SOCKET_BROADCAST_SECRET   # el mismo valor que en la app
npx wrangler secret put AUTH_SECRET               # el mismo valor que en la app
npx wrangler deploy
```

Para que ninguna página de otro sitio pueda abrir sockets, agregá en la config del Worker `"vars": { "ALLOWED_ORIGIN": "https://tu-dominio" }` con el origen del sitio (varios, separados por comas).

Definí `NEXT_PUBLIC_REALTIME_MODE=durable` y `NEXT_PUBLIC_SOCKET_URL` al compilar, y `REALTIME_BROADCAST_ENABLED=true`, `SOCKET_SERVER_URL` y `SOCKET_BROADCAST_SECRET` en `app.env`. Para dominios propios y resolución de problemas, ver [tiempo real](realtime.md).

## 6. Backups y tareas programadas

`backup.sh` vuelca la base a un bucket privado todos los días y conserva los últimos tres volcados en disco; `update-infra.sh` actualiza las imágenes de infraestructura una vez por mes. Instalá los timers de `deploy/systemd/` después de ajustar sus rutas y su usuario:

```bash
sudo cp systemd/*.service systemd/*.timer /etc/systemd/system/
sudo systemctl enable --now voxer-backup.timer voxer-update-infra.timer
```

Probá la restauración cada tanto: bajá el último volcado, restauralo con `pg_restore` en una base de prueba del mismo servidor, contá algunas filas y borrala. Nunca restaures sobre la base en uso.

## Operación

- **Modo mantenimiento:** `touch maintenance/ON` sirve la página de mantenimiento con un 503 (la API responde JSON) y la página se recarga sola cuando el sitio vuelve; `rm maintenance/ON` lo termina. La misma página aparece si ninguna copia de la app responde.
- **Logs:** `docker compose logs -f app-blue app-green`.
- **Estado del tiempo real:** el staff puede abrir `/api/moderation/realtime-health`.
- **Cuenta de admin:** `docker compose exec postgres psql -U voxer -c "UPDATE \"User\" SET role = 'ADMIN' WHERE username = '…';"`
