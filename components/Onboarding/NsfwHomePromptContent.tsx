"use client";
import { Eye, EyeOff, ShieldAlert, type LucideIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCategoryFilterStore } from "@/features/vox/categoryFilterStore";
import { NSFW_CATEGORIES } from "@/lib/vox/sensitiveCategories";
import { cn } from "@/lib/utils";

const nsfwCategoryList = NSFW_CATEGORIES.join(" · ");

export const NsfwHomePromptContent = () => {
  const answerNsfwPrompt = useCategoryFilterStore((s) => s.answerNsfwPrompt);

  return (
    <Dialog open>
      <DialogContent
        showClose={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="gap-5 sm:max-w-md"
      >
        <DialogHeader>
          <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-caution-500/15 text-caution-300 sm:mx-0">
            <ShieldAlert className="size-6" aria-hidden />
          </span>
          <DialogTitle className="text-xl leading-snug">¿Querés ver contenido +18?</DialogTitle>
          <DialogDescription className="text-fg-secondary">
            Voxer tiene categorías para adultos y en el inicio van mezcladas con el resto. Elegí qué
            hacemos con <span className="font-medium text-fg">{nsfwCategoryList}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <PromptOption
            icon={EyeOff}
            label="No, ocultarlas"
            detail="El inicio no muestra ningún vox de esas categorías."
            emphasis
            onClick={() => answerNsfwPrompt(false)}
          />
          <PromptOption
            icon={Eye}
            label="Sí, mostrarlas"
            detail="Vas a ver porno y demás contenido +18 en el inicio."
            onClick={() => answerNsfwPrompt(true)}
          />
        </div>

        <p className="text-xs text-fg-muted">
          Podés cambiarlo cuando quieras desde el menú, en Categorías → NSFW.
        </p>
      </DialogContent>
    </Dialog>
  );
};

const PromptOption = ({
  icon: Icon,
  label,
  detail,
  emphasis = false,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  detail: string;
  emphasis?: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60",
      emphasis
        ? "border-brand-500/60 bg-brand-600 hover:bg-brand-500"
        : "border-fg/15 bg-surface-sunken/80 hover:bg-fg/10",
    )}
  >
    <Icon
      className={cn("size-5 shrink-0", emphasis ? "text-on-solid" : "text-fg-muted")}
      aria-hidden
    />
    <span className="min-w-0">
      <span
        className={cn("block text-sm font-semibold", emphasis ? "text-on-solid" : "text-fg-bright")}
      >
        {label}
      </span>
      <span className={cn("block text-xs", emphasis ? "text-on-solid" : "text-fg-muted")}>
        {detail}
      </span>
    </span>
  </button>
);
