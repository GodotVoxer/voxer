import type { ComponentProps } from "react";
import { ChevronDown, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";

export const CategoriesMenuButton = (props: ComponentProps<typeof Button>) => (
  <Button
    type="button"
    variant="ghost"
    size="sm"
    className="app-header-control inline-flex size-9 shrink-0 cursor-pointer gap-1.5 has-[>svg]:px-0 text-fg-secondary hover:bg-fg/10 hover:text-fg data-[state=open]:bg-fg/10 data-[state=open]:text-fg md:h-8 md:w-auto md:has-[>svg]:px-2.5 [&[data-state=open]_svg:last-child]:rotate-180"
    aria-label="Categorías"
    {...props}
  >
    <LayoutGrid className="size-5 shrink-0 md:size-4" strokeWidth={2} aria-hidden />
    <span className="hidden md:inline">Categorías</span>
    <ChevronDown
      className="hidden size-3.5 shrink-0 transition-transform duration-200 md:block"
      aria-hidden
    />
  </Button>
);
