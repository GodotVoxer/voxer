"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/features/auth/store";
import { isStaffRole } from "@/lib/moderation/roles";
import { ModerationAccessDenied } from "@/components/Moderation/Dialogs/ModerationAccessDenied";
import { AuthorPublicationsHistoryView } from "@/components/Moderation/Staff/AuthorPublicationsHistoryView";
import { Button } from "@/components/ui/button";

const PublicationHistoryInner = () => {
  const sp = useSearchParams();
  const voxId = sp.get("voxId")?.trim() || null;
  const commentId = sp.get("commentId")?.trim() || null;

  const invalid = (voxId == null && commentId == null) || (voxId != null && commentId != null);

  if (invalid) {
    return (
      <div className="rounded-md border border-warning-900/40 bg-warning-950/20 p-4 text-sm text-warning-100">
        <p className="font-medium">Parámetros inválidos</p>
        <p className="mt-1 text-warning-100/85">
          Abrí esta página desde el ícono de historial en un vox o en un comentario (solo staff).
        </p>
        <Button type="button" variant="outline" className="mt-3 cursor-pointer" asChild>
          <Link href="/moderacion">Volver al panel</Link>
        </Button>
      </div>
    );
  }

  return <AuthorPublicationsHistoryView voxId={voxId} commentId={commentId} />;
};

export default function PublicationHistoryPage() {
  const user = useAuthStore((s) => s.user);

  if (!user || !isStaffRole(user.role)) {
    return <ModerationAccessDenied />;
  }

  return (
    <main className="mx-auto mt-[var(--app-header-offset)] max-w-3xl px-3 py-6 text-fg">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Historial del autor</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Listado interno para moderación. No compartas capturas con datos sensibles.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" className="cursor-pointer" asChild>
          <Link href="/moderacion">Panel de moderación</Link>
        </Button>
      </div>

      <Suspense fallback={<p className="text-sm text-fg-muted">Cargando parámetros…</p>}>
        <PublicationHistoryInner />
      </Suspense>
    </main>
  );
}
