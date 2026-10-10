# Arquitectura

Voxer es una aplicación de Next.js con App Router (React 19, TypeScript estricto) sobre PostgreSQL con Prisma, con un Worker de Cloudflare para el tiempo real y una app Android opcional que la envuelve. Los textos del producto y la documentación están en español; el código, sus comentarios y los tests, en inglés.

## Capas

El código se divide según dónde puede correr y qué puede importar. ESLint hace cumplir los límites (`no-restricted-imports` en `eslint.config.mjs`); los tests quedan exceptuados.

| Capa                  | Contenido                                                                                                                           | Puede importar                |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `lib/<dominio>/`      | Código isomorfo y sin efectos secundarios: tipos de DTO, esquemas de zod, constantes, lógica pura compartida por cliente y servidor | `lib/`                        |
| `server/<dominio>/`   | Solo servidor: Prisma, sharp, ffmpeg, almacenamiento, límites de uso, emisión en tiempo real, push                                  | `lib/`, `server/`             |
| `features/<dominio>/` | Lógica de cliente: stores de zustand, llamadas a la API (`api.ts`), helpers puros de interfaz                                       | `lib/`, `features/`           |
| `hooks/<dominio>/`    | Hooks de React                                                                                                                      | `lib/`, `features/`, `hooks/` |
| `components/<Área>/`  | Interfaz                                                                                                                            | todo menos `server/` y `app/` |
| `app/`                | Rutas, layouts y route handlers finos                                                                                               | todo                          |

Los route handlers de `app/api/**/route.ts` validan el pedido, delegan en `server/` y responden con los helpers de `server/http/apiErrors.ts`. El navegador llega a la API solo a través de `features/http/apiClient.ts` (axios con `baseURL: "/api"`) y los `features/*/api.ts` de cada dominio.

Dominios: `auth`, `categories` (dentro de `lib/vox`), `comments`, `format`, `http`, `media`, `moderation`, `native`, `notifications`, `push`, `realtime`, `settings`, `theme`, `vox`.

## Convenciones

- Los componentes viven en carpetas en PascalCase por área y rol (`Vox/Detail/`, `Comments/Composer/`, `Moderation/Dialogs/`); todo lo demás va en camelCase. `components/ui/` es el kit de shadcn y conserva sus nombres originales.
- Sin archivos `index.ts` que reexporten: se importa el módulo directo, siempre con el alias `@/`.
- Solo exports con nombre y funciones flecha (`func-style` en ESLint).
- Los colores salen solo de los tokens del tema (ver [temas](theming.md)); `tests/policy/themeTokenUsage.test.ts` rechaza las clases de la paleta cruda y los colores fijos.
- Los tests están al lado de su módulo como `*.test.ts` (Vitest). Los que revisan reglas de todo el repositorio viven en `tests/policy/`, y los helpers compartidos en `tests/utils/`. Los tests de navegador son specs de Playwright en `e2e/`, que corren contra la demo con datos simulados.
- El código de cliente solo importa **tipos** de `@prisma/client` (ESLint lo exige): importar un valor, como un enum, mete el runtime de Prisma en el JavaScript de cada visitante.
- Lo que arranca cerrado o es solo para staff no va en el JavaScript inicial: se carga con `next/dynamic`. Los diálogos de las tarjetas y las herramientas de moderación se montan en la primera apertura (`hooks/common/useOpenedOnce.ts`). Los del header (barra lateral, búsqueda, notificaciones, categorías, login y reglas) se montan cerrados cuando el navegador queda libre (`hooks/common/useIdleReady.ts`), así ya están listos al primer toque; el botón que los abre sí carga de entrada. Para que el ahorro se mantenga, ningún componente que se renderice al cargar la home puede usar los primitivos de Radix.
- Los comentarios explican un _por qué_ que no es obvio, y nada más.

## Anonimato

El anonimato es la promesa central del producto y define cómo es la API:

