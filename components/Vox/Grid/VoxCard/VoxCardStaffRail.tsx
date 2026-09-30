"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { Eye, Hammer, Pin, PinOff, Shield, Tags } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Props = {
  voxId: string;
  actionsPinned: boolean;
  admin: boolean;
  isPinned: boolean;
  onAdminPinClick: () => void;
  onStaffModerationClick: () => void;
  onRecategorizeClick: () => void;
  onMenuOpenChange: (open: boolean) => void;
};

/** One staff control over the cover. The menu opens in a portal, so the card's actions stay pinned while it is open and the trigger does not vanish under the pointer. */
export const VoxCardStaffRail = ({
  voxId,
  actionsPinned,
  admin,
  isPinned,
  onAdminPinClick,
  onStaffModerationClick,
  onRecategorizeClick,
  onMenuOpenChange,
}: Props) => {
  const [open, setOpen] = useState(false);
  const isTouchPointerRef = useRef(false);

  const handleOpenChange = (nextOpen: boolean) => {
    // Radix may try to open on pointerdown during a touch (e.g. while scrolling): only a real click opens it.
    if (nextOpen && isTouchPointerRef.current) {
      return;
    }
    setOpen(nextOpen);
    onMenuOpenChange(nextOpen);
  };

  return (
    <div
      className={cn(
        // Centered against the user rail, which starts at the same height but has three buttons: its half
        // (2.5rem / 2.875rem) minus this single-button rail's.
        "absolute left-0 z-[2] flex flex-col gap-0.5 rounded-r-lg rounded-l-none border-y border-r border-l-0 border-on-media/12 bg-media-scrim/38 py-0.5 pr-0.5 pl-0 shadow-md backdrop-blur-md",
        "top-[calc(2.75rem+1.625rem)] sm:top-[calc(3rem+1.875rem)]",
        "pointer-events-none opacity-0 transition-opacity duration-150",
        "[@media(hover:hover)]:group-active:pointer-events-auto [@media(hover:hover)]:group-active:opacity-100",
        "max-md:group-hover:pointer-events-auto max-md:group-hover:opacity-100",
        "md:group-hover:pointer-events-auto md:group-hover:opacity-100",
        actionsPinned && "pointer-events-auto opacity-100",
      )}
    >
      <DropdownMenu modal={false} open={open} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger
          title="Acciones de staff"
          aria-label="Acciones de staff"
          className="flex size-6 cursor-pointer items-center justify-center rounded text-media-danger outline-none hover:bg-media-danger/10 focus-visible:ring-2 focus-visible:ring-media-danger/60 sm:size-7"
          onPointerDown={(e) => {
            isTouchPointerRef.current = e.pointerType === "touch";
          }}
          onKeyDown={() => {
            isTouchPointerRef.current = false;
          }}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (isTouchPointerRef.current) {
              setOpen((prev) => {
                const next = !prev;
                onMenuOpenChange(next);
                return next;
              });
            }
          }}
        >
          <Shield
            className="size-3.5 shrink-0 fill-none text-media-danger sm:size-4"
            strokeWidth={2}
            aria-hidden
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="right">
          <DropdownMenuLabel>Staff</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {admin ? (
            <DropdownMenuItem
              className="text-media-pin focus:text-media-pin"
              onSelect={() => onAdminPinClick()}
            >
              {isPinned ? <PinOff aria-hidden /> : <Pin aria-hidden />}
              {isPinned ? "Despinear del inicio" : "Pinear al inicio"}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onSelect={() => onRecategorizeClick()}>
            <Tags aria-hidden />
            Recategorizar
          </DropdownMenuItem>
          <DropdownMenuItem variant="danger" onSelect={() => onStaffModerationClick()}>
            <Hammer aria-hidden />
            Moderar publicación
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              href={`/moderacion/historial-publicaciones?voxId=${encodeURIComponent(voxId)}`}
              onClick={(e) => e.stopPropagation()}
              className="text-caution-400 focus:text-caution-300"
            >
              <Eye aria-hidden />
              Historial del autor
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
