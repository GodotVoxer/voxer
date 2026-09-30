import { useCallback, useState } from "react";
import {
  favoriteVox,
  followVox,
  hideVox,
  unfavoriteVox,
  unfollowVox,
  unhideVox,
} from "@/features/vox/api";
import type { Dispatch, SetStateAction } from "react";
import type { VoxDetail } from "@/lib/vox/types";

type Args = {
  voxId: string;
  vox: VoxDetail | null;
  authUser: { id: string } | null;
  setVox: Dispatch<SetStateAction<VoxDetail | null>>;
};

export const useVoxFollowHide = ({ voxId, vox, authUser, setVox }: Args) => {
  const [followBusy, setFollowBusy] = useState(false);
  const [hideBusy, setHideBusy] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);

  const toggleFollow = useCallback(() => {
    if (!vox || !authUser) return;
    void (async () => {
      setFollowBusy(true);
      try {
        if (vox.following) {
          await unfollowVox(voxId);
          setVox((prev) => (prev ? { ...prev, following: false } : prev));
        } else {
          await followVox(voxId);
          setVox((prev) => (prev ? { ...prev, following: true } : prev));
        }
      } catch {
        /* ignore */
      } finally {
        setFollowBusy(false);
      }
    })();
  }, [vox, authUser, voxId, setVox]);

  const toggleHideFromFeed = useCallback(() => {
    if (!vox || !authUser) return;
    void (async () => {
      setHideBusy(true);
      try {
        if (vox.hidden) {
          await unhideVox(voxId);
          setVox((prev) => (prev ? { ...prev, hidden: false } : prev));
        } else {
          await hideVox(voxId);
          setVox((prev) => (prev ? { ...prev, hidden: true } : prev));
        }
      } catch {
        /* ignore */
      } finally {
        setHideBusy(false);
      }
    })();
  }, [vox, authUser, voxId, setVox]);

  const toggleFavorite = useCallback(() => {
    if (!vox || !authUser) return;
    void (async () => {
      setFavoriteBusy(true);
      try {
        if (vox.favorited) {
          await unfavoriteVox(voxId);
          setVox((prev) => (prev ? { ...prev, favorited: false } : prev));
        } else {
          await favoriteVox(voxId);
          setVox((prev) => (prev ? { ...prev, favorited: true } : prev));
        }
      } catch {
        /* ignore */
      } finally {
        setFavoriteBusy(false);
      }
    })();
  }, [vox, authUser, voxId, setVox]);

  return { followBusy, hideBusy, favoriteBusy, toggleFollow, toggleHideFromFeed, toggleFavorite };
};
