"use client";

import { cn } from "@/lib/utils";
import { countryIso2FlagIconSuffix } from "@/features/comments/countryFlag";

type Props = {
  countryCode: string;
  className?: string;
};

/** Rectangular flag (SVG through `flag-icons`), identical on every client. */
export const CountryFlagIcon = ({ countryCode, className }: Props) => {
  const suffix = countryIso2FlagIconSuffix(countryCode);
  if (!suffix) return null;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 overflow-hidden rounded-[2px] border border-fg/18 bg-surface-sunken/80 shadow-[0_0_0_1px_color-mix(in_oklab,var(--shade)_35%,transparent)]",
        "h-3 w-4 items-stretch justify-stretch align-middle",
        className,
      )}
      title={countryCode.toUpperCase()}
      role="img"
      aria-label={`País ${countryCode.toUpperCase()}`}
    >
      <span
        className={cn("fi block h-full w-full bg-cover bg-center bg-no-repeat", `fi-${suffix}`)}
        aria-hidden
      />
    </span>
  );
};
