import { createHash } from "crypto";

export const sha256HexFromBuffer = (buf: Buffer): string =>
  createHash("sha256").update(buf).digest("hex");