- Las respuestas públicas (`GET /api/vox`, `GET /api/vox/[id]`, las listas de comentarios, los eventos en tiempo real y las notificaciones push) nunca llevan identidad real: ni el id del autor o del dueño, ni IPs. Los comentarios muestran solo el nombre de usuario del autor, que es un seudónimo (`displayName`), y un `publicTag` por comentario.
- Las IPs se usan solo en el servidor (límites de uso, bans por red) y se guardan solo como un HMAC (`server/http/clientIpHash.ts`); nunca se devuelven, ni siquiera en un error.
- El staff accede a la identidad por las rutas de moderación, que verifican el rol y, para el contenido protegido de un admin, también la identidad (ver [moderación](moderation.md)).

## Flujo de datos

- **Grilla del inicio.** `/` y `/[code]` son páginas estáticas sin datos: la grilla siempre se pide a `GET /api/vox` desde el cliente, así nadie ve una versión vieja del inicio guardada en la caché del HTML. Para no esperar al JavaScript, `/` declara en el `<head>` un `preload` de ese mismo pedido (`lib/vox/homeFeedPreload.ts`): el navegador lo hace apenas recibe el HTML y la grilla reutiliza la respuesta. El HTML solo lleva la dirección, nunca datos. La URL y el modo de credenciales (`use-credentials`) tienen que coincidir exactamente con el pedido de axios, o el feed se baja dos veces; `features/vox/api.test.ts` lo verifica. En la demo no se emite, porque MSW arranca después. La grilla está virtualizada con `@tanstack/react-virtual` sobre el scroll de la ventana, y las columnas salen del ancho medido (`features/vox/grid/gridLayout.ts`). La paginación usa un cursor keyset (`pinnedAt`, `lastActivityAt`, `id`) que se mantiene estable aunque los vox reciban actividad o desaparezcan.
- **Detalle del vox.** La fila pública se cachea cinco minutos por vox, con un tag que las mutaciones invalidan; los datos propios de cada lector se piden aparte. Como el home con el feed, `/vox/[id]` declara un `preload` de la primera página de comentarios (`lib/vox/commentsPreload.ts`), así no esperan a que hidrate la página para salir hacia el servidor; la URL tiene que coincidir con el primer pedido de `loadAllCommentsForVox`, y `features/vox/api.test.ts` lo verifica. Los comentarios también están virtualizados (`hooks/comments/useThreadVirtualizer.ts`): en escritorio sobre el scroll del panel y en mobile sobre el de la ventana, porque el scroll de la página no se informa sobre `<html>` y un virtualizador de elemento puesto ahí monta todas las filas. Las filas con un video en reproducción se mantienen montadas. La altura estimada de cada fila (`features/comments/threadEstimate.ts`) tiene que parecerse a la real: cada diferencia arriba de la pantalla obliga a corregir el scroll, y en pantallas táctiles eso puede cortar la inercia.
- **Novedades en vivo.** Después de la carga inicial por HTTP, todo llega por salas de WebSocket; no hay polling. Ver [tiempo real](realtime.md).
- **Subidas.** La multimedia se sube directo al almacenamiento de objetos y después el servidor la finaliza: le quita los metadatos, genera posters y deduplica por hash. Ver [multimedia](media-pipeline.md).

## Límites de seguridad

- `proxy.ts` rechaza las mutaciones de la API que vienen de otro sitio (chequeos de `Sec-Fetch-Site` y `Origin`/`Referer` en `server/http/apiMutationOrigin.ts`) y limita las lecturas por IP.
- La Content-Security-Policy se arma en `lib/http/contentSecurityPolicy.ts`; cada origen nuevo que cargue el navegador se tiene que agregar ahí y en su test.
- Más detalle en [diseño de seguridad](security-design.md).

## Modo demo

`npm run dev:demo` corre la interfaz con datos simulados de [MSW](https://mswjs.io) (`mocks/`), sin base de datos ni servicios. Los tests visuales y funcionales de Playwright corren contra ella. `mocks/assertNoProdMocks.ts` impide arrancar un build de producción con los datos simulados activados.
