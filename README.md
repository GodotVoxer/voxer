# Voxer

Foros anónimos al estilo de los imageboards. Alguien publica un _vox_ (un tema con título, una imagen, video, GIF o link de YouTube opcional y, si quiere, una encuesta) y los demás responden en tiempo real, sin que su identidad llegue nunca a otros usuarios.

La web también corre dentro de una app Android liviana, con notificaciones nativas.

## Funciones

- Grilla de inicio con categorías, vox fijados, búsqueda y novedades en vivo cuando llegan vox y comentarios.
- Detalle del vox con multimedia, encuestas, citas entre comentarios (`>>TAG`), comentarios fijados, IDs por hilo, banderas de país y comentarios en vivo.
- Anónimo por diseño: las respuestas públicas no llevan autor, dueño ni IP; los comentarios muestran solo un nombre de usuario (un seudónimo) y un tag por comentario.
- Subida de imágenes, videos y GIFs, recodificados o sin metadatos en el servidor, y deduplicados por hash.
- Notificaciones de respuestas y de vox seguidos: en la web, push en Android y Web Push en escritorio.
- Moderación para el staff: borrado con deshacer, purga de multimedia y bloqueo por hash, bans por cuenta y por red, denuncias e historial de acciones.
- Temas oscuro, claro y del sistema, y temas personalizados con editor en vivo, degradados e imágenes de fondo, que se pueden compartir como JSON.

## Prueba rápida (sin base de datos)

```bash
npm install
npm run dev:demo
```

Abrí <http://localhost:3000>. La demo corre toda la interfaz contra datos simulados en el navegador ([MSW](https://mswjs.io)), con vox y comentarios de ejemplo. Requiere Node.js 24.

## Instalación local completa

```bash
docker compose up -d        # PostgreSQL en localhost:5432
cp .env.example .env        # completá AUTH_SECRET (openssl rand -hex 32)
npm install
npm run db:migrate
npm run dev
```

En desarrollo, lo que se sube se guarda en `public/uploads/` salvo que configures un bucket compatible con S3; en producción hace falta un bucket (ver [self-hosting](docs/self-hosting.md)). Las actualizaciones en tiempo real necesitan el Worker de `realtime/` (ver [tiempo real](docs/realtime.md)); sin él la app funciona igual y se actualiza al recargar. Para hacer admin a tu cuenta:

```bash
docker compose exec db psql -U voxer -c "UPDATE \"User\" SET role = 'ADMIN' WHERE username = 'tu_usuario';"
```

Todos los servicios opcionales (almacenamiento, tiempo real, Redis, Turnstile, push) están explicados en [`.env.example`](.env.example).

## Tecnologías

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui · Prisma 7 + PostgreSQL · zustand · Cloudflare Workers con Durable Objects (tiempo real) · sharp y ffmpeg (multimedia) · Vitest y Playwright · Kotlin (Android).

## Comandos

```bash
npm run dev            # servidor de desarrollo
npm run dev:demo       # servidor de desarrollo con datos simulados, sin servicios
npm run validate       # formato, lint, tipos y tests unitarios (también corre antes de cada commit)
npm run test:visual    # Playwright contra la demo, con comparación de capturas
npm run build          # build de producción
npm run knip           # archivos, exports y dependencias sin uso
```

## Documentación

- [Arquitectura](docs/architecture.md): capas, convenciones y flujo de datos.
- [Tiempo real](docs/realtime.md), [multimedia](docs/media-pipeline.md), [moderación](docs/moderation.md), [temas](docs/theming.md), [notificaciones push](docs/push.md).
- [Self-hosting](docs/self-hosting.md).
- [Diseño de seguridad](docs/security-design.md) y [política de seguridad](SECURITY.md).
- [App Android](android/README.md).

## Contribuir

Mirá [CONTRIBUTING.md](CONTRIBUTING.md). La participación se rige por el [Código de Conducta](CODE_OF_CONDUCT.md).

## Licencia

[MIT](LICENSE)
