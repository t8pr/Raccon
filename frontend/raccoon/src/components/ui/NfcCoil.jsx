/*
  NfcCoil — Raccon brand pattern: the antenna coil from inside an NFC tag
  (circular spiral + chip + bonding lines). Pure SVG, colours come from props
  so it can sit on mint, night or white surfaces. Decorative only.
*/

// Build the spiral once: 6 turns, 10px between turns, drawn with cubic curves.
function buildSpiral() {
  const cx = 120;
  const cy = 120;
  const k = 0.5523; // circle-arc constant for cubic béziers
  const gap = 10;
  const point = (r, t) => [cx + r * Math.sin(t), cy - r * Math.cos(t)];

  let r = 100;
  let t = 0;
  let [x, y] = point(r, t);
  let d = `M ${x.toFixed(2)} ${y.toFixed(2)}`;

  for (let q = 0; q < 24; q += 1) {
    const r1 = r - gap / 4;
    const t1 = t + Math.PI / 2;
    const [x1, y1] = point(r1, t1);
    const c1x = x + k * r * Math.cos(t);
    const c1y = y + k * r * Math.sin(t);
    const c2x = x1 - k * r1 * Math.cos(t1);
    const c2y = y1 - k * r1 * Math.sin(t1);
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${x1.toFixed(2)} ${y1.toFixed(2)}`;
    r = r1;
    t = t1;
    x = x1;
    y = y1;
  }
  return d;
}

const SPIRAL = buildSpiral();

export default function NfcCoil({
  line = "var(--primary)",
  chip = "var(--primary)",
  bare = false, // spiral only (no chip / bonding lines), used as a corner decoration
  className = "",
}) {
  return (
    <svg
      className={`nfc-coil ${className}`.trim()}
      viewBox="0 0 240 240"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={SPIRAL}
        stroke={line}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {!bare && (
        <>
          <path
            d="M134 120 H160 M106 120 H80"
            stroke={line}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <rect x="106" y="106" width="28" height="28" rx="6" fill={chip} />
        </>
      )}
    </svg>
  );
}
