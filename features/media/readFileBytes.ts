import { isClientFileReadFailure } from "@/features/media/fileReadErrorMessage";

const readWithFileReader = (file: File): Promise<ArrayBuffer> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (result instanceof ArrayBuffer) resolve(result);
      else reject(reader.error ?? new Error("La lectura no devolvió bytes."));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Falló la lectura del archivo."));
    reader.readAsArrayBuffer(file);
  });

/**
 * `Blob.arrayBuffer()` and `FileReader` reach the file through different paths, and on Android some
 * files fail the first and pass the second. The retry only runs on a read failure, and when both fail
 * the original error, which describes the real problem, is propagated.
 */
export const readFileBytes = async (file: File): Promise<ArrayBuffer> => {
  try {
    return await file.arrayBuffer();
  } catch (error) {
    if (!isClientFileReadFailure(error) || typeof FileReader === "undefined") throw error;
    try {
      return await readWithFileReader(file);
    } catch {
      throw error;
    }
  }
};
