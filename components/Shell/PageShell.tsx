import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
type PageShellProps = {
  children: ReactNode;
  className?: string;
};
export const PageShell = ({ children, className }: PageShellProps) => {
  return (
    <main
      className={cn(
        "mt-[var(--app-header-offset)] min-h-screen w-full min-w-0 bg-surface text-fg [overflow-anchor:none]",
        className,
      )}
    >
      {children}
    </main>
  );
};
