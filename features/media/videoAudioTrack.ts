import {
  isLocalVoxUploadVideoFile,
  voxUploadExtensionLower,
} from "@/features/media/uploadClientFiles";
import { readFileBytes } from "@/features/media/readFileBytes";
import { videoContainerOf, type VideoContainer } from "@/lib/media/videoFormat";

const asciiIncludes = (bytes: Uint8Array, needle: string): boolean => {
  const encoded = new TextEncoder().encode(needle);
  outer: for (let start = 0; start <= bytes.length - encoded.length; start += 1) {
    for (let offset = 0; offset < encoded.length; offset += 1) {
      if (bytes[start + offset] !== encoded[offset]) continue outer;
    }
    return true;
  }
  return false;
};

export const videoBytesHaveAudioTrack = (bytes: Uint8Array, container: VideoContainer): boolean => {
  if (container === "mp4") return asciiIncludes(bytes, "soun");

  if (
    asciiIncludes(bytes, "A_OPUS") ||
    asciiIncludes(bytes, "A_VORBIS") ||
    asciiIncludes(bytes, "A_AAC") ||
    asciiIncludes(bytes, "A_AC3") ||
    asciiIncludes(bytes, "A_EAC3") ||
    asciiIncludes(bytes, "A_FLAC") ||
    asciiIncludes(bytes, "A_MPEG") ||
    asciiIncludes(bytes, "A_PCM")
  ) {
    return true;
  }

  for (let index = 0; index <= bytes.length - 3; index += 1) {
    if (bytes[index] === 0x83 && bytes[index + 1] === 0x81 && bytes[index + 2] === 0x02) {
      return true;
    }
  }
  return false;
};

export const localVideoFileHasAudioTrack = async (file: File): Promise<boolean | null> => {
  if (!isLocalVoxUploadVideoFile(file)) return null;
  const extension = voxUploadExtensionLower(file.name);
  const container = videoContainerOf(file.type, extension);
  const buffer = await readFileBytes(file);
  return videoBytesHaveAudioTrack(new Uint8Array(buffer), container);
};
