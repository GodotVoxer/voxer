"use client";

import { Crown } from "lucide-react";
import { useAuthStore } from "@/features/auth/store";
import { isStaffRole } from "@/lib/moderation/roles";

const staffRoleLabel = (role: string): string => (role === "ADMIN" ? "Administrador" : "Moderador");

export const SidebarSessionStatus = () => {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;
  const staff = isStaffRole(user.role);

  return (
    <p className="mt-3 flex items-center gap-1.5 px-2 text-xs text-fg-subtle">
      <span className="min-w-0 truncate">
        Sesión iniciada como <span className="font-medium text-fg-muted">{user.username}</span>
      </span>
      {staff ? (
        <span className="flex shrink-0 items-center gap-1 text-staff-crown">
          <Crown className="size-3 fill-staff-crown" strokeWidth={2} aria-hidden />
          {staffRoleLabel(user.role)}
        </span>
      ) : null}
    </p>
  );
};
