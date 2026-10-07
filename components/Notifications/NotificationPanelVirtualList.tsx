"use client";

import Link from "next/link";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useState, type MouseEvent, type RefObject } from "react";
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
  /** For reports: the thumbnail may be the abuse itself, so staff reveals it on purpose. */
  blurThumbnails?: boolean;
};

const ThumbnailFallback = () => (
  <div className="flex h-full w-full items-center justify-center text-[10px] text-fg-subtle">
    Vox
  </div>
);

const BlurredThumbnail = ({ url }: { url: string }) => {
  const [revealed, setRevealed] = useState(false);
  return (
    <button
      type="button"
      className="relative h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded bg-surface-elevated"
      aria-label={revealed ? "Ocultar miniatura" : "Mostrar miniatura"}
      aria-pressed={revealed}
      onClick={() => setRevealed((r) => !r)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        className={`h-full w-full object-cover ${revealed ? "" : "scale-125 blur-lg"}`}
      />
      {revealed ? null : (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-fg">
          Ver
        </span>
      )}
    </button>
  );
};

type RowProps = Pick<Props, "onNotificationActivate" | "blurThumbnails"> & {
  row: NotificationPanelVirtualRow;
};

const PanelRowLink = ({ row, onNotificationActivate, blurThumbnails }: RowProps) => {
  const hasDetails = Boolean(row.reportDetails?.trim());
  // A button cannot live inside the link, so the blurred thumbnail sits next to it.
  const blurred = Boolean(blurThumbnails && row.thumbnailUrl);

  return (
    <div
      className={`flex items-center gap-2 rounded-md border p-2 transition-colors ${
        row.readAt == null
          ? "border-warning-900/30 bg-surface-elevated/55 hover:bg-surface-elevated/80"
          : "border-fg/10 bg-surface-sunken/80 hover:bg-surface-raised"
      }`}
    >
      {blurred && row.thumbnailUrl ? <BlurredThumbnail url={row.thumbnailUrl} /> : null}
      <Link
        href={buildVoxPanelDetailHref(row)}
        onClick={(e) => onNotificationActivate(row, e)}
        className="flex min-w-0 flex-1 items-start gap-3"
      >
        {blurred ? null : (
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-surface-elevated">
            {row.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={row.thumbnailUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <ThumbnailFallback />
            )}
          </div>
        )}
        <p className="min-w-0 flex-1 text-sm leading-snug text-fg-soft">{row.message}</p>
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
  blurThumbnails,
}: Pick<Props, "items" | "onNotificationActivate" | "blurThumbnails">) => (
  <ul className="space-y-2">
    {items.map((it) => (
      <li key={it.id}>
        <PanelRowLink
          row={it}
          onNotificationActivate={onNotificationActivate}
          blurThumbnails={blurThumbnails}
        />
      </li>
    ))}
  </ul>
);

const NotificationPanelVirtualizedBody = ({
  scrollParentRef,
  items,
  onNotificationActivate,
  blurThumbnails,
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
            <PanelRowLink
              row={it}
              onNotificationActivate={onNotificationActivate}
              blurThumbnails={blurThumbnails}
            />
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
        blurThumbnails={props.blurThumbnails}
      />
    );
  }
  return <NotificationPanelVirtualizedBody {...props} />;
};
