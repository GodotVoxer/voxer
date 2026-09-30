"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/features/auth/store";
import { isStaffRole } from "@/lib/moderation/roles";
import { ModerationAccessDenied } from "@/components/Moderation/Dialogs/ModerationAccessDenied";
import { ModerationHistoryPanel } from "@/components/Moderation/Staff/ModerationHistoryPanel";
import { ModerationStaffPanel } from "@/components/Moderation/Staff/ModerationStaffPanel";

export default function ModerationPage() {
  const user = useAuthStore((s) => s.user);
  const refresh = useAuthStore((s) => s.refresh);
  const [tab, setTab] = useState<"log" | "staff">("log");

  if (!user || !isStaffRole(user.role)) {
    return <ModerationAccessDenied />;
  }

  return (
    <main className="mx-auto mt-[var(--app-header-offset)] max-w-5xl px-3 py-6 text-fg">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Panel de moderación</h1>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={tab === "log" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setTab("log")}
          >
            Historial
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tab === "staff" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setTab("staff")}
          >
            Staff
          </Button>
        </div>
      </div>

      {tab === "log" ? (
        <ModerationHistoryPanel onAuthRefresh={refresh} />
      ) : (
        <ModerationStaffPanel currentUser={user} onAuthRefresh={refresh} />
      )}
    </main>
  );
}
