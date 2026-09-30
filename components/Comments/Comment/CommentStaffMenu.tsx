"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { Eye, Hammer, Pencil, Shield, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  onDelete?: () => void;
  onPublicationMod?: () => void;
  authorHistoryHref?: string;
  onEditOwn?: () => void;
};

/** A comment's staff actions behind one control, so the row header fits on one line. */
export const CommentStaffMenu = ({
  onDelete,
  onPublicationMod,
  authorHistoryHref,
  onEditOwn,
}: Props) => {
  const [open, setOpen] = useState(false);
  const isTouchPointerRef = useRef(false);

  if (!onDelete && !onPublicationMod && !authorHistoryHref && !onEditOwn) return null;

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && isTouchPointerRef.current) {
      return;
    }
    setOpen(nextOpen);
  };

  return (
    // `modal={false}`: the menu closes in the same tick the moderation dialog opens, and a modal menu
    // would leave its `pointer-events: none` on `body` with nobody to remove it.
    <DropdownMenu modal={false} open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        className="cursor-pointer rounded p-0.5 text-danger-500 outline-none hover:text-danger-400 focus-visible:ring-2 focus-visible:ring-danger-500/60"
        aria-label="Acciones de staff"
        title="Acciones de staff"
        onPointerDown={(e) => {
          isTouchPointerRef.current = e.pointerType === "touch";
        }}
        onKeyDown={() => {
          isTouchPointerRef.current = false;
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (isTouchPointerRef.current) {
            setOpen((prev) => !prev);
          }
        }}
      >
        <Shield className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Staff</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {onEditOwn ? (
          <DropdownMenuItem
            onSelect={() => {
              onEditOwn();
            }}
          >
            <Pencil aria-hidden />
            Editar comentario
          </DropdownMenuItem>
        ) : null}
        {onDelete ? (
          <DropdownMenuItem
            variant="danger"
            onSelect={() => {
              onDelete();
            }}
          >
            <Trash2 aria-hidden />
            Eliminar comentario
          </DropdownMenuItem>
        ) : null}
        {onPublicationMod ? (
          <DropdownMenuItem
            onSelect={() => {
              onPublicationMod();
            }}
          >
            <Hammer aria-hidden />
            Moderar publicación
          </DropdownMenuItem>
        ) : null}
        {authorHistoryHref ? (
          <DropdownMenuItem asChild>
            <Link
              href={authorHistoryHref}
              onClick={(e) => e.stopPropagation()}
              className="text-caution-400 focus:text-caution-300"
            >
              <Eye aria-hidden />
              Historial del autor
            </Link>
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
