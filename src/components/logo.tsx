export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path
        d="M10 23V9h6.2c3 0 4.8 1.6 4.8 4.2 0 2.7-1.9 4.3-5 4.3H13V23h-3zm3-7.9h3c1.5 0 2.4-.7 2.4-1.9 0-1.2-.9-1.9-2.4-1.9h-3v3.8z"
        className="fill-primary-foreground"
      />
      <circle cx="23.5" cy="21.5" r="3.5" className="fill-white" />
      <path
        d="M22 21.5l1.6 1.6 3-3"
        stroke="#2563EB"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-primary dark:stroke-[#60A5FA]"
        fill="none"
      />
    </svg>
  );
}
