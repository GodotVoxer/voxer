"use client";

type Props = {
  show: boolean;
};

export const FileDropHintOverlay = ({ show }: Props) =>
  show ? (
    <div
      className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center rounded-[inherit] bg-surface-sunken/80 ring-2 ring-brand-500/45 backdrop-blur-[1px]"
      aria-hidden
    >
      <p className="max-w-[min(100%,20rem)] px-4 text-center text-sm font-medium leading-snug text-fg">
        Soltá acá la imagen o el video para adjuntarla
      </p>
    </div>
  ) : null;
