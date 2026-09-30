"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent, PointerEvent as ReactPointerEvent, RefObject } from "react";
import type { VoxListItem, VoxListView } from "@/lib/vox/types";
import { useAuthStore } from "@/features/auth/store";
import { useVoxStore } from "@/features/vox/store";
import {
  favoriteVox,
  hideVox,
  toggleModerationVoxPin,
  unfavoriteVox,
  unhideVox,
} from "@/features/vox/api";
import { isAdminRole, isStaffRole } from "@/lib/moderation/roles";
import {
  isVoxCardActionPinTarget,
  shouldPinVoxCardActions,
} from "@/features/vox/grid/cardTouchActions";
import { runOptimisticToggle } from "@/features/vox/grid/cardOptimistic";
import { useCanHover } from "@/hooks/device/useCanHover";
import type { PublicationModerationResult } from "@/hooks/moderation/usePublicationModeration";

type Args = {
  vox: VoxListItem;
  listView: VoxListView;
  cardRef: RefObject<HTMLElement | null>;
};

export const useVoxCardGridInteractions = ({ vox, listView, cardRef }: Args) => {
  const user = useAuthStore((s) => s.user);
  const removeVoxFromFeeds = useVoxStore((s) => s.removeVoxFromFeeds);
  const refreshCurrentView = useVoxStore((s) => s.refreshCurrentView);
  const setVoxFavoritedInFeeds = useVoxStore((s) => s.setVoxFavoritedInFeeds);

  const [reportOpen, setReportOpen] = useState(false);
  const [staffPubModOpen, setStaffPubModOpen] = useState(false);
  const [recategorizeOpen, setRecategorizeOpen] = useState(false);
  const [actionsPinnedRaw, setActionsPinned] = useState(false);
  const actionsPinned = user ? actionsPinnedRaw : false;
  const [cardHovered, setCardHovered] = useState(false);
  const hideInFlightRef = useRef(false);
  const favoriteInFlightRef = useRef(false);
  const pinInFlightRef = useRef(false);

  const prefersHoverGlow = useCanHover();
  const coverGifUrl = vox.coverGifUrl;
  const playCoverGif = Boolean(
    coverGifUrl && (prefersHoverGlow ? cardHovered || actionsPinned : actionsPinned),
  );

  const staff = Boolean(user && isStaffRole(user.role));
  const admin = Boolean(user && isAdminRole(user.role));

  const staffPubModOpenEffective = user ? staffPubModOpen : false;

  useEffect(() => {
    if (!actionsPinned) return;
    const onDocPointerDown = (e: PointerEvent) => {
      const el = cardRef.current;
      const node = e.target as Node | null;
      if (node && el?.contains(node)) return;
      // The staff menu lives in a portal outside the card: tapping one of its items is not an outside tap.
      if (node instanceof Element && node.closest('[data-slot="dropdown-menu-content"]')) return;
      setActionsPinned(false);
    };
    document.addEventListener("pointerdown", onDocPointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", onDocPointerDown, true);
    };
  }, [actionsPinned, cardRef]);

  const onCardPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (!shouldPinVoxCardActions(e.pointerType)) return;
      const target = e.target as Element | null;
      if (!isVoxCardActionPinTarget(target, cardRef.current)) return;
      setActionsPinned(true);
    },
    [cardRef],
  );

  const onHideToggle = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (!user) return;
      if (hideInFlightRef.current) return;
      hideInFlightRef.current = true;
      setActionsPinned(false);
      const feedsBefore = useVoxStore.getState().feeds;
      const wasHidden = listView === "hidden";
      void (async () => {
        try {
          await runOptimisticToggle({
            apply: () => removeVoxFromFeeds(vox.id),
            revert: () => useVoxStore.setState({ feeds: feedsBefore }),
            call: () => (wasHidden ? unhideVox(vox.id) : hideVox(vox.id)),
          });
        } finally {
          hideInFlightRef.current = false;
        }
      })();
    },
    [user, listView, vox.id, removeVoxFromFeeds],
  );

  // Staff actions come from a portal menu: there is no DOM event to stop against the card link.
  const onStaffModerationClick = useCallback(() => {
    setActionsPinned(false);
    setStaffPubModOpen(true);
  }, []);

  const onRecategorizeClick = useCallback(() => {
    setActionsPinned(false);
    setRecategorizeOpen(true);
  }, []);

  const onAdminPinClick = useCallback(() => {
    if (!admin) return;
    if (pinInFlightRef.current) return;
    pinInFlightRef.current = true;
    setActionsPinned(false);
    void (async () => {
      try {
        await toggleModerationVoxPin(vox.id);
        await refreshCurrentView();
      } finally {
        pinInFlightRef.current = false;
      }
    })();
  }, [admin, vox.id, refreshCurrentView]);

  const onStaffModerationCompleted = useCallback(
    async ({ target, deletedPublication, bannedAuthor }: PublicationModerationResult) => {
      if (deletedPublication && target.kind === "vox") {
        removeVoxFromFeeds(target.voxId);
      }
      // The ban may have deleted other vox of the same author.
      if (bannedAuthor) await refreshCurrentView();
    },
    [removeVoxFromFeeds, refreshCurrentView],
  );

  const onStaffModerationSuccess = useCallback(async () => {
    await refreshCurrentView();
  }, [refreshCurrentView]);

  const onReportClick = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setActionsPinned(false);
    setReportOpen(true);
  }, []);

  const onFavoriteToggle = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (!user) return;
      if (favoriteInFlightRef.current) return;
      favoriteInFlightRef.current = true;
      setActionsPinned(false);
      const feedsBefore = useVoxStore.getState().feeds;
      const wasFavorited = vox.favorited;
      const nextFavorited = !wasFavorited;
      void (async () => {
        try {
          await runOptimisticToggle({
            apply: () => {
              if (wasFavorited && listView === "favorites") {
                removeVoxFromFeeds(vox.id);
              } else {
                setVoxFavoritedInFeeds(vox.id, nextFavorited);
              }
            },
            revert: () => useVoxStore.setState({ feeds: feedsBefore }),
            call: () => (wasFavorited ? unfavoriteVox(vox.id) : favoriteVox(vox.id)),
          });
        } finally {
          favoriteInFlightRef.current = false;
        }
      })();
    },
    [user, vox.favorited, vox.id, listView, removeVoxFromFeeds, setVoxFavoritedInFeeds],
  );

  return {
    user,
    staff,
    admin,
    reportOpen,
    setReportOpen,
    staffPubModOpen: staffPubModOpenEffective,
    setStaffPubModOpen,
    recategorizeOpen: user ? recategorizeOpen : false,
    setRecategorizeOpen,
    actionsPinned,
    setActionsPinned,
    cardHovered,
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
  };
};
