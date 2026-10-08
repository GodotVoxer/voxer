"use client";
import { memo, useRef } from "react";
import type { VoxListItem, VoxListView } from "@/lib/vox/types";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useVoxCardGridInteractions } from "@/hooks/vox/useVoxCardGridInteractions";
import { useVoxStore } from "@/features/vox/store";
import {
  voxCardFrameRestClassName,
  voxCardInnerShellClassName,
} from "@/features/vox/grid/cardFrameLayout";
import { VOX_CARD_NAV_DATA_ATTR } from "@/features/vox/grid/cardTouchActions";
import { cn } from "@/lib/utils";
import { VoxCardBottomTitle } from "./VoxCardBottomTitle";
import { VoxCardTopOverlays } from "./VoxCardTopOverlays";
import { VoxCardUserRail } from "./VoxCardUserRail";
import { voxPath } from "@/lib/vox/paths";
import { useOpenedOnce } from "@/hooks/common/useOpenedOnce";

// Every card would otherwise hydrate these closed dialogs, and staff tools would ship to every visitor.
const ReportEntityDialog = dynamic(
  () =>
    import("@/components/Moderation/Dialogs/ReportEntityDialog").then((m) => m.ReportEntityDialog),
  { ssr: false },
);
const PublicationStaffModerationDialog = dynamic(
  () =>
    import("@/components/Moderation/Dialogs/PublicationStaffModerationDialog").then(
      (m) => m.PublicationStaffModerationDialog,
    ),
  { ssr: false },
);
const VoxCardRecategorizeDialog = dynamic(
  () => import("./VoxCardRecategorizeDialog").then((m) => m.VoxCardRecategorizeDialog),
  { ssr: false },
);
const VoxCardStaffRail = dynamic(
  () => import("./VoxCardStaffRail").then((m) => m.VoxCardStaffRail),
  {
    ssr: false,
  },
);

type Props = {
  vox: VoxListItem;
  listView?: VoxListView;
  disableLift?: boolean;
  /** First visible grid row: `priority` on the thumbnail improves LCP. */
  imagePriority?: boolean;
};

