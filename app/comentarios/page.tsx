import type { Metadata } from "next";
import Link from "next/link";
import { AppInitializer } from "@/components/Shell/AppInitializer";
import { PageShell } from "@/components/Shell/PageShell";
import { MyCommentsView } from "@/components/Comments/MyComments/MyCommentsView";

export const metadata: Metadata = { title: "Comentarios" };
const MyCommentsPage = () => {
  return (
    <AppInitializer>
      <PageShell className="px-3 sm:px-4">
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 py-3 text-sm text-fg-muted">
            <Link href="/" className="cursor-pointer text-brand-400 hover:underline">
              Inicio
            </Link>
            <span className="text-fg-faint">/</span>
            <span className="font-medium text-fg">Comentarios</span>
          </div>
          <MyCommentsView />
        </div>
      </PageShell>
    </AppInitializer>
  );
};

export default MyCommentsPage;
