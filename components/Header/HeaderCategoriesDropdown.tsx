"use client";

import { Check, Minus } from "lucide-react";
import { CategoryLink } from "@/components/Vox/CategoryLink";
import { CategoriesMenuButton } from "@/components/Header/CategoriesMenuButton";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  categoryGroupVisibility,
  useCategoryFilterStore,
  type CategoryGroupVisibility,
} from "@/features/vox/categoryFilterStore";
import { CATEGORY_GROUPS, getCategoryCode } from "@/lib/vox/categoryCodes";
import { cn } from "@/lib/utils";

const CheckMark = ({ visibility }: { visibility: CategoryGroupVisibility }) => (
  <span
    className={cn(
      "grid size-4 shrink-0 place-items-center rounded-[0.25rem] border transition-colors",
      visibility === "none"
        ? "border-fg/35 bg-surface-sunken"
        : "border-brand-600 bg-brand-600 text-on-solid",
    )}
    aria-hidden
  >
    {visibility === "all" ? <Check className="size-3" strokeWidth={3} /> : null}
    {visibility === "some" ? <Minus className="size-3" strokeWidth={3} /> : null}
  </span>
);

/** Toggling a checkbox must not close the menu, unlike following a link. */
const keepMenuOpen = (e: Event) => e.preventDefault();

/**
 * Desktop category panel: the name navigates and the checkbox picks what the home shows. The panel
 * uses CSS `columns` rather than a grid because groups hold 2 to 10 categories; `break-inside-avoid`
 * keeps a group from splitting across columns.
 */
export const HeaderCategoriesDropdown = ({ defaultOpen }: { defaultOpen: boolean }) => {
  const enabledByCategory = useCategoryFilterStore((s) => s.enabledByCategory);
  const setCategoryEnabled = useCategoryFilterStore((s) => s.setCategoryEnabled);
  const setGroupEnabled = useCategoryFilterStore((s) => s.setGroupEnabled);

  return (
    <DropdownMenu defaultOpen={defaultOpen}>
      <DropdownMenuTrigger asChild>
        <CategoriesMenuButton />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="flex w-[min(46rem,calc(100vw-2rem))] flex-col overflow-hidden p-0"
      >
        <div className="max-h-[min(74vh,38rem)] overflow-y-auto overscroll-contain p-3">
          <div className="columns-2 gap-x-4 lg:columns-3">
            {CATEGORY_GROUPS.map((group) => {
              const visibility = categoryGroupVisibility(enabledByCategory, group);
              return (
                <section key={group.id} className="mb-2.5 break-inside-avoid last:mb-0">
                  <DropdownMenuCheckboxItem
                    checked={visibility === "some" ? "indeterminate" : visibility === "all"}
                    onCheckedChange={() => setGroupEnabled(group, visibility !== "all")}
                    onSelect={keepMenuOpen}
                    className="mb-0.5 px-2 py-1 focus:bg-category-950/45"
                    aria-label={`Mostrar u ocultar todas las categorías de ${group.label} en el inicio`}
                  >
                    <CheckMark visibility={visibility} />
                    <span className="min-w-0 text-[0.68rem] leading-tight font-semibold uppercase tracking-[0.08em] text-category-300">
                      {group.label}
                    </span>
                    <span className="h-px flex-1 bg-category-800/50" aria-hidden />
                  </DropdownMenuCheckboxItem>
                  {group.categories.map((category) => {
                    const enabled = enabledByCategory[category] !== false;
                    return (
                      <div key={category} className="flex items-center">
                        <DropdownMenuCheckboxItem
                          checked={enabled}
                          onCheckedChange={(checked) =>
                            setCategoryEnabled(category, checked === true)
                          }
                          onSelect={keepMenuOpen}
                          textValue={category}
                          className="shrink-0 py-1 pr-1 pl-2 focus:bg-category-950/45"
                          aria-label={`Ver vox de ${category} en el inicio`}
                        >
                          <CheckMark visibility={enabled ? "all" : "none"} />
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuItem asChild>
                          <CategoryLink
                            category={category}
                            className={cn(
                              "flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md px-1.5 py-1 text-sm no-underline hover:no-underline focus:bg-category-950/45 focus:text-category-100",
                              enabled ? "text-fg-soft" : "text-fg-subtle",
                            )}
                          >
                            <span className="truncate">{category}</span>
                            <span className="shrink-0 rounded bg-fg/10 px-1.5 py-0.5 font-mono text-[0.625rem] leading-none tracking-wide text-fg-subtle">
                              {getCategoryCode(category)}
                            </span>
                          </CategoryLink>
                        </DropdownMenuItem>
                      </div>
                    );
                  })}
                </section>
              );
            })}
          </div>
        </div>
        <p className="border-t border-fg/10 px-4 py-2 text-xs text-fg-subtle">
          Hacé clic en una para entrar. Las casillas eligen qué se ve en el inicio.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
