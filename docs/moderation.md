# Moderación

Los roles son `USER`, `MOD` y `ADMIN` (`lib/moderation/roles.ts`). Las rutas de moderación están en `/api/moderation/*`, y la interfaz del staff en `/moderacion` y en los menús de staff de tarjetas y comentarios.

## Jerarquía

- Un `MOD` puede actuar sobre el contenido y las cuentas de `MOD` y `USER`; solo un `ADMIN` puede banear, borrar en bloque o purgar la multimedia de un `ADMIN`, o deshacer una acción de un `ADMIN` (`lib/moderation/roleGuards.ts`, que también se usa en el cliente).
- El contenido de un admin está protegido por identidad, no solo por rol: nadie banea a un admin, y el staff no puede borrar un vox creado por un admin ni un comentario suelto de un admin. Cada admin modera su propio contenido. El servidor verifica la identidad también en las vistas previas, las purgas y al deshacer (`server/moderation/protectedContent.ts`).
- El historial de publicaciones de un admin solo lo ve ese admin; el historial de acciones de moderación lo ve todo el staff, que puede ver las acciones de un admin pero no deshacerlas.
- La identidad de otro admin queda oculta para el staff, mientras que cada admin sigue viendo su propio contenido (`hidesAdminIdentity`).

## Moderar una publicación

`PublicationStaffModerationDialog` es la única entrada (menú de staff del comentario, riel de staff de la tarjeta, botón «Moderar vox» del detalle e historial del autor). Tiene dos pasos independientes:

1. **La publicación**, como una escalera donde cada escalón incluye al anterior: dejarla, borrarla, borrarla y purgar el archivo, o borrarla, purgar el archivo y bloquear su hash (solo admins; irreversible).
2. **El autor**: opcionalmente, banearlo, con motivo, duración, alcance de cuenta o de red, y qué otras publicaciones suyas borrar (ninguna, las de un período o todas). Antes de confirmar, el diálogo muestra cuántas publicaciones entran en ese alcance (`GET /api/moderation/users/[id]/ban-content`).

Para esas otras publicaciones también se elige qué pasa con sus archivos: conservarlos (por defecto, para que deshacer las devuelva enteras), borrarlos o, solo para admins, borrarlos y bloquear sus hashes. La purga en bloque alcanza también las publicaciones del período que ya estaban ocultas, porque un archivo oculto se sigue sirviendo por su URL hasta que vence el borrado reversible. Llega tan lejos como purgarlas una por una: un vox se lleva los archivos de todos sus comentarios. Como no se puede deshacer, pide marcar una confirmación aparte.

El botón «Contenido ilegal» está pensado para gore o abuso infantil y marca todo junto: borrar y bloquear el archivo (borrar, para un `MOD`), ban permanente con la red y todo el historial con sus archivos. Igual hay que revisarlo y marcar la confirmación.

La lógica del plan es pura (`features/moderation/publicationPlan.ts`); `hooks/moderation/usePublicationModeration.ts` ejecuta los pasos en orden (borrar → purgar/bloquear → ban → borrado en bloque), recuerda cuáles ya salieron bien para que un reintento no los repita, e informa lo que se aplicó aunque falle un paso posterior.

El estado del diálogo vive en un panel que solo se monta mientras el diálogo está abierto, así cada apertura arranca de cero.

## Borrado reversible y retención

- Borrar pone `deletedAt` y `deletedByUserId` y registra una `ModerationAction`; las lecturas públicas filtran `deletedAt: null`. `undoModerationAction` restaura la fila mientras siga existiendo.
- Pasado `SOFT_DELETE_GRACE_MS` (7 días), `server/moderation/purgeExpiredSoftDeletes.ts` borra definitivamente los vox vencidos (sus comentarios caen en cascada) y los comentarios huérfanos de vox vivos; su multimedia queda sin referencias y se barre. Después de eso, deshacer no hace nada.
- La purga corre dentro de `after()` cuando se crea un vox, acotada a `PURGE_PER_CREATE_BATCH_MAX` filas por vez. Es idempotente: las carreras se capturan fila por fila y lo pendiente se retoma la vez siguiente.
- `VOX_ACTIVE_DB_CAP` acota la tabla. Cuando un vox nuevo la supera, se borra definitivamente la fila con el `lastActivityAt` más viejo, esté borrada o no; las que estaban vivas emiten `vox:deleted` con el motivo `retention`. El tope también se aplica al contenido de los admins.

## Copias e historial

Los borrados (incluidos los masivos), las recategorizaciones y los fijados guardan copias del contenido afectado en `payload.snapshots`, con la identidad interna necesaria para detectar si alguien pasó a ser admin después. El historial de acciones nunca devuelve esa identidad. Las vistas previas (`GET /api/moderation/actions/[id]/preview`, 10 publicaciones por página) muestran el texto de la copia con la multimedia actual; la multimedia purgada no se muestra y nunca se reutilizan URLs archivadas.

## Ediciones de un admin sobre su propio contenido

Un admin puede editar el título y la descripción de sus propios vox (`PATCH /api/moderation/vox/[id]/edit`), y el texto y las insignias visibles de sus propios comentarios (`PATCH /api/moderation/comments/[id]/edit`). El servidor vuelve a verificar el rol y el dueño, y responde 403 sin decir cuál de los dos chequeos falló, para no revelar de quién es la publicación. Las dos ediciones se registran con los valores anteriores y se pueden deshacer; editar un comentario no genera notificaciones.

## Bans

`server/moderation/postingEligibility.ts` es la única forma del 403 que se devuelve al publicar (vox, comentario y cada ruta de subida). Incluye el motivo del ban, su fin y su alcance, también en los bans por red, y `BanBlockedDialog` los muestra. Escribí los motivos sabiendo que los va a leer la persona baneada y, con un ban por red, cualquiera que comparta esa conexión.

Un ban por red activo también impide crear cuentas desde esa conexión (`server/auth/register.ts`).

## Modo «solo texto»

Es un modo de emergencia para cuando hay un ataque y no da el tiempo para moderar. Un admin lo activa y lo desactiva desde el panel de moderación (`PUT /api/moderation/text-only-mode`); el resto del staff solo ve si está activo. El estado vive en la única fila de `SiteSettings` (`textOnlySince`) y se lee en cada chequeo, así las dos instancias de la app lo ven al instante.

Mientras está activo, ninguna ruta de subida acepta archivos (`server/upload/guard.ts` y la de fondos de tema), y crear un vox o un comentario con un archivo del sitio responde 403, también si el archivo se subió antes de activarlo. Siguen andando el texto y los links de YouTube. El mensaje está en `lib/media/textOnlyMode.ts`. Rige también para el staff: no hay excepción para admins.

## Denuncias

Los usuarios denuncian vox y comentarios. Las denuncias se deduplican por denunciante, publicación y motivo, le avisan al staff por su propia campana y su propio canal de push, y llevan directo al contenido denunciado. Como en las notificaciones, el panel muestra primero las no vistas y, dentro de cada grupo, las más nuevas arriba.
