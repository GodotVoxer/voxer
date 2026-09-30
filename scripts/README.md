# Scripts

Se corren con los scripts de npm de `package.json`. Los que escriben en la base hacen una prueba en seco por defecto y solo aplican los cambios con `-- --execute`; los flags de cada uno están en la cabecera de su archivo.

| Comando                                        | Archivo                         | Para qué                                                                                            |
| ---------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------- |
| `npm run theme:css`                            | `generateThemesCss.ts`          | Regenera el bloque de tokens de tema de `app/globals.css` a partir de `lib/theme/builtinThemes.ts`. |
| `npm run build` (último paso)                  | `verifyThemeBuild.ts`           | Hace fallar el build si el CSS generado no tiene los tokens del tema actual.                        |
| `npm run storage:purge-orphans`                | `purgeOrphanUploads.ts`         | Borra la multimedia que ya no referencia ningún vox ni comentario.                                  |
| `npm run db:backfill-video-posters`            | `backfillVideoPosters.ts`       | Genera posters para los videos subidos que no tienen.                                               |
| `npm run db:repair-blank-video-posters`        | `repairBlankVideoPosters.ts`    | Reemplaza los posters de video totalmente transparentes.                                            |
| `npm run db:backfill-registration-ip-hash`     | `backfillRegistrationIpHash.ts` | Reemplaza las IPs de registro viejas guardadas en claro por su HMAC.                                |
| `npx tsx scripts/generateSidebarBrandLogos.ts` | `generateSidebarBrandLogos.ts`  | Genera los logos del menú lateral a partir de `public/vox-welcome.png`.                             |

Todo script que toque la base tiene que importar primero `loadScriptEnv.ts`: los imports se evalúan antes que el cuerpo del script, así que un `dotenv.config()` suelto correría después de que el cliente de Prisma ya leyó `DATABASE_URL`.

`scripts/private/` está ignorado por git, para scripts de un solo uso que no se publican.
