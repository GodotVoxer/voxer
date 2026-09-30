"use client";

/** `origin` is the pressed tag: the floating composer grows out of it. */
export type ReplyTagHandler = (tag: string, origin?: HTMLElement) => void;

type Props = {
  publicTag: string;
  onReplyTag: ReplyTagHandler;
};

/** The comment id, which quotes it in the composer when tapped; shared by thread rows and the quote/replies dialogs. */
export const CommentTagButton = ({ publicTag, onReplyTag }: Props) => (
  <button
    type="button"
    className="cursor-pointer touch-manipulation rounded-full border border-fg/12 bg-surface-sunken/90 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-tight text-fg-soft tabular-nums shadow-sm outline-none [-webkit-tap-highlight-color:transparent] transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-out hover:-translate-y-0.5 hover:border-brand-500/50 hover:bg-brand-950/50 hover:text-brand-200 hover:shadow-md active:translate-y-0 active:scale-90 active:border-brand-400/70 active:bg-brand-600 active:text-on-solid active:shadow-inner focus-visible:ring-2 focus-visible:ring-brand-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-surface motion-reduce:transform-none motion-reduce:transition-none"
    title="Responder citando este ID"
    onClick={(e) => onReplyTag(publicTag, e.currentTarget)}
  >
    {publicTag}
  </button>
);
