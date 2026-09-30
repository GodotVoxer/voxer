type Props = {
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
  compact?: boolean;
};

export const SilentVideoGifOption = ({
  checked,
  disabled = false,
  onCheckedChange,
  compact = false,
}: Props) => (
  <label
    className={`flex cursor-pointer items-start gap-2 rounded-md border border-brand-500/25 bg-brand-950/25 ${
      compact ? "px-2.5 py-2 text-xs" : "px-3 py-2.5 text-sm"
    } text-fg-soft`}
  >
    <input
      type="checkbox"
      className="mt-0.5 size-4 shrink-0 cursor-pointer accent-brand-500"
      checked={checked}
      disabled={disabled}
      onChange={(event) => onCheckedChange(event.target.checked)}
    />
    <span>
      <span className="font-medium text-fg">Tratar como GIF</span>
      <span className="mt-0.5 block text-fg-muted">Se reproducirá en bucle y sin controles.</span>
    </span>
  </label>
);
