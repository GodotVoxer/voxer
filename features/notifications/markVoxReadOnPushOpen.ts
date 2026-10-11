import { useAuthStore } from "@/features/auth/store";
import { postMarkStaffNotificationsReadForVox } from "@/features/moderation/api";
import { postMarkNotificationsReadForVox } from "@/features/notifications/api";
import { isStaffRole } from "@/lib/moderation/roles";
import { voxIdFromDetailPathname } from "@/lib/vox/detailPathname";

/**
 * A tapped system notification reads the vox's notifications at once, like a bell row. The open vox
 * cannot be relied on for it: in the Android app the push arrived with the sockets suspended, so the
 * unread counters that vox waits for stay stale until the user room reconnects.
 */
export const markVoxReadOnPushOpen = async (path: string): Promise<void> => {
  const { pathname, searchParams } = new URL(path, "https://site.invalid");
  const voxId = voxIdFromDetailPathname(pathname);
  const { user, refresh } = useAuthStore.getState();
  if (!voxId || !user) return;
  const requests = [postMarkNotificationsReadForVox(voxId)];
  if (searchParams.get("denuncia") === "push" && isStaffRole(user.role)) {
    requests.push(postMarkStaffNotificationsReadForVox(voxId));
  }
  // A failed request is left to the open vox, which marks once the counters catch up.
  const results = await Promise.allSettled(requests);
  if (results.some((r) => r.status === "fulfilled" && r.value > 0)) await refresh();
};
