"use client";

import { ChevronDown, LayoutGrid } from "lucide-react";
import { CategoryLink } from "@/components/Vox/CategoryLink";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CATEGORY_GROUPS, getCategoryCode } from "@/lib/vox/categoryCodes";

/**
 * Category shortcut in the header, desktop only (on mobile the sidebar already lists them). The panel
 * uses CSS `columns` rather than a grid because groups hold 2 to 8 categories; `break-inside-avoid`
 * keeps a group from splitting across columns.
 */
export const HeaderCategoriesMenu = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="app-header-control hidden shrink-0 cursor-pointer gap-1.5 px-2.5 text-fg-secondary hover:bg-fg/10 hover:text-fg data-[state=open]:bg-fg/10 data-[state=open]:text-fg sm:inline-flex [&[data-state=open]_svg:last-child]:rotate-180"
          aria-label="Ir a una categoría"
        >
          <LayoutGrid className="size-4 shrink-0" strokeWidth={2} aria-hidden />
          Categorías
          <ChevronDown
            className="size-3.5 shrink-0 transition-transform duration-200"
            aria-hidden
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[min(44rem,calc(100vw-2rem))] overflow-hidden p-0"
      >
        <div className="max-h-[min(78vh,40rem)] overflow-y-auto overscroll-contain p-3">
          <div className="columns-2 gap-x-4 lg:columns-3">
            {CATEGORY_GROUPS.map((group) => (
              <section key={group.id} className="mb-2.5 break-inside-avoid last:mb-0">
                <h3 className="mb-1 flex items-center gap-2 px-2 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-category-300">
                  <span className="truncate">{group.label}</span>
                  <span className="h-px flex-1 bg-category-800/50" aria-hidden />
                </h3>
                {group.categories.map((category) => (
                  <DropdownMenuItem key={category} asChild>
                    <CategoryLink
                      category={category}
                      className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-sm text-fg-soft no-underline hover:no-underline focus:bg-category-950/45 focus:text-category-100"
                    >
                      <span className="truncate">{category}</span>
                      <span className="shrink-0 rounded bg-fg/10 px-1.5 py-0.5 font-mono text-[0.625rem] leading-none tracking-wide text-fg-subtle">
                        {getCategoryCode(category)}
                      </span>
                    </CategoryLink>
                  </DropdownMenuItem>
                ))}
              </section>
            ))}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
