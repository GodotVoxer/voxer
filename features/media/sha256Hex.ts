/** SHA-256 in hex, for upload dedupe from the browser. */
export const sha256HexFromBlob = async (blob: Blob): Promise<string> => {
  const data = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};
