import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUserIdFromCookies } from "@/server/auth/sessionCookie";
import { getStaffUser } from "@/server/moderation/permissions";

/**
 * Moderation pages are client components and cannot export `metadata`. Declares its own `template`
 * because a string `title` in a layout cuts the root template for nested segments.
 */
export const metadata: Metadata = {
  title: { default: "Moderación", template: "Voxer | %s" },
};

export default async function ModerationLayout({ children }: { children: React.ReactNode }) {
  if (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_USE_MOCKS === "true" &&
    !process.env.DATABASE_URL
  )
    return children;
  const userId = await getSessionUserIdFromCookies();
  if (!userId) {
    redirect("/");
  }
  const staff = await getStaffUser(userId);
  if (!staff) {
    redirect("/");
  }
  return children;
}
