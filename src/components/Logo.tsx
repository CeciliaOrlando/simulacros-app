export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <rect width="32" height="32" rx="8" fill="#B91C1C" />
      <path
        d="M16 7 26 24H6L16 7Z"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M16 14v4.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="16" cy="21.2" r="1.3" fill="#fff" />
    </svg>
  );
}
