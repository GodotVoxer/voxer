import type { ComponentProps } from "react";
import { ChevronDown, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";

export const CategoriesMenuButton = (props: ComponentProps<typeof Button>) => (
  <Button
    type="button"
    variant="ghost"
    size="sm"
    className="app-header-control hidden shrink-0 cursor-pointer gap-1.5 px-2.5 text-fg-secondary hover:bg-fg/10 hover:text-fg data-[state=open]:bg-fg/10 data-[state=open]:text-fg sm:inline-flex [&[data-state=open]_svg:last-child]:rotate-180"
    aria-label="Ir a una categoría"
    {...props}
  >
    <LayoutGrid className="size-4 shrink-0" strokeWidth={2} aria-hidden />
    Categorías
    <ChevronDown className="size-3.5 shrink-0 transition-transform duration-200" aria-hidden />
  </Button>
);
