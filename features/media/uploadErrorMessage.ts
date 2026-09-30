const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Readable message for failed uploads; proxies may answer 413 with nested JSON before the route runs. */
export const userFacingUploadHttpError = (error: unknown): string | null => {
  const ax = error as {
    response?: {
      status?: number;
      data?: unknown;
    };
  };
  const status = ax.response?.status;
  const data = ax.response?.data;

  const pickNestedMessage = (): string | null => {
    if (!isRecord(data)) return null;
    if (typeof data.error === "string" && data.error.trim()) {
      return data.error.trim();
    }
    if (typeof data.message === "string" && data.message.trim()) {
      return data.message.trim();
    }
    if (isRecord(data.error)) {
      const inner = data.error;
      if (typeof inner.message === "string" && inner.message.trim()) {
        return inner.message.trim();
      }
    }
    return null;
  };

  const raw = pickNestedMessage();

  if (status === 413) {
    if (
      raw &&
      /La imagen es demasiado grande|El video es demasiado grande|dimensiones demasiado grandes|demasiados fotogramas/i.test(
        raw,
      )
    ) {
      return raw;
    }
    if (raw && /entity too large|payload too large|413/i.test(raw)) {
      return "El archivo es demasiado grande para subirlo en este momento. Probá con uno más liviano o comprimido.";
    }
    return "El archivo es demasiado grande para esta operación. Probá con uno más liviano o comprimido.";
  }

  if (status !== undefined && status >= 400 && raw) {
    return raw;
  }
  return null;
};
