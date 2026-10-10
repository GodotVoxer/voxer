type Props = {
  label: string;
  title?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

export const ComposerCheckOption = ({ label, title, checked, onCheckedChange }: Props) => (
  <label className="flex cursor-pointer items-start gap-2 text-xs text-fg-muted" title={title}>
    <input
      type="checkbox"
      className="mt-0.5 size-3.5 shrink-0 cursor-pointer rounded border-fg/25 accent-brand-500"
      checked={checked}
      onChange={(event) => onCheckedChange(event.target.checked)}
    />
    <span>{label}</span>
  </label>
);
