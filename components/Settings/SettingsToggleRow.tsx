"use client";

type Props = {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

export const SettingsToggleRow = ({ label, description, checked, onCheckedChange }: Props) => (
  <label className="flex cursor-pointer items-start gap-3 py-3">
    <input
      type="checkbox"
      className="mt-0.5 size-5 shrink-0 cursor-pointer accent-brand-600"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
    />
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-medium text-fg">{label}</span>
      <span className="mt-0.5 block text-xs leading-relaxed text-fg-muted">{description}</span>
    </span>
  </label>
);
