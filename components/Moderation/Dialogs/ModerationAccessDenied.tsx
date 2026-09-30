"use client";
import Link from "next/link";

export const ModerationAccessDenied = () => {
  return (
    <main className="mx-auto mt-[var(--app-header-offset)] max-w-lg px-4 py-12 text-center text-fg">
      <h1 className="text-xl font-semibold">Moderación</h1>
      <p className="mt-3 text-sm text-fg-muted">No tenés permisos para ver esta sección.</p>
      <Link href="/" className="mt-6 inline-block text-brand-400 hover:underline">
        Volver al inicio
      </Link>
    </main>
  );
};
