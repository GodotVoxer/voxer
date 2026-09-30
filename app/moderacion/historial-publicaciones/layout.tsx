import type { Metadata } from "next";

/** The page is a client component and cannot export `metadata`, so the title lives here. */
export const metadata: Metadata = { title: "Historial de publicaciones" };

const Layout = ({ children }: { children: React.ReactNode }) => children;

export default Layout;
