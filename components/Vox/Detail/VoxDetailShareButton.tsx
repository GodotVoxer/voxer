"use client";
import { Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useShareLink } from "@/hooks/common/useShareLink";
import { voxPath } from "@/lib/vox/paths";

type Props = {
  voxId: string;
  voxTitle: string;
  className?: string;
};

export const VoxDetailShareButton = ({ voxId, voxTitle, className }: Props) => {
  const { share, feedback } = useShareLink();
  const label =
    feedback === "copied"
      ? "Link copiado"
      : feedback === "failed"
        ? "No se pudo compartir"
        : "Compartir";

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      aria-label={label}
      title={label}
      className={`cursor-pointer border-fg/20 bg-surface-raised text-fg-soft hover:bg-surface-elevated ${className ?? ""}`}
      onClick={() => void share({ path: voxPath(voxId), title: voxTitle })}
    >
      {feedback === "copied" ? (
        <Check
          className="inline size-4 shrink-0 align-text-bottom text-success-300 sm:mr-1"
          aria-hidden
        />
      ) : (
        <Share2 className="inline size-4 shrink-0 align-text-bottom sm:mr-1" aria-hidden />
      )}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
};
