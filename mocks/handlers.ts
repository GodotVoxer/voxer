import { authHandlers } from "@/mocks/handlers/auth";
import { themeHandlers } from "@/mocks/handlers/theme";
import { notificationsHandlers } from "@/mocks/handlers/notifications";
import { moderationHandlers } from "@/mocks/handlers/moderation";
import { commentsHandlers } from "@/mocks/handlers/comments";
import { voxHandlers } from "@/mocks/handlers/vox";
import { uploadHandlers } from "@/mocks/handlers/upload";

export const handlers = [
  ...authHandlers,
  ...themeHandlers,
  ...notificationsHandlers,
  ...moderationHandlers,
  ...commentsHandlers,
  ...voxHandlers,
  ...uploadHandlers,
];
