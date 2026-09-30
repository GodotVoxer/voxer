import { describe, expect, it } from "vitest";
import {
  clientFileReadErrorMessage,
  fileReadErrorName,
  isClientFileReadFailure,
} from "@/features/media/fileReadErrorMessage";

const domError = (name: string): Error => {
  const e = new Error("The requested file could not be read…");
  e.name = name;
  return e;
};

describe("clientFileReadErrorMessage", () => {
  it("translates the read failure instead of passing the English text through", () => {
    const message = clientFileReadErrorMessage(domError("NotReadableError"));
    expect(message).toContain("No se pudo leer el archivo");
    expect(message).not.toContain("could not be read");
  });

  it("includes the technical name, the only thing that tells cases apart in a report", () => {
    expect(clientFileReadErrorMessage(domError("NotReadableError"))).toContain("NotReadableError");
    expect(clientFileReadErrorMessage(domError("SecurityError"))).toContain("SecurityError");
  });

  it("gives one concrete step without listing causes", () => {
    const message = clientFileReadErrorMessage(domError("NotReadableError")) ?? "";
    expect(message).toContain("guardarlo en la galería");
    expect(message.length).toBeLessThan(120);
  });

  it("covers a moved file and a lost permission", () => {
    expect(isClientFileReadFailure(domError("NotFoundError"))).toBe(true);
    expect(isClientFileReadFailure(domError("SecurityError"))).toBe(true);
  });

  it("leaves other errors alone, they have their own message", () => {
    expect(clientFileReadErrorMessage(new Error("Falló la subida (500)."))).toBeNull();
    expect(fileReadErrorName(domError("AbortError"))).toBeNull();
  });

  it("tolerates non-error values", () => {
    expect(clientFileReadErrorMessage(null)).toBeNull();
    expect(clientFileReadErrorMessage("NotReadableError")).toBeNull();
    expect(clientFileReadErrorMessage(undefined)).toBeNull();
  });
});
