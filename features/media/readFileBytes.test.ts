import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileBytes } from "@/features/media/readFileBytes";

const notReadable = () => {
  const e = new Error("The requested file could not be read…");
  e.name = "NotReadableError";
  return e;
};

const fileThatFails = (error: Error): File => {
  const file = new File([new Uint8Array([9, 9])], "foto.jpg", { type: "image/jpeg" });
  Object.defineProperty(file, "arrayBuffer", { value: () => Promise.reject(error) });
  return file;
};

/** `FileReader` does not exist in the node test environment; install a minimal one. */
const installFileReader = (behaviour: "ok" | "fail") => {
  class FakeFileReader {
    result: ArrayBuffer | null = null;
    error: Error | null = null;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    readAsArrayBuffer() {
      queueMicrotask(() => {
        if (behaviour === "ok") {
          this.result = new Uint8Array([7, 7]).buffer;
          this.onload?.();
        } else {
          this.error = new Error("tampoco");
          this.onerror?.();
        }
      });
    }
  }
  vi.stubGlobal("FileReader", FakeFileReader);
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("readFileBytes", () => {
  it("uses arrayBuffer when it works", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "foto.jpg", { type: "image/jpeg" });
    expect(new Uint8Array(await readFileBytes(file))).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("retries with FileReader when arrayBuffer fails to read", async () => {
    installFileReader("ok");
    const bytes = await readFileBytes(fileThatFails(notReadable()));
    expect(new Uint8Array(bytes)).toEqual(new Uint8Array([7, 7]));
  });

  it("propagates the original error when the retry fails too", async () => {
    installFileReader("fail");
    const original = notReadable();
    await expect(readFileBytes(fileThatFails(original))).rejects.toBe(original);
  });

  it("does not retry errors that are not read failures", async () => {
    installFileReader("ok");
    const other = new Error("abortado");
    other.name = "AbortError";
    await expect(readFileBytes(fileThatFails(other))).rejects.toBe(other);
  });

  it("propagates the original error without FileReader", async () => {
    const original = notReadable();
    await expect(readFileBytes(fileThatFails(original))).rejects.toBe(original);
  });
});