const VoxCardView = ({
  vox,
  listView = "default",
  disableLift = false,
  imagePriority = false,
}: Props) => {
  const thumb = vox.thumbnailUrl ?? "/video-thumb.svg";
  const remote = thumb.startsWith("http");
  const href = voxPath(vox.id);
  const cardRef = useRef<HTMLDivElement>(null);

  const isPinned = Boolean(vox.pinnedAt);
  const activityFlashUntil = useVoxStore((s) => s.activityFlashUntil[vox.id]);
  const showActivityGlowLayer = listView === "default" && activityFlashUntil != null;

  const {
    user,
    staff,
    admin,
    reportOpen,
    setReportOpen,
    staffPubModOpen,
    setStaffPubModOpen,
    recategorizeOpen,
    setRecategorizeOpen,
    actionsPinned,
    setActionsPinned,
    setCardHovered,
    playCoverGif,
    coverGifUrl,
    prefersHoverGlow,
    onCardPointerDown,
    onHideToggle,
    onStaffModerationClick,
    onRecategorizeClick,
    onAdminPinClick,
    onReportClick,
    onFavoriteToggle,
    onStaffModerationCompleted,
    onStaffModerationSuccess,
  } = useVoxCardGridInteractions({
    vox,
    listView,
    cardRef,
  });
  const reportOpened = useOpenedOnce(reportOpen);
  const staffPubModOpened = useOpenedOnce(staffPubModOpen);
  const recategorizeOpened = useOpenedOnce(recategorizeOpen);

  return (
    <>
      <div
        ref={cardRef}
        className={cn(
          "group relative block cursor-pointer",
          voxCardFrameRestClassName,
          "transition-transform duration-200 ease-out hover:z-[45] hover:shadow-[0_0_0_1px_var(--glow),0_0_20px_color-mix(in_srgb,var(--glow-deep)_26%,transparent),0_0_36px_color-mix(in_srgb,var(--glow)_11%,transparent)] hover:ring-brand-400/45 focus-within:z-[45] focus-within:outline-none focus-within:ring-2 focus-within:ring-brand-500 focus-within:ring-offset-2 focus-within:ring-offset-surface",
          prefersHoverGlow &&
            "active:z-[45] active:shadow-[0_0_0_2px_var(--glow),0_0_24px_color-mix(in_srgb,var(--glow-deep)_32%,transparent),0_0_40px_color-mix(in_srgb,var(--glow)_14%,transparent)] active:ring-brand-300/60",
          !disableLift && "hover:-translate-y-2",
          prefersHoverGlow && !disableLift && "active:-translate-y-1",
          actionsPinned &&
            cn(
              "z-[45] shadow-[0_0_0_1px_var(--glow),0_0_20px_color-mix(in_srgb,var(--glow-deep)_26%,transparent),0_0_36px_color-mix(in_srgb,var(--glow)_11%,transparent)] ring-brand-400/45",
              !disableLift && "-translate-y-2",
            ),
          isPinned &&
            "ring-2 ring-warning-400/70 shadow-[inset_0_0_0_2px_color-mix(in_srgb,var(--pinned-glow)_30%,transparent),0_0_12px_color-mix(in_srgb,var(--pinned-glow-soft)_7%,transparent)]",
        )}
        onMouseEnter={() => setCardHovered(true)}
        onMouseLeave={() => setCardHovered(false)}
        onPointerDown={onCardPointerDown}
        onKeyDown={(e) => {
          if (e.key === "Escape" && actionsPinned) {
            e.preventDefault();
            setActionsPinned(false);
          }
        }}
      >
        <Link
          href={href}
          {...{ [VOX_CARD_NAV_DATA_ATTR]: "" }}
          aria-label={`Vox: ${vox.title}`}
          className="absolute inset-0 z-[1] rounded-[inherit]"
        />
        <div className={cn(voxCardInnerShellClassName, "relative z-[2] pointer-events-none")}>
          <div className="absolute inset-0 bg-media-placeholder">
            <Image
              src={thumb}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 17vw"
              unoptimized={remote}
              priority={imagePriority}
            />
            {playCoverGif && coverGifUrl && vox.animatedImage ? (
              // GIF converted to MP4: `muted` is what enables the cover's autoplay.
              <video
                src={coverGifUrl}
                className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                aria-hidden
                autoPlay
                loop
                muted
                playsInline
                preload="none"
              />
            ) : null}
            {playCoverGif && coverGifUrl && !vox.animatedImage ? (
              // eslint-disable-next-line @next/next/no-img-element -- GIF animado; URLs remotas arbitrarias (Blob, etc.).
              <img
                src={coverGifUrl}
                alt=""
                className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                aria-hidden
                decoding="async"
              />
            ) : null}
            {showActivityGlowLayer ? (
              <div
                key={activityFlashUntil}
                className="vox-card-cover-activity-glow vox-card-cover-activity-glow--flash absolute inset-0 z-[1]"
                aria-hidden
              >
                <div className="vox-card-cover-activity-glow__pulse" />
              </div>
            ) : null}
          </div>

          <VoxCardTopOverlays vox={vox} />

          {staff ? (
            <VoxCardStaffRail
              voxId={vox.id}
              actionsPinned={actionsPinned}
              admin={admin}
              isPinned={isPinned}
              onAdminPinClick={onAdminPinClick}
              onStaffModerationClick={onStaffModerationClick}
              onRecategorizeClick={onRecategorizeClick}
              onMenuOpenChange={setActionsPinned}
            />
          ) : null}

          {user ? (
            <VoxCardUserRail
              listView={listView}
              favorited={vox.favorited}
              actionsPinned={actionsPinned}
              onHideToggle={onHideToggle}
              onFavoriteToggle={onFavoriteToggle}
              onReportClick={onReportClick}
            />
          ) : null}

          <VoxCardBottomTitle title={vox.title} />
        </div>
      </div>
      {reportOpened ? (
        <ReportEntityDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          voxId={vox.id}
          voxTitle={vox.title}
        />
      ) : null}
      {staff && staffPubModOpened ? (
        <PublicationStaffModerationDialog
          open={staffPubModOpen}
          onOpenChange={setStaffPubModOpen}
          target={staffPubModOpen ? { kind: "vox", voxId: vox.id } : null}
          onCompleted={onStaffModerationCompleted}
        />
      ) : null}
      {staff && recategorizeOpened ? (
        <VoxCardRecategorizeDialog
          open={recategorizeOpen}
          onOpenChange={setRecategorizeOpen}
          voxId={vox.id}
          category={vox.category}
          onSaved={onStaffModerationSuccess}
        />
      ) : null}
    </>
  );
};

export const VoxCard = memo(VoxCardView);
