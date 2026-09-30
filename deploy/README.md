# Deploy

Infraestructura de producción para un solo servidor: dos copias de la app detrás de Caddy para deployar sin cortes, PostgreSQL, Redis para los límites de uso, un Cloudflare Tunnel opcional, página de mantenimiento, backups y actualización mensual de las imágenes.

| Archivo                                                 | Para qué                                                                |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `docker-compose.yml`                                    | La infraestructura completa.                                            |
| `.env.example`, `app.env.example`, `backup.env.example` | Configuración de Compose, de la app y de los backups.                   |
| `deploy.sh`                                             | Migra y reemplaza las copias de la app de a una, con vuelta atrás.      |
| `backup.sh`, `update-infra.sh`, `systemd/`              | Backup diario de la base y actualización mensual de la infraestructura. |
| `Caddyfile`, `maintenance/`                             | Balanceo de carga, chequeos de salud y la página de mantenimiento.      |

Instrucciones paso a paso: [docs/self-hosting.md](../docs/self-hosting.md).
