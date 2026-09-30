import { useEffect, useMemo } from "react";

/** Blob URL for a local preview; revoked when the file changes or on unmount. */
export const useObjectUrlForFile = (file: File | null): string | null => {
  const url = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    if (!url) return;
    return () => URL.revokeObjectURL(url);
  }, [url]);

  return url;
};
