# Temas

Voxer trae un tema oscuro (el predeterminado), uno claro, un modo «sistema» que sigue al sistema operativo y temas personalizados que arman los usuarios. Todos los colores del producto pasan por tokens de tema, así que cualquier tema se aplica en todas partes.

## Tokens

- `lib/theme/builtinThemes.ts` es la única fuente de los valores de los temas incluidos. El bloque entre las marcas `@generated theme-tokens` de `app/globals.css` se genera a partir de ahí con `npm run theme:css`, y `lib/theme/builtinThemes.test.ts` falla si quedó desactualizado. El bloque vive dentro de `globals.css` y no en un archivo importado porque una vez un `@import` relativo de CSS quedó afuera de un build de producción y la app se quedó sin colores.
- Los nombres de los tokens se declaran en `lib/theme/themeTokens.ts`. Para sumar uno: declaralo ahí, dale un valor en los dos temas y regenerá. El mismo archivo lista `CONTRAST_PAIRS`, las combinaciones reales de texto y fondo que el test verifica contra WCAG (4.5:1 para texto, 3:1 para controles y metadatos).
- El código del producto usa **solo** tokens: neutros por rol (`bg-surface`, `bg-surface-raised`, `text-fg`, `text-fg-muted`, `border-fg/10`, `bg-shade/50`), rampas de color (`brand`, `danger`, `warning`, `caution`, `success`, `highlight`, `category`, `special`, `vivid`; por ejemplo `text-brand-300`), `text-on-solid` sobre rellenos sólidos, y tokens compartidos para lo que va sobre multimedia (`text-on-media`, `bg-pill-*`, `bg-avatar-*`). `tests/policy/themeTokenUsage.test.ts` rechaza las clases de la paleta cruda de Tailwind, los hex en clases y los colores `rgb()`/`hsl()` fijos, sin excepciones.
- En el tema claro, los pasos de la rampa que se usan como texto (100–400) y como bordes o tintes (800–950) toman el extremo opuesto de la rampa, mientras que los rellenos sólidos (500–700) conservan su color para que `text-on-solid` (siempre blanco) mantenga el contraste. Un botón sólido es `bg-brand-600 text-on-solid`. Por eso `brand-600` es un poco más oscuro que el `sky-600` de Tailwind: así el texto blanco llega a 4.5:1, y el test lo verifica en los dos temas.
- Las variables del kit de shadcn (`--background`, `--primary`, `--border`…) son alias de los tokens, repetidos en cada `[data-theme]` para que el subárbol del editor de temas los resuelva contra su propia base.

## En ejecución

- La preferencia (`dark | light | system`) se guarda en `localStorage` (`lib/theme/themePreference.ts`). Un script en línea en el `<head>` (`lib/theme/themeBootstrapScript.ts`) la aplica antes del primer pintado; las páginas son estáticas, así que el servidor no puede leer una cookie para hacerlo. Sin JavaScript queda el tema oscuro.
- Después, `components/Theme/ThemeApplier.tsx` mantiene sincronizados `data-theme`, la clase `dark`, `color-scheme`, la meta `theme-color`, los cambios del sistema operativo y las otras pestañas, y le dice a la app Android qué color de fondo pintar.
- Con sesión, la cuenta es la fuente de verdad entre dispositivos (`User.themeMode`, `server/theme/preference.ts`); las reglas puras están en `lib/theme/themeAccountSync.ts`. Al cerrar sesión vuelve la preferencia sin sesión del propio dispositivo, así un equipo compartido no se queda con el tema de otra cuenta.

## Temas personalizados

Un tema personalizado es una base (oscura o clara) más cambios puntuales, nunca CSS libre:

