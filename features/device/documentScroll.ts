export const getDocumentScrollElement = (): HTMLElement | null => {
  if (typeof document === "undefined") return null;
  const el = document.scrollingElement ?? document.documentElement;
  return el instanceof HTMLElement ? el : null;
};
