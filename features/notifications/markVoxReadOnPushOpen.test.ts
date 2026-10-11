import { beforeEach, describe, expect, it, vi } from "vitest";
import { postMarkStaffNotificationsReadForVox } from "@/features/moderation/api";
import { postMarkNotificationsReadForVox } from "@/features/notifications/api";
import { markVoxReadOnPushOpen } from "@/features/notifications/markVoxReadOnPushOpen";

const auth = vi.hoisted(() => ({
  state: {
    user: null as { role: string; unreadNotifications: number } | null,
    refresh: vi.fn(),
  },
}));

vi.mock("@/features/auth/store", () => ({ useAuthStore: { getState: () => auth.state } }));
vi.mock("@/features/notifications/api", () => ({ postMarkNotificationsReadForVox: vi.fn() }));
vi.mock("@/features/moderation/api", () => ({ postMarkStaffNotificationsReadForVox: vi.fn() }));

const post = vi.mocked(postMarkNotificationsReadForVox);
const postStaff = vi.mocked(postMarkStaffNotificationsReadForVox);

describe("markVoxReadOnPushOpen", () => {
  beforeEach(() => {
    post.mockReset().mockResolvedValue(1);
    postStaff.mockReset().mockResolvedValue(0);
    auth.state.refresh.mockReset().mockResolvedValue(undefined);
    auth.state.user = { role: "USER", unreadNotifications: 0 };
  });

  it("marks the vox of the path even when the local counter says nothing is unread", async () => {
    await markVoxReadOnPushOpen("/vox/abc123#AB12");
    expect(post).toHaveBeenCalledExactlyOnceWith("abc123");
    expect(postStaff).not.toHaveBeenCalled();
    expect(auth.state.refresh).toHaveBeenCalledOnce();
  });

  it("skips the counter refresh when nothing was unread", async () => {
    post.mockResolvedValue(0);
    await markVoxReadOnPushOpen("/vox/abc123");
    expect(auth.state.refresh).not.toHaveBeenCalled();
  });

  it("also marks the staff notifications of a report push", async () => {
    auth.state.user = { role: "MOD", unreadNotifications: 0 };
    post.mockResolvedValue(0);
    postStaff.mockResolvedValue(2);
    await markVoxReadOnPushOpen("/vox/abc123?denuncia=push#AB12");
    expect(post).toHaveBeenCalledExactlyOnceWith("abc123");
    expect(postStaff).toHaveBeenCalledExactlyOnceWith("abc123");
    expect(auth.state.refresh).toHaveBeenCalledOnce();
  });

  it("leaves the staff notifications alone outside a report push or without the role", async () => {
    await markVoxReadOnPushOpen("/vox/abc123?denuncia=push");
    auth.state.user = { role: "ADMIN", unreadNotifications: 0 };
    await markVoxReadOnPushOpen("/vox/abc123#AB12");
    expect(postStaff).not.toHaveBeenCalled();
  });

  it("does nothing for a path that is not a vox", async () => {
    await markVoxReadOnPushOpen("/");
    await markVoxReadOnPushOpen("/favoritos#AB12");
    expect(post).not.toHaveBeenCalled();
  });

  it("does nothing without a session", async () => {
    auth.state.user = null;
    await markVoxReadOnPushOpen("/vox/abc123");
    expect(post).not.toHaveBeenCalled();
  });

  it("refreshes for whichever request marked something when the other one fails", async () => {
    auth.state.user = { role: "ADMIN", unreadNotifications: 0 };
    post.mockRejectedValue(new Error("offline"));
    postStaff.mockResolvedValue(1);
    await markVoxReadOnPushOpen("/vox/abc123?denuncia=push");
    expect(auth.state.refresh).toHaveBeenCalledOnce();
  });

  it("swallows a failed request", async () => {
    post.mockRejectedValue(new Error("offline"));
    await expect(markVoxReadOnPushOpen("/vox/abc123")).resolves.toBeUndefined();
    expect(auth.state.refresh).not.toHaveBeenCalled();
  });
});
