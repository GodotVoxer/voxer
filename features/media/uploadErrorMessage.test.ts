import { describe, expect, it } from "vitest";
import { userFacingUploadHttpError } from "./uploadErrorMessage";

describe("userFacingUploadHttpError", () => {
  it("a platform 413 (nested message) returns generic text", () => {
    const err = {
      response: {
        status: 413,
        data: {
          error: {
            code: "413",
            message: "Request Entity Too Large",
          },
        },
      },
    };
    const m = userFacingUploadHttpError(err);
    expect(m).toBeTruthy();
    expect(m).toMatch(/demasiado grande/);
    expect(m).not.toMatch(/Vercel|4,5|MB|hosting/i);
  });

  it("a 413 with the app's message returns that message", () => {
    const err = {
      response: {
        status: 413,
        data: { error: "La imagen es demasiado grande" },
      },
    };
    expect(userFacingUploadHttpError(err)).toBe("La imagen es demasiado grande");
  });

  it("a 400 with an error string returns it", () => {
    const err = {
      response: {
        status: 400,
        data: { error: "Formulario inválido" },
      },
    };
    expect(userFacingUploadHttpError(err)).toBe("Formulario inválido");
  });

  it("a 413 without a useful body uses the generic default", () => {
    const err = { response: { status: 413, data: {} } };
    const m = userFacingUploadHttpError(err);
    expect(m).toMatch(/demasiado grande/);
    expect(m).not.toMatch(/Vercel|MB|10/i);
  });
});
