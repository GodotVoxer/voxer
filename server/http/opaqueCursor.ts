/** Base64url JSON behind an optional version prefix; callers validate the decoded shape. */
export const encodeOpaqueCursor = (value: unknown, prefix = ""): string =>
  prefix + Buffer.from(JSON.stringify(value), "utf8").toString("base64url");

/** Decoded JSON, or `undefined` when the prefix is missing or the payload is not valid JSON. */
export const decodeOpaqueCursor = (raw: string, prefix = ""): unknown => {
  if (!raw.startsWith(prefix)) return undefined;
  try {
    return JSON.parse(Buffer.from(raw.slice(prefix.length), "base64url").toString("utf8"));
  } catch {
    return undefined;
  }
};
