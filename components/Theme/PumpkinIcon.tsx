/** Jack-o'-lantern in lucide's style (24px grid, 2px stroke), which has no pumpkin icon. */
export const PumpkinIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    <path d="M8 8.2C4.6 8.2 2.5 11 2.5 14.4S4.8 20.5 8 20.5c1.6 0 2.8-.5 4-1.2 1.2.7 2.4 1.2 4 1.2 3.2 0 5.5-2.7 5.5-6.1S19.4 8.2 16 8.2c-1.6 0-2.8.5-4 1.2-1.2-.7-2.4-1.2-4-1.2Z" />
    <path d="M12 9.4V6.5c0-1.4.8-2.6 2.3-3" />
    <path d="m7.5 13 1.5-1.5 1.5 1.5" />
    <path d="m13.5 13 1.5-1.5 1.5 1.5" />
    <path d="M8 16.5c2.5 1.5 5.5 1.5 8 0" />
  </svg>
);
