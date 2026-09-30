import { describe, expect, it } from "vitest";
import {
  dataTransferTypesIncludeFiles,
  findFirstFileInDataTransferSource,
  findFirstVoxUploadFileInDataTransfer,
  isAcceptedVoxUploadMime,
  isAcceptedVoxUploadFile,
} from "@/features/media/uploadClientFiles";

describe("isAcceptedVoxUploadFile", () => {
  it("accepts an allowed MIME type", () => {
    expect(isAcceptedVoxUploadFile(new File([], "a.png", { type: "image/png" }))).toBe(true);
  });

  it("accepts an allowed extension without MIME (Android)", () => {
    expect(isAcceptedVoxUploadFile(new File([], "clip.mp4", { type: "" }))).toBe(true);
    expect(
      isAcceptedVoxUploadFile(new File([], "x.bin", { type: "application/octet-stream" })),
    ).toBe(false);
    expect(
      isAcceptedVoxUploadFile(new File([], "clip.mp4", { type: "application/octet-stream" })),
    ).toBe(true);
  });

  it("rejects a disallowed MIME even with a matching extension", () => {
    expect(isAcceptedVoxUploadFile(new File([], "x.mp4", { type: "video/quicktime" }))).toBe(false);
  });
});

describe("isAcceptedVoxUploadMime", () => {
  it("accepts allowed images and videos", () => {
    expect(isAcceptedVoxUploadMime("image/png")).toBe(true);
    expect(isAcceptedVoxUploadMime("video/mp4")).toBe(true);
    expect(isAcceptedVoxUploadMime("video/webm")).toBe(true);
  });

  it("rejects the rest", () => {
    expect(isAcceptedVoxUploadMime("image/svg+xml")).toBe(false);
    expect(isAcceptedVoxUploadMime("video/quicktime")).toBe(false);
    expect(isAcceptedVoxUploadMime("")).toBe(false);
  });
});

describe("findFirstVoxUploadFileInDataTransfer", () => {
  it("picks the first allowed file", () => {
    const mp4 = new File([], "a.mp4", { type: "video/mp4" });
    const items = [
      {
        kind: "file" as const,
        type: "application/pdf",
        getAsFile: () => new File([], "x.pdf", { type: "application/pdf" }),
      },
      { kind: "file" as const, type: "video/mp4", getAsFile: () => mp4 },
    ];
    expect(
      findFirstVoxUploadFileInDataTransfer({
        items: items as unknown as DataTransferItemList,
        files: undefined as unknown as FileList,
      } as Pick<DataTransfer, "items" | "files">),
    ).toBe(mp4);
  });
});

describe("findFirstFileInDataTransferSource", () => {
  it("uses the predicate", () => {
    const png = new File([], "a.png", { type: "image/png" });
    expect(findFirstFileInDataTransferSource({ items: [], files: null }, () => false)).toBeNull();
    expect(
      findFirstFileInDataTransferSource(
        {
          items: [{ kind: "file" as const, type: "image/png", getAsFile: () => png }],
        },
        (f) => f.type === "image/png",
      ),
    ).toBe(png);
  });
});

describe("dataTransferTypesIncludeFiles", () => {
  it("detects the Files type", () => {
    expect(dataTransferTypesIncludeFiles({ types: ["Files"] } as unknown as DataTransfer)).toBe(
      true,
    );
    expect(
      dataTransferTypesIncludeFiles({ types: ["text/plain"] } as unknown as DataTransfer),
    ).toBe(false);
    expect(dataTransferTypesIncludeFiles(null)).toBe(false);
  });
});
