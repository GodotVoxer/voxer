export const assertNoProdMocksInBuild = (): void => {
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.NEXT_PUBLIC_USE_MOCKS === "true") {
    throw new Error(
      "NEXT_PUBLIC_USE_MOCKS no puede estar activo en builds de producción (MSW interceptaría /api).",
    );
  }
};
