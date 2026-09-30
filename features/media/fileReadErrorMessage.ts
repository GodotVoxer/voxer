/**
 * A `File` from the picker is a reference, not bytes, and reading it can fail (moved file, cloud-only
 * copy, lost permission). Browsers throw a `DOMException` with an English message that would reach the
 * Spanish UI untranslated.
 */
const FILE_READ_ERROR_NAMES = new Set(["NotReadableError", "NotFoundError", "SecurityError"]);

/** Technical name of the failure, or `null` when it is not a file read error. */
export const fileReadErrorName = (error: unknown): string | null => {
  if (typeof error !== "object" || error === null) return null;
  const name = (error as { name?: unknown }).name;
  if (typeof name !== "string" || !FILE_READ_ERROR_NAMES.has(name)) return null;
  return name;
};

export const isClientFileReadFailure = (error: unknown): boolean =>
  fileReadErrorName(error) !== null;

/** Lists no causes (they look the same from JavaScript) but keeps the technical name for reports. */
export const clientFileReadErrorMessage = (error: unknown): string | null => {
  const name = fileReadErrorName(error);
  if (name === null) return null;
  return `No se pudo leer el archivo (${name}). Probá guardarlo en la galería y elegirlo desde ahí.`;
};
