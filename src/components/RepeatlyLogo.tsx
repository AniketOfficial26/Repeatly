export function RepeatlyLogo({ size = 34 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Repeatly Logo"
      className="shrink-0"
    >
      <rect width="64" height="64" rx="18" fill="var(--accent)" />
      {/* Top-right repeating cycle arc with arrowhead */}
      <path
        d="M19 25.5C21.8 18.8 28.4 14.5 36 15C43.2 15.5 49.2 20.5 51 27.3"
        stroke="var(--accent-fg)"
        strokeWidth="4.2"
        strokeLinecap="round"
      />
      <path
        d="M46.5 24.5L51.4 28.2L53.8 22.3"
        stroke="var(--accent-fg)"
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bottom-left repeating cycle arc with arrowhead */}
      <path
        d="M45 38.5C42.2 45.2 35.6 49.5 28 49C20.8 48.5 14.8 43.5 13 36.7"
        stroke="var(--accent-fg)"
        strokeWidth="4.2"
        strokeLinecap="round"
      />
      <path
        d="M17.5 39.5L12.6 35.8L10.2 41.7"
        stroke="var(--accent-fg)"
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Central task completion check */}
      <path
        d="M25.5 32.5L30.2 37.2L39.5 27.5"
        stroke="var(--accent-fg)"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
