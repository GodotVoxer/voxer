"use client";
import Link from "next/link";
import { FriendlyError } from "@/components/Shell/FriendlyError";
import { Button } from "@/components/ui/button";
import { VoxDetailBackdrop } from "@/components/Vox/Detail/VoxDetailBackdrop";

type Props = {
  message: string;
  onRetry: () => void;
};

export const VoxDetailLoadError = ({ message, onRetry }: Props) => {
  return (
    <main className="isolate mt-[var(--app-header-offset)] min-h-[calc(100dvh-var(--app-header-offset))] bg-surface-vox-detail px-4 py-12 text-fg">
      <VoxDetailBackdrop />
      <div className="mx-auto max-w-lg">
        <FriendlyError title="Este vox no aparece" message={message} />
        <p className="mt-6 text-center text-sm text-fg-subtle">
          Puede que el enlace esté roto o el servidor no responda.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer border-fg/30 bg-surface-raised text-fg hover:bg-fg/10"
            onClick={onRetry}
          >
            Reintentar
          </Button>
          <Button
            asChild
            variant="outline"
            className="cursor-pointer border-brand-600/50 bg-surface-raised text-brand-100 hover:bg-brand-950"
          >
            <Link href="/">Volver al inicio</Link>
          </Button>
        </div>
      </div>
    </main>
  );
};
