import type { Metadata } from "next";
import Link from "next/link";
import { AppInitializer } from "@/components/Shell/AppInitializer";
import { PageShell } from "@/components/Shell/PageShell";
import { VoxGrid } from "@/components/Vox/Grid/VoxGrid";

export const metadata: Metadata = { title: "Buscar" };
type Props = {
  searchParams: Promise<{ q?: string | string[] }>;
};

const SearchPage = async ({ searchParams }: Props) => {
  const sp = await searchParams;
  const raw = sp.q;
  const q = Array.isArray(raw) ? raw[0] : raw;
  const query = (q ?? "").trim();

  return (
    <AppInitializer>
      <PageShell className="px-3 sm:px-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 py-3 text-sm text-fg-muted">
          <Link href="/" className="cursor-pointer text-brand-400 hover:underline">
            Inicio
          </Link>
          <span className="text-fg-faint">/</span>
          <span className="font-medium text-fg">Buscar</span>
          {query ? (
            <>
              <span className="text-fg-faint">·</span>
              <span className="max-w-[min(100%,28rem)] truncate font-mono text-xs text-fg-subtle">
                {query}
              </span>
            </>
          ) : null}
        </div>
        {query ? (
          <VoxGrid listView="default" searchQuery={query} />
        ) : (
          <p className="px-2 py-8 text-sm text-fg-muted sm:px-3">
            Escribí un término en el buscador (ícono de lupa en la barra superior) para ver
            resultados por título.
          </p>
        )}
      </PageShell>
    </AppInitializer>
  );
};

export default SearchPage;
