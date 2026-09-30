import axios from "axios";
import { describe, expect, it } from "vitest";
import { clientThrownErrorMessage, userFacingApiErrorMessage } from "./responseErrors";

describe("clientThrownErrorMessage", () => {
  it("returns the message of a non-Axios Error", () => {
    expect(clientThrownErrorMessage(new Error("  hola  "))).toBe("hola");
  });

  it("returns null for an AxiosError", () => {
    const err = new axios.AxiosError("fail");
    expect(clientThrownErrorMessage(err)).toBeNull();
  });
});

describe("userFacingApiErrorMessage", () => {
  it("reads a jsonError { error }", () => {
    const err = new axios.AxiosError("fail");
    err.response = {
      status: 409,
      statusText: "Conflict",
      data: { error: "  Ya denunciaste  " },
      headers: {},
      config: {} as never,
    };
    expect(userFacingApiErrorMessage(err)).toBe("Ya denunciaste");
  });

  it("reads { message }", () => {
    const err = new axios.AxiosError("fail");
    err.response = {
      status: 400,
      statusText: "Bad Request",
      data: { message: "Campo inválido" },
      headers: {},
      config: {} as never,
    };
    expect(userFacingApiErrorMessage(err)).toBe("Campo inválido");
  });

  it("returns null for non-Axios errors", () => {
    expect(userFacingApiErrorMessage(new Error("x"))).toBeNull();
  });

  it("prefers error over message", () => {
    const err = new axios.AxiosError("fail");
    err.response = {
      status: 400,
      statusText: "Bad Request",
      data: { error: "principal", message: "secundario" },
      headers: {},
      config: {} as never,
    };
    expect(userFacingApiErrorMessage(err)).toBe("principal");
  });
});
