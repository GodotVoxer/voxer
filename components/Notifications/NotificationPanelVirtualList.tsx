"use client";

import Link from "next/link";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { MouseEvent, RefObject } from "react";
import type { NotificationPanelVirtualRow } from "@/features/notifications/panelVirtualListRow";
import { buildVoxPanelDetailHref } from "@/lib/notifications/links";
import { ReportDetailInfoPopover } from "@/components/Moderation/Reports/ReportDetailInfoPopover";

/** Below this a plain map avoids ResizeObserver and measuring (the list appears instantly). */
const NOTIFICATION_PANEL_VIRTUALIZE_MIN = 50;

type Props = {
  scrollParentRef: RefObject<HTMLDivElement | null>;
  items: NotificationPanelVirtualRow[];
  onNotificationActivate: (
    row: NotificationPanelVirtualRow,
    e: MouseEvent<HTMLAnchorElement>,
  ) => void;
};

const PanelRowLink = ({
  row,
  onNotificationActivate,
}: {
  row: NotificationPanelVirtualRow;
  onNotificationActivate: Props["onNotificationActivate"];
}) => {
  const hasDetails = Boolean(row.reportDetails?.trim());

  return (
    <div
      className={`relative flex items-center gap-2 overflow-hidden rounded-md border p-2 transition-colors ${
        row.readAt == null
          ? "border-brand-500/30 bg-brand-500/[0.08] before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-brand-500/70 hover:bg-brand-500/[0.12]"
          : "border-fg/10 bg-surface-sunken/80 hover:bg-surface-raised"
      }`}
    >
      <Link
        href={buildVoxPanelDetailHref(row)}
        onClick={(e) => onNotificationActivate(row, e)}
        className="flex min-w-0 flex-1 items-start gap-3"
      >
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-surface-elevated">
          {row.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={row.thumbnailUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-fg-subtle">
              Vox
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 text-sm leading-snug">
          <p className="text-fg-soft">{row.message}</p>
          {row.commentPreview && (
            <p className="mt-1 line-clamp-2 border-l-2 border-fg/20 pl-2 break-words text-fg-muted">
              {row.commentPreview}
            </p>
          )}
        </div>
      </Link>
      {hasDetails && row.reportDetails && (
        <ReportDetailInfoPopover details={row.reportDetails.trim()} />
      )}
    </div>
  );
};

const NotificationPanelStaticList = ({
  items,
  onNotificationActivate,
}: Pick<Props, "items" | "onNotificationActivate">) => (
  <ul className="space-y-2">
    {items.map((it) => (
      <li key={it.id}>
        <PanelRowLink row={it} onNotificationActivate={onNotificationActivate} />
      </li>
    ))}
  </ul>
);

const NotificationPanelVirtualizedBody = ({
  scrollParentRef,
  items,
  onNotificationActivate,
}: Props) => {
  // TanStack Virtual returns non-memoizable functions, which the React Compiler rules flag.
  // eslint-disable-next-line react-hooks/incompatible-library -- useVirtualizer is the official API
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => 88,
    overscan: 8,
    getItemKey: (index) => items[index]?.id ?? String(index),
  });

  return (
    <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
      {virtualizer.getVirtualItems().map((v) => {
        const it = items[v.index];
        if (!it) return null;
        return (
          <div
            key={v.key}
            data-index={v.index}
            ref={virtualizer.measureElement}
            className="absolute top-0 left-0 w-full pb-2"
            style={{ transform: `translateY(${v.start}px)` }}
          >
            <PanelRowLink row={it} onNotificationActivate={onNotificationActivate} />
          </div>
        );
      })}
    </div>
  );
};

export const NotificationPanelVirtualList = (props: Props) => {
  if (props.items.length < NOTIFICATION_PANEL_VIRTUALIZE_MIN) {
    return (
      <NotificationPanelStaticList
        items={props.items}
        onNotificationActivate={props.onNotificationActivate}
      />
    );
  }
  return <NotificationPanelVirtualizedBody {...props} />;
};
