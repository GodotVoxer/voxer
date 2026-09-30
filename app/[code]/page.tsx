import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppInitializer } from "@/components/Shell/AppInitializer";
import { PageShell } from "@/components/Shell/PageShell";
import { VoxGrid } from "@/components/Vox/Grid/VoxGrid";
import { ALL_CATEGORY_CODES, getCategoryFromCode } from "@/lib/vox/categoryCodes";
import { loadInitialFeedPage } from "@/server/vox/initialFeedPage";
/**
 * One page per code, regenerated every 15 s with the public first page embedded (the same cache as
 * `GET /api/vox`): the HTML does not depend on the user and CDNs can cache it. Unknown codes 404.
 */
export const dynamicParams = false;
export const revalidate = 15;
export const generateStaticParams = () => ALL_CATEGORY_CODES.map((code) => ({ code }));

type Props = {
  params: Promise<{
    code: string;
  }>;
};

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { code } = await params;
  const category = getCategoryFromCode(code.trim().toUpperCase());
  return category ? { title: category } : {};
};
const CategoryHomePage = async ({ params }: Props) => {
  const { code } = await params;
  const upper = code.trim().toUpperCase();
  const category = getCategoryFromCode(upper);
  if (!category) notFound();
  const initialPage = await loadInitialFeedPage(category);
  return (
    <AppInitializer>
      <PageShell className="px-3 sm:px-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 py-3 text-sm text-fg-muted">
          <Link href="/" className="cursor-pointer text-brand-400 hover:underline">
            Inicio
          </Link>
          <span className="text-fg-faint">/</span>
          <span className="font-medium text-fg">{category}</span>
          <span className="font-mono text-xs text-fg-subtle">/{upper}</span>
        </div>
        <VoxGrid categoryCode={upper} initialPage={initialPage} listView="default" />
      </PageShell>
    </AppInitializer>
  );
};
export default CategoryHomePage;
