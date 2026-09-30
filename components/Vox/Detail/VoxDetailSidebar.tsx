"use client";
import type { RefObject } from "react";
import { CategoryLink } from "@/components/Vox/CategoryLink";
import { getCategoryDisplayName, getCategoryFromCode } from "@/lib/vox/categoryCodes";
import { TimestampWithTooltip } from "@/components/Time/TimestampWithTooltip";
import { VoxDetailMedia } from "./VoxDetailMedia";
import type { VoxDetail } from "@/lib/vox/types";
import type { UserRole } from "@prisma/client";
import { isAdminRole } from "@/lib/moderation/roles";
import { RichGreentextLinkBlock } from "@/components/Comments/Comment/RichGreentextLinkBlock";
import { VoxDetailStaffActionBar } from "./VoxDetailStaffActionBar";
import { compactBtn, VoxDetailUserActionBar } from "./VoxDetailUserActionBar";
import { VoxDetailShareButton } from "./VoxDetailShareButton";
import { VoxDetailPollSection } from "./VoxDetailPollSection";
import { VoxDetailPollSkeleton } from "./VoxDetailPollSkeleton";
import type { VoxPollPublic } from "@/lib/vox/types";

type AuthUser = {
  id: string;
  role: UserRole;
};

type Props = {
  vox: VoxDetail;
  authUser: AuthUser | null;
  staff: boolean;
  followBusy: boolean;
  hideBusy: boolean;
  favoriteBusy: boolean;
  onToggleFollow: () => void;
  onToggleHideFromFeed: () => void;
  onToggleFavorite: () => void;
  onReportVox: () => void;
  onOpenModerateVox: () => void;
  onOpenEditVox: () => void;
  onOpenRecategorize: () => void;
  onPollChange: (next: VoxPollPublic) => void;
  onPollVoted?: (choice: { optionId: string; label: string; badgeHue: number }) => void;
  /** At `lg` this column scrolls on its own; the view chains it with the comments. */
  scrollRef: RefObject<HTMLElement | null>;
};

export const VoxDetailSidebar = ({
  vox,
  authUser,
  staff,
  followBusy,
  hideBusy,
  favoriteBusy,
  onToggleFollow,
  onToggleHideFromFeed,
  onToggleFavorite,
  onReportVox,
  onOpenModerateVox,
  onOpenEditVox,
  onOpenRecategorize,
  onPollChange,
  onPollVoted,
  scrollRef,
}: Props) => {
  const categoryRaw = vox.category.trim();
  const categoryForLink = getCategoryFromCode(categoryRaw) ?? categoryRaw;

  return (
    <section
      ref={scrollRef}
      className="w-full shrink-0 space-y-4 p-4 lg:sticky lg:top-0 lg:max-h-[calc(100dvh-var(--app-header-offset))] lg:min-w-0 lg:w-1/2 lg:overflow-y-auto"
    >
      {authUser ? (
        <VoxDetailUserActionBar
          vox={vox}
          followBusy={followBusy}
          hideBusy={hideBusy}
          favoriteBusy={favoriteBusy}
          onToggleFollow={onToggleFollow}
          onToggleHideFromFeed={onToggleHideFromFeed}
          onToggleFavorite={onToggleFavorite}
          onReportVox={onReportVox}
        />
      ) : (
        // Sharing also works without a session: the link is usually sent to someone without an account.
        <div className="grid w-full grid-cols-5 gap-1 sm:flex sm:gap-2">
          <VoxDetailShareButton voxId={vox.id} voxTitle={vox.title} className={compactBtn} />
        </div>
      )}

      {staff ? (
        <VoxDetailStaffActionBar
          voxId={vox.id}
          canEditOwnVox={isAdminRole(authUser?.role) && vox.isOwner}
          onOpenModerateVox={onOpenModerateVox}
          onOpenEditVox={onOpenEditVox}
          onOpenRecategorize={onOpenRecategorize}
        />
      ) : null}

      {vox.hasPoll && !vox.poll ? <VoxDetailPollSkeleton /> : null}
      {vox.poll ? (
        <VoxDetailPollSection
          voxId={vox.id}
          poll={vox.poll}
          onPollChange={onPollChange}
          onVoted={onPollVoted}
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <CategoryLink
          category={categoryForLink}
          className="inline-flex max-w-full min-w-0 shrink cursor-pointer rounded-md bg-category-600 px-2 py-0.5 text-xs font-semibold leading-tight break-words text-on-solid hover:bg-category-500 hover:no-underline"
        >
          {getCategoryDisplayName(categoryRaw)}
        </CategoryLink>
        <TimestampWithTooltip
          iso={vox.createdAt}
          className="ml-auto tabular-nums text-xs text-fg-muted"
        />
      </div>

      <VoxDetailMedia
        mediaType={vox.mediaType}
        mediaUrl={vox.mediaUrl}
        thumbnailUrl={vox.thumbnailUrl}
        animatedImage={vox.animatedImage}
        youtubeVideoId={vox.youtubeVideoId}
        alt={vox.title}
      />

      <div className="space-y-2">
        <h1 className="text-2xl font-bold leading-tight">{vox.title}</h1>
        <RichGreentextLinkBlock
          text={vox.description}
          className="whitespace-pre-wrap break-words text-sm text-fg-secondary"
        />
      </div>
    </section>
  );
};
