import type { AvatarVariant } from "@/lib/vox/types";

/** Stripes from top to bottom (theme tokens). Inverted keeps the order with complementary colors (hue + 180 degrees). */
const MULTICOLOR_STRIPE_COLORS = [
  "var(--avatar-blue)",
  "var(--avatar-green)",
  "var(--avatar-red)",
  "var(--avatar-yellow)",
] as const;

const MULTICOLOR_STRIPE_INVERTED_COLORS: readonly string[] = MULTICOLOR_STRIPE_COLORS.map(
  (color) => `hsl(from ${color} calc(h + 180) s l)`,
);

export const usesStripeAnimatedAvatar = (variant: AvatarVariant): boolean =>
  variant === "MULTICOLOR" || variant === "MULTICOLOR_INVERTED";

export const stripeColorsForVariant = (variant: AvatarVariant): readonly string[] =>
  variant === "MULTICOLOR_INVERTED"
    ? [...MULTICOLOR_STRIPE_INVERTED_COLORS]
    : [...MULTICOLOR_STRIPE_COLORS];

export const avatarClass = (variant: AvatarVariant): string => {
  switch (variant) {
    case "BLUE":
      return "bg-avatar-blue text-on-media";
    case "GREEN":
      return "bg-avatar-green text-on-media";
    case "RED":
      return "bg-avatar-red text-on-media";
    case "YELLOW":
      return "bg-avatar-yellow text-on-media drop-shadow-[0_1px_1px_color-mix(in_oklab,var(--shade)_55%,transparent)]";
    case "PINK":
      return "bg-avatar-pink text-on-media";
    case "BROWN":
      return "bg-avatar-brown text-on-media";
    case "WHITE":
      return "bg-avatar-white text-avatar-black border border-avatar-black/35";
    case "BLACK":
      return "bg-avatar-black text-on-media border border-avatar-white/25";
    case "MULTICOLOR":
    case "MULTICOLOR_INVERTED":
      return "text-on-media";
    default:
      return "bg-avatar-gray text-on-media";
  }
};
