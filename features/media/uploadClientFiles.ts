const VOX_UPLOAD_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
]);

const VOX_UPLOAD_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif", "mp4", "webm"]);

export const voxUploadExtensionLower = (name: string): string => {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
};

export const isAcceptedVoxUploadMime = (mime: string): boolean =>
  VOX_UPLOAD_MIME.has(mime.toLowerCase());

export const isAcceptedVoxUploadFile = (file: File): boolean => {
  const mime = (file.type || "").trim().toLowerCase();
  const extOk = VOX_UPLOAD_EXT.has(voxUploadExtensionLower(file.name || ""));
  if (mime && isAcceptedVoxUploadMime(mime)) return true;
  if (!mime || mime === "application/octet-stream") return extOk;
  return false;
};

export const isLocalVoxUploadVideoFile = (f: File): boolean => {
  const m = (f.type || "").trim().toLowerCase();
  if (m.startsWith("video/")) return true;
  return ["mp4", "webm"].includes(voxUploadExtensionLower(f.name || ""));
};

type DataTransferFileItemLike = {
  readonly kind: string;
  readonly type: string;
  getAsFile: () => File | null;
};

export type DataTransferFileSource = {
  items?: ArrayLike<DataTransferFileItemLike> | null;
  files?: FileList | null;
};

export const findFirstFileInDataTransferSource = (
  source: DataTransferFileSource | null | undefined,
  acceptFile: (file: File) => boolean,
): File | null => {
  const items = source?.items;
  if (items && items.length) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind !== "file") continue;
      const file = item.getAsFile();
      if (file && acceptFile(file)) return file;
    }
  }
  const files = source?.files;
  if (files && files.length) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (acceptFile(file)) return file;
    }
  }
  return null;
};

export const findFirstVoxUploadFileInDataTransfer = (
  dt: Pick<DataTransfer, "items" | "files"> | null,
): File | null => findFirstFileInDataTransferSource(dt, isAcceptedVoxUploadFile);

export const dataTransferTypesIncludeFiles = (dt: DataTransfer | null): boolean =>
  Boolean(dt && Array.from(dt.types ?? []).includes("Files"));

export const getFirstClipboardVoxUploadFile = (event: ClipboardEvent): File | null =>
  findFirstVoxUploadFileInDataTransfer(event.clipboardData);
