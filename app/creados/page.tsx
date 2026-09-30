import type { Metadata } from "next";
import Link from "next/link";
import { AppInitializer } from "@/components/Shell/AppInitializer";
import { PageShell } from "@/components/Shell/PageShell";
import { VoxGrid } from "@/components/Vox/Grid/VoxGrid";

export const metadata: Metadata = { title: "Creados" };
const MyVoxPage = () => {
  return (
    <AppInitializer>
      <PageShell className="px-3 sm:px-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 py-3 text-sm text-fg-muted">
          <Link href="/" className="cursor-pointer text-brand-400 hover:underline">
            Inicio
          </Link>
          <span className="text-fg-faint">/</span>
          <span className="font-medium text-fg">Creados</span>
        </div>
        <VoxGrid listView="mine" />
      </PageShell>
    </AppInitializer>
  );
};

export default MyVoxPage;
