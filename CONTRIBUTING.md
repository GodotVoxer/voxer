# Cómo contribuir

Gracias por sumarte. Los issues y pull requests son bienvenidos, desde un error de tipeo hasta una función nueva.

## Antes de empezar

- Para cualquier cosa más grande que un arreglo chico, abrí un issue primero, así acordamos el enfoque antes de que inviertas tiempo.
- Los problemas de seguridad van por el reporte privado, nunca por issues públicos: ver [SECURITY.md](SECURITY.md).
- El anonimato es la promesa central del producto. Ningún cambio puede exponer quién escribió un vox o un comentario, una IP ni nada que permita correlacionarlos, en ninguna respuesta pública, evento en tiempo real, notificación push ni log que llegue a un cliente. Ver [arquitectura](docs/architecture.md#anonimato).

## Desarrollo

```bash
npm install
npm run dev:demo   # interfaz contra datos simulados, sin servicios
```

El [README](README.md) explica la instalación completa con base de datos. Hace falta Node.js 24.

`npm run validate` corre formato, lint, tipos y tests unitarios; el hook de pre-commit lo corre también. Los cambios de interfaz además tienen que pasar `npm run test:visual`: antes sacá una base en `main` con `npm run test:visual:update`, porque las capturas dependen de tu sistema operativo y tus fuentes y no se versionan.

## Código

- Respetá las capas de la [arquitectura](docs/architecture.md): ESLint controla qué capa puede importar a cuál.
- Los textos de la interfaz van en español rioplatense, con voseo ("Probá de nuevo"). El código, los identificadores, los comentarios del código y los tests van en inglés. La documentación va en español.
- Los colores salen solo de los tokens del tema; ver [temas](docs/theming.md).
- Cambios acotados. Los componentes con estado propio o mucho markup van en su propio archivo dentro de su área.
- Los comentarios explican un _por qué_ que no es obvio. No narran lo que hace el código ni cómo llegó a ser así.
- La lógica pura va en `lib/`, `server/` o `features/`, con un `*.test.ts` al lado. Los cambios de comportamiento necesitan tests.
- Los cambios de base de datos son migraciones de Prisma (`npx prisma migrate dev --name <cambio>`). Tienen que ser compatibles con la versión anterior de la app, que sigue corriendo durante un deploy.
- Un evento nuevo de tiempo real se agrega en `lib/realtime/rooms.ts` y requiere volver a desplegar el Worker.
- Un origen nuevo que cargue el navegador se agrega en `lib/http/contentSecurityPolicy.ts` y en su test.

## Pull requests

- Un tema por pull request, con una descripción de qué cambia para los usuarios y cómo lo probaste.
- La CI tiene que pasar: validación, build, tests funcionales de Playwright y el build de Android.
- Al contribuir aceptás que tu aporte se publique bajo la [licencia MIT](LICENSE).
