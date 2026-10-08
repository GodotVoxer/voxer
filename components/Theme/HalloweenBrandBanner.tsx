const BAT_PATH =
  "M0 4Q3 1 6 3Q7 1 9 2L10 0L11 2L12 1.5L13 2L14 0L15 2Q17 1 18 3Q21 1 24 4Q21 4 20 7Q18 5 16 7Q14 5.5 12 9Q10 5.5 8 7Q6 5 4 7Q3 4 0 4Z";

const STARS: [number, number, number][] = [
  [26, 16, 1],
  [64, 34, 0.8],
  [112, 12, 1.1],
  [150, 30, 0.7],
  [196, 14, 0.9],
  [300, 84, 0.8],
  [138, 54, 0.6],
  [12, 48, 0.7],
  [304, 18, 1],
];

const Pumpkin = ({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <circle r="40" fill="url(#halloween-pumpkin-glow)" />
    <ellipse cx="-11" cy="0" rx="12" ry="15" className="fill-brand-700" />
    <ellipse cx="11" cy="0" rx="12" ry="15" className="fill-brand-700" />
    <ellipse cx="0" cy="0" rx="13" ry="16" className="fill-brand-600" />
    <path d="M-2 -15Q-1 -22 4 -24L5 -21Q2 -19 2 -14Z" className="fill-success-700" />
    <g className="fill-highlight-300" filter="url(#halloween-glow)">
      <path d="M-10 -4L-5 -10L-2 -3Z" />
      <path d="M2 -3L5 -10L10 -4Z" />
      <path d="M-2 1L0 -2L2 1Z" />
      <path d="M-14 3Q0 15 14 3L10 5L7 3L4 7L0 4L-4 7L-7 3L-10 5Z" />
    </g>
  </g>
);

/**
 * Sidebar logo while the Halloween seasonal theme is showing; drawn only with theme tokens. Anchored to
 * the bottom: a wider drawer crops the top of the sky, so nothing important sits above y=28.
 */
export const HalloweenBrandBanner = () => (
  <svg
    viewBox="0 0 320 160"
    preserveAspectRatio="xMidYMax slice"
    className="absolute inset-0 size-full"
    aria-hidden
  >
    <defs>
      <linearGradient id="halloween-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" style={{ stopColor: "var(--special-950)" }} />
        <stop offset="0.7" style={{ stopColor: "var(--sidebar-bg)" }} />
      </linearGradient>
      <radialGradient id="halloween-moon-glow">
        <stop offset="0.4" style={{ stopColor: "var(--highlight-300)", stopOpacity: 0.4 }} />
        <stop offset="1" style={{ stopColor: "var(--highlight-300)", stopOpacity: 0 }} />
      </radialGradient>
      <radialGradient id="halloween-pumpkin-glow">
        <stop offset="0.2" style={{ stopColor: "var(--brand-500)", stopOpacity: 0.45 }} />
        <stop offset="1" style={{ stopColor: "var(--brand-500)", stopOpacity: 0 }} />
      </radialGradient>
      <filter id="halloween-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    <rect width="320" height="160" fill="url(#halloween-sky)" />
    {STARS.map(([cx, cy, r]) => (
      <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} className="fill-fg" opacity="0.55" />
    ))}

    <circle cx="258" cy="56" r="52" fill="url(#halloween-moon-glow)" />
    <circle cx="258" cy="56" r="22" className="fill-highlight-100" />
    <g className="fill-highlight-300" opacity="0.35">
      <circle cx="251" cy="50" r="4" />
      <circle cx="265" cy="64" r="3" />
      <circle cx="267" cy="48" r="2" />
    </g>
    <g className="fill-shade">
      <path d={BAT_PATH} transform="translate(204 40) scale(1.2)" />
      <path d={BAT_PATH} transform="translate(286 70) rotate(-10) scale(0.9)" />
      <path d={BAT_PATH} transform="translate(226 82) rotate(8) scale(0.7)" />
    </g>

    <path d="M0 126Q70 106 140 120T320 110V160H0Z" className="fill-special-950" />
    <g className="fill-surface-strong">
      <path d="M150 134V119Q157 108 164 119V134Z" />
      <path d="M178 134V116H173V111H178V105H183V111H188V116H183V134Z" />
      <path d="M200 134V123Q205 116 210 123V134Z" />
    </g>
    <path
      d="M226 138C230 124 232 106 230 90C226 84 218 80 210 82C218 78 225 80 230 84C230 76 226 68 220 64C227 67 231 73 233 80C235 70 240 64 248 62C242 66 237 73 236 84C239 80 246 78 252 80C245 81 239 85 237 92C236 108 238 124 242 138Z"
      className="fill-shade"
    />
    <path d="M0 140Q80 128 160 136T320 132V160H0Z" className="fill-shade" />
    <Pumpkin x={278} y={132} />
    <Pumpkin x={120} y={142} scale={0.55} />

    <text
      x="20"
      y="84"
      fontSize="54"
      letterSpacing="3"
      className="fill-brand-400"
      stroke="var(--shade)"
      strokeWidth="1.5"
      paintOrder="stroke"
      filter="url(#halloween-glow)"
      style={{ fontFamily: "var(--font-spooky)" }}
    >
      VOXER
    </text>
    <text x="23" y="104" fontSize="11" letterSpacing="2" className="fill-fg-muted">
      EDICIÓN HALLOWEEN
    </text>
  </svg>
);
