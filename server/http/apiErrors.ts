import { NextResponse } from "next/server";
import { ZodError } from "zod";
export const jsonError = (message: string, status: number) => {
  return NextResponse.json({ error: message }, { status });
};

export const signInRequired = () => jsonError("Tenés que iniciar sesión.", 401);
export const forbidden = () => jsonError("No autorizado.", 403);
export const invalidJson = () => jsonError("JSON inválido", 400);
export const invalidRequest = () => jsonError("Solicitud inválida", 400);
export const voxNotFound = () => jsonError("Vox no encontrado", 404);
export const commentNotFound = () => jsonError("Comentario no encontrado", 404);

export const readJsonBody = async (
  req: Request,
): Promise<{ body: unknown } | { error: NextResponse }> => {
  try {
    return { body: await req.json() };
  } catch {
    return { error: invalidJson() };
  }
};
export const zodToMessage = (err: ZodError): string => {
  const first = err.issues[0];
  return first?.message ?? "Datos inválidos";
};
export const isDbConfigured = (): boolean => {
  return Boolean(process.env.DATABASE_URL?.trim());
};

const isProduction = (): boolean => process.env.NODE_ENV === "production";

export const dbUnavailableMessageEs = (): string =>
  isProduction()
    ? "Servicio no disponible. Probá más tarde."
    : "Base de datos no configurada (DATABASE_URL)";

export const authUnavailableMessageEs = (): string =>
  isProduction()
    ? "Servicio no disponible. Probá más tarde."
    : "Autenticación no configurada (AUTH_SECRET, mín. 32 caracteres)";

export const internalErrorMessageEs = (): string =>
  isProduction() ? "Error interno del servidor." : "Error interno";
