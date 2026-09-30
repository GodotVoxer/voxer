"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import { ChevronRight, LayoutGrid } from "lucide-react";
import { CATEGORY_GROUPS } from "@/lib/vox/categoryCodes";
import type { VoxCategory } from "@/lib/vox/categories";
import { CategoryLink } from "@/components/Vox/CategoryLink";
import { DrawerClose } from "@/components/ui/drawer";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useCategoryFilterStore } from "@/features/vox/categoryFilterStore";
import { cn } from "@/lib/utils";
type CategoryPanelProps = {
  scrollContainerRef: RefObject<HTMLDivElement | null>;
};

const scrollCategoriesTriggerIntoView = (container: HTMLDivElement, trigger: HTMLElement) => {
  const containerRect = container.getBoundingClientRect();
  const triggerRect = trigger.getBoundingClientRect();
  const triggerTop = triggerRect.top - containerRect.top + container.scrollTop;
  const targetTop = triggerTop - container.clientHeight / 2 + triggerRect.height / 2;
  container.scrollTo({
    top: Math.max(0, targetTop),
    behavior: "smooth",
  });
};

export const CategoryPanel = ({ scrollContainerRef }: CategoryPanelProps) => {
  const categoriesTriggerRef = useRef<HTMLButtonElement>(null);
  const [openPanel, setOpenPanel] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(CATEGORY_GROUPS.map((g) => [g.id, false])),
  );
  const enabledByCategory = useCategoryFilterStore((s) => s.enabledByCategory);
  const setCategoryEnabled = useCategoryFilterStore((s) => s.setCategoryEnabled);
  const setGroupEnabled = useCategoryFilterStore((s) => s.setGroupEnabled);

  useEffect(() => {
    if (!openPanel) return;
    const container = scrollContainerRef.current;
    const trigger = categoriesTriggerRef.current;
    if (!container || !trigger) return;

    const run = () => scrollCategoriesTriggerIntoView(container, trigger);
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(run);
    });
    const afterExpand = window.setTimeout(run, 220);

    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      window.clearTimeout(afterExpand);
    };
  }, [openPanel, scrollContainerRef]);

  return (
    <div className="mt-4 border-t border-fg/25 pt-4">
      <Collapsible open={openPanel} onOpenChange={setOpenPanel}>
        <CollapsibleTrigger
          ref={categoriesTriggerRef}
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded-md px-1 py-2 text-left text-base font-semibold text-fg hover:bg-fg/10 data-[state=open]:[&>span>svg]:rotate-90"
        >
          <span className="flex items-center gap-2.5">
            <ChevronRight className="size-5 shrink-0 text-fg transition-transform duration-200" />
            <LayoutGrid className="size-5 shrink-0 text-fg" strokeWidth={2} aria-hidden />
            Categorías
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 space-y-1.5 pr-0.5">
            {CATEGORY_GROUPS.map((group) => {
              const groupAllOn = group.categories.every((c) => enabledByCategory[c] !== false);
              return (
                <GroupBlock
                  key={group.id}
                  group={group}
                  expanded={expanded[group.id] ?? false}
                  onExpandedChange={(open) => setExpanded((e) => ({ ...e, [group.id]: open }))}
                  enabledByCategory={enabledByCategory}
                  setCategoryEnabled={setCategoryEnabled}
                  setGroupEnabled={setGroupEnabled}
                  groupAllEnabled={groupAllOn}
                />
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
const GroupBlock = ({
  group,
  expanded,
  onExpandedChange,
  enabledByCategory,
  setCategoryEnabled,
  setGroupEnabled,
  groupAllEnabled,
}: {
  group: (typeof CATEGORY_GROUPS)[number];
  expanded: boolean;
  onExpandedChange: (open: boolean) => void;
  enabledByCategory: Record<VoxCategory, boolean>;
  setCategoryEnabled: (c: VoxCategory, v: boolean) => void;
  setGroupEnabled: (g: (typeof CATEGORY_GROUPS)[number], v: boolean) => void;
  groupAllEnabled: boolean;
}) => {
  const groupCbRef = useRef<HTMLInputElement>(null);
  const someOn = group.categories.some((c) => enabledByCategory[c] !== false);
  useEffect(() => {
    const el = groupCbRef.current;
    if (!el) return;
    el.indeterminate = !groupAllEnabled && someOn;
  }, [groupAllEnabled, someOn]);
  return (
    <Collapsible
      open={expanded}
      onOpenChange={onExpandedChange}
      className="overflow-hidden rounded-lg border border-fg/15 bg-surface-sunken/80"
    >
      <div className="flex items-center gap-2.5 bg-surface-elevated/60 px-3 py-1.5">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex min-h-9 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded py-0.5 text-left text-fg-bright hover:bg-fg/5 data-[state=open]:[&>svg]:rotate-90"
            aria-expanded={expanded}
            aria-label={expanded ? "Contraer grupo" : "Expandir grupo"}
          >
            <ChevronRight className="size-5 shrink-0 text-fg transition-transform duration-200" />
            <span className="text-sm font-semibold leading-snug">{group.label}</span>
          </button>
        </CollapsibleTrigger>
        <input
          ref={groupCbRef}
          type="checkbox"
          className="size-5 shrink-0 cursor-pointer accent-brand-600"
          checked={groupAllEnabled}
          onChange={() => setGroupEnabled(group, !groupAllEnabled)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Mostrar u ocultar todas las categorías de ${group.label} en el inicio`}
        />
      </div>
      <CollapsibleContent>
        <ul className="divide-y divide-fg/10">
          {group.categories.map((cat) => (
            <SidebarCategoryRow
              key={cat}
              category={cat}
              enabled={enabledByCategory[cat] !== false}
              onToggle={() => setCategoryEnabled(cat, !(enabledByCategory[cat] !== false))}
            />
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
};

const sidebarCategoryRowLinkClass = cn(
  "absolute inset-0 z-0 flex items-center pl-11 pr-3",
  "text-sm font-medium leading-snug text-fg no-underline",
  "transition-colors duration-150",
  "hover:bg-fg/10 hover:no-underline",
  "active:bg-fg/15",
  "group-hover:bg-fg/10",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/50",
);

const SidebarCategoryRow = ({
  category,
  enabled,
  onToggle,
}: {
  category: VoxCategory;
  enabled: boolean;
  onToggle: () => void;
}) => (
  <li className="group relative flex min-h-9 items-center">
    <input
      type="checkbox"
      className="relative z-10 ml-3 size-5 shrink-0 cursor-pointer accent-brand-600"
      checked={enabled}
      onChange={onToggle}
      onClick={(e) => e.stopPropagation()}
      aria-label={`Ver vox de ${category} en el inicio`}
    />
    <DrawerClose asChild>
      <CategoryLink category={category} className={sidebarCategoryRowLinkClass}>
        {category}
      </CategoryLink>
    </DrawerClose>
  </li>
);
