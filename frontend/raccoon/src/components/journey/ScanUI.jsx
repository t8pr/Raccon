export function StatusHero({ number }) {
  return (
    <div className="status-hero">
      <svg
        width="320"
        height="386"
        viewBox="0 0 320 386"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        aria-hidden="true"
      >
        <g filter="url(#filter0_f_1622_1456)">
          <circle cx="159.9" cy="214.84" r="102.5" fill="#C6ECDB" />
        </g>

        {/* الحلقة المتقطعة الخارجية — الصقها من SVG الأصلي (mask + stroke path).
            كلها زخرفة وما تأثر على المنطق. */}

        <g filter="url(#filter1_d_1622_1456)">
          <circle
            cx="159.9"
            cy="214.84"
            r="68.47"
            fill="#C6ECDB"
            strokeWidth="4.1"
            stroke="white"
          />
        </g>
        <circle
          cx="159.9"
          cy="214.84"
          r="59.04"
          strokeWidth="1.64"
          stroke="#0D0A21"
          fill="none"
        />

        {/* ↓↓↓ الرقم الديناميكي — يستبدل الـ path الي كان يرسم "05" ↓↓↓ */}
        <text
          x="159.9"
          y="236"
          textAnchor="middle"
          fontFamily="system-ui, 'Segoe UI', sans-serif"
          fontSize="62"
          fontWeight="900"
          fill="#0D0A21"
        >
          {number}
        </text>

        {/* "Status" wordmark + الـ pill button السفلي:
            الصق جميع الـ <use xlinkHref="#stroke1_1622_1456" />،
            الـ <mask id="stroke2_..."> والـ <path ... mask="url(#stroke2_...)" />،
            وكذلك stroke3، ثم <rect x="105.78" y="306.68" ... fill="#281F63"/>
            مع الـ paths الداخلية — كلها زخرفة ثابتة. */}

        <defs>
          <filter
            id="filter0_f_1622_1456"
            x="18.04"
            y="72.98"
            width="283.72"
            height="283.72"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend
              mode="normal"
              in="SourceGraphic"
              in2="BackgroundImageFix"
              result="shape"
            />
            <feGaussianBlur
              stdDeviation="19.68"
              result="effect1_foregroundBlur_1622_1456"
            />
          </filter>

          <filter
            id="filter1_d_1622_1456"
            x="64.78"
            y="131.2"
            width="190.24"
            height="190.24"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feColorMatrix
              in="SourceAlpha"
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 127 0"
              result="hardAlpha"
            />
            <feOffset dy="11.48" />
            <feGaussianBlur stdDeviation="12.3" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.02  0 0 0 0 0.01  0 0 0 0 0.1  0 0 0 0.45 0"
            />
            <feBlend
              mode="normal"
              in2="BackgroundImageFix"
              result="effect1_dropShadow_1622_1456"
            />
            <feBlend
              mode="normal"
              in="SourceGraphic"
              in2="effect1_dropShadow_1622_1456"
              result="shape"
            />
          </filter>

          {/* الـ <path id="stroke1_1622_1456"> و <path id="stroke3_1622_1456">
              الصقهم من defs الأصلي */}
        </defs>
      </svg>
    </div>
  );
}
export function NotLiveHero() {
  return (
    <img
      src="/raccon.svg"
      alt=""
      className="status-hero__img"
      aria-hidden="true"
    />
  );
}

export function ClaimedHero({ tagNumber }) {
  const formatted = String(tagNumber ?? "").padStart(2, "0");
  return (
    <div className="claimed-hero">
      <img
        src="/status-hero-claimed.svg"
        alt=""
        className="claimed-hero__bg"
        aria-hidden="true"
      />
      <span className="claimed-hero__number">{formatted}</span>
    </div>
  );
}

export function MentoCharacter() {
  return (
    <img
      src="/mento-found.svg"
      alt=""
      className="mento-character"
      aria-hidden="true"
    />
  );
}

export function BoomHero({ lost }) {
  return (
    <div className="boom-hero">
      <img
        src="/boom-hero.svg"
        alt=""
        className="boom-hero__bg"
        aria-hidden="true"
      />
      <span className="boom-hero__value">-{lost}</span>
    </div>
  );
}
