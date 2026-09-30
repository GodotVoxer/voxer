import { describe, expect, it } from "vitest";
import { intakePickedFile, UNSUPPORTED_UPLOAD_FORMAT_ES } from "@/features/media/pickedFileIntake";

const jpeg = (bytes = new Uint8Array([1, 2, 3])) =>
  new File([bytes], "foto.jpg", { type: "image/jpeg", lastModified: 1_700_000_000_000 });

describe("intakePickedFile", () => {
  it("returns an in-memory copy keeping name, type and date", async () => {
    const result = await intakePickedFile(jpeg());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.file.name).toBe("foto.jpg");
    expect(result.file.type).toBe("image/jpeg");
    expect(result.file.lastModified).toBe(1_700_000_000_000);
    expect(new Uint8Array(await result.file.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("rejects an unsupported format before reading anything", async () => {
    const file = new File(["x"], "notas.txt", { type: "text/plain" });
    const result = await intakePickedFile(file);
    expect(result).toEqual({ ok: false, message: UNSUPPORTED_UPLOAD_FORMAT_ES });
  });

  it("rejects by size", async () => {
    const huge = jpeg(new Uint8Array(11 * 1024 * 1024));
    const result = await intakePickedFile(huge);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).not.toBe(UNSUPPORTED_UPLOAD_FORMAT_ES);
  });

  it("keeps the original when it cannot be read, since a streaming upload may still work", async () => {
    const file = jpeg();
    const failure = new Error("The requested file could not be read…");
    failure.name = "NotReadableError";
    Object.defineProperty(file, "arrayBuffer", { value: () => Promise.reject(failure) });

    const result = await intakePickedFile(file);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.file).toBe(file);
  });
});
