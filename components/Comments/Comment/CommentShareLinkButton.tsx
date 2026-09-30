"use client";
import { Check, Link2 } from "lucide-react";
import { useShareLink } from "@/hooks/common/useShareLink";
import { voxCommentPath } from "@/lib/vox/paths";

type Props = {
  voxId: string;
  publicTag: string;
};

export const CommentShareLinkButton = ({ voxId, publicTag }: Props) => {
  const { share, feedback } = useShareLink();
  const label =
    feedback === "copied"
      ? "Link copiado"
      : feedback === "failed"
        ? "No se pudo copiar el link"
        : "Copiar link al comentario";

  return (
    <button
      type="button"
      className="cursor-pointer p-0.5 text-fg-muted hover:text-fg-soft"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        void share({
          path: voxCommentPath(voxId, publicTag),
          title: `Comentario ${publicTag.toUpperCase()}`,
        });
      }}
    >
      {feedback === "copied" ? (
        <Check className="size-3.5 text-success-300" aria-hidden />
      ) : (
        <Link2 className="size-3.5" aria-hidden />
      )}
    </button>
  );
};
