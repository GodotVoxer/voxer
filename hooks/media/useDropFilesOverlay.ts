"use client";

import { useCallback, useState, type DragEventHandler } from "react";
import {
  dataTransferTypesIncludeFiles,
  findFirstVoxUploadFileInDataTransfer,
} from "@/features/media/uploadClientFiles";

type Args = {
  onDropFile: (file: File) => void;
  disabled?: boolean;
};

export const useDropFilesOverlay = ({ onDropFile, disabled = false }: Args) => {
  const [dragActive, setDragActive] = useState(false);
  const showDropOverlay = dragActive && !disabled;

  const onDragEnter = useCallback<DragEventHandler<HTMLElement>>(
    (e) => {
      if (disabled || !dataTransferTypesIncludeFiles(e.dataTransfer)) return;
      e.preventDefault();
      e.stopPropagation();
      setDragActive(true);
    },
    [disabled],
  );

  const onDragOver = useCallback<DragEventHandler<HTMLElement>>((e) => {
    if (!dataTransferTypesIncludeFiles(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onDragLeave = useCallback<DragEventHandler<HTMLElement>>((e) => {
    if (!dataTransferTypesIncludeFiles(e.dataTransfer)) return;
    const next = e.relatedTarget as Node | null;
    if (next && e.currentTarget.contains(next)) return;
    setDragActive(false);
  }, []);

  const onDrop = useCallback<DragEventHandler<HTMLElement>>(
    (e) => {
      if (!dataTransferTypesIncludeFiles(e.dataTransfer)) return;
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      const file = findFirstVoxUploadFileInDataTransfer(e.dataTransfer);
      if (file) onDropFile(file);
    },
    [onDropFile],
  );

  return {
    showDropOverlay,
    dropHandlers: { onDragEnter, onDragOver, onDragLeave, onDrop },
  };
};