- Los colores son solo `#rrggbb(aa)`, las claves que se pueden cambiar salen de una lista cerrada (`CUSTOM_THEME_OVERRIDE_KEYS`), y los fondos del header y del vox son uniones estructuradas (`none | solid | gradient`, o una imagen subida para el fondo del vox). La validación está en `lib/theme/customThemeSchema.ts`, que además rechaza claves de prototipo y caracteres de control o bidireccionales en los nombres.
- `lib/theme/customTheme.ts` deriva el juego completo de tokens: un tema sin cambios es igual a su base, una semilla cambiada vuelve a derivar sus neutros dependientes (mezcla en OKLab, `lib/theme/colorMath.ts`), y cada color de familia genera su rampa con el paso 600 exacto.
- Solo se aplican las variables que difieren de la base, después de validarlas otra vez (patrón del nombre, valor hex, como mucho `CUSTOM_VARS_MAX`), y se guardan en caché para que el script en línea las pinte sin parpadeo. `?tema=seguro` ignora el tema personalizado en todos lados: es la salida de un tema ilegible.
- Cada usuario puede tener hasta `CUSTOM_THEMES_PER_USER_MAX` temas. Las escrituras usan concurrencia optimista (`version`, 409 si hay conflicto), y cada cambio les avisa a las otras pestañas y dispositivos del usuario por la sala `user:<id>` de tiempo real.
- El editor (`components/Theme/ThemeEditorPanel.tsx`) es un diálogo no modal y sin velo, así la página de atrás muestra el tema en vivo; lleva el `data-theme` de su base, así sus propios controles se leen bien sin importar qué se esté editando. Los avisos de contraste advierten pero no bloquean.

## Tema de temporada (Halloween)

Un tema de temporada se pinta encima de la preferencia de cada usuario sin reemplazarla: no toca `voxer.theme.v1` ni la cuenta, así que cuando termina vuelve sola el tema que cada uno tenía.

- La ventana y el nombre están en `lib/theme/seasonalTheme.ts`. Halloween va del 1 de octubre al 1 de noviembre inclusive (hora de Argentina) y se activa para todos, con o sin sesión. Una pestaña abierta cambia sola cuando arranca o termina la ventana.
- Elegir otro tema (claro, oscuro, sistema o uno propio) lo apaga, y el switch fijo de la sidebar lo vuelve a prender. Esa elección se guarda solo en el dispositivo (`voxer.theme.seasonal.v1`, con el id de la temporada para que no arrastre a la próxima).
- Los colores salen de `lib/theme/halloweenTheme.ts`, con las mismas claves que un tema personalizado, y `npm run theme:css` los vuelca al bloque generado bajo `:root[data-seasonal-theme="halloween"]`. Su test verifica los mismos pares de contraste que los temas incluidos.
- Lo que un tema personalizado no puede hacer va escrito a mano en `app/globals.css`: el header con luna, murciélagos y goteo, la tipografía Creepster del logo (no se precarga, se descarga solo si se usa), la niebla del fondo con telarañas, una araña, murciélagos y un cementerio en el borde inferior, y los avatares de anón con forma de fantasma. Las siluetas son máscaras SVG coloreadas con tokens. El banner de la sidebar es `components/Theme/HalloweenBrandBanner.tsx`.
- El script en línea la aplica antes del primer pintado. `?tema=seguro` y el editor de temas la dejan de lado mientras están activos.
- En los e2e, `seedDemo` la deja apagada salvo que el spec pida `seasonal: true`. Así los tests no dependen de la fecha.

Para la próxima temporada alcanza con cambiar el id, la ventana y la paleta. Pasada la fecha, el código queda inactivo hasta que se lo borre.

## Imágenes de fondo

La imagen de fondo del vox solo la ve el dueño del tema. Las subidas se reconocen por sus bytes (solo JPEG, PNG o WebP), se acotan en dimensiones contra las bombas de descompresión, se recodifican a WebP en dos tamaños sin metadatos, y se verifican contra los hashes bloqueados y un cupo por usuario (`server/theme/processBackgroundImage.ts`, `server/theme/themeAssets.ts`). El cliente manda solo el id del recurso; el servidor resuelve la URL, y el CSS solo acepta URLs que pasan `lib/theme/themeAssetUrls.ts`.

Los temas se pueden exportar e importar como JSON (`lib/theme/customThemeTransfer.ts`). Una imagen viaja como un token opaco de 192 bits, nunca como URL ni clave de almacenamiento; al importar, la imagen se copia a la cuenta que la recibe después de los mismos controles.

## Tests

La base visual de Playwright (`e2e/visual/baseline.spec.ts`) captura cada pantalla en los dos temas; `e2e/theme/` cubre el cambio de tema, que se conserve sin parpadeo, el modo sistema y los temas personalizados.
