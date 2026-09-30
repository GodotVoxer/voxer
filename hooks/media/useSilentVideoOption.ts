import { useCallback, useEffect, useState } from "react";
import { localVideoFileHasAudioTrack } from "@/features/media/videoAudioTrack";

export const useSilentVideoOption = (file: File | null) => {
  const [audioCheck, setAudioCheck] = useState<{ file: File; isSilent: boolean } | null>(null);
  const [gifChoice, setGifChoice] = useState<{ file: File; checked: boolean } | null>(null);

  useEffect(() => {
    let active = true;
    if (!file) return () => undefined;

    void localVideoFileHasAudioTrack(file)
      .then((hasAudio) => {
        if (active) setAudioCheck({ file, isSilent: hasAudio === false });
      })
      .catch(() => {
        if (active) setAudioCheck({ file, isSilent: false });
      });

    return () => {
      active = false;
    };
  }, [file]);

  const isSilentVideo = Boolean(file && audioCheck?.file === file && audioCheck.isSilent);
  const uploadAsGif = Boolean(file && gifChoice?.file === file && gifChoice.checked);
  const setUploadAsGif = useCallback(
    (checked: boolean) => {
      if (file) setGifChoice({ file, checked });
    },
    [file],
  );

  return { isSilentVideo, uploadAsGif, setUploadAsGif };
};
