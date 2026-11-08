"use client";

/**
 * Original SVG illustrations — hand-authored for SwiftPDF, no stock imagery.
 * Colors read from design tokens so both themes stay consistent.
 */

/** Hero: a private document inside a device outline, guarded by a shield. */
export function PrivacyIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 150"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ill-grad" x1="0" y1="0" x2="220" y2="150" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--grad-from)" />
          <stop offset="1" stopColor="var(--grad-to)" />
        </linearGradient>
      </defs>

      {/* device window */}
      <rect x="28" y="22" width="132" height="106" rx="14" fill="var(--surface-2)" stroke="var(--border-strong)" strokeWidth="1.5" />
      <rect x="28" y="22" width="132" height="22" rx="14" fill="var(--surface-3)" />
      <circle cx="42" cy="33" r="3" fill="var(--border-strong)" />
      <circle cx="52" cy="33" r="3" fill="var(--border-strong)" />

      {/* document */}
      <rect x="62" y="56" width="52" height="62" rx="8" fill="var(--surface-1)" stroke="url(#ill-grad)" strokeWidth="1.6" />
      <path d="M71 70h34M71 80h34M71 90h24" stroke="var(--foreground-faint)" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />

      {/* shield */}
      <path
        d="M150 62c10 5 20 6 26 6 0 22-8 36-26 44-18-8-26-22-26-44 6 0 16-1 26-6Z"
        fill="color-mix(in oklab, var(--grad-from) 14%, transparent)"
        stroke="url(#ill-grad)"
        strokeWidth="2"
      />
      <path d="M139 84l8 8 14-16" stroke="url(#ill-grad)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />

      {/* arrow: file stays in device */}
      <path d="M114 87c8 2 12 2 18 0" stroke="var(--foreground-faint)" strokeWidth="2" strokeLinecap="round" strokeDasharray="1 6" opacity="0.8" />
    </svg>
  );
}

/** Empty state: floating pages awaiting action (compact). */
export function EmptyPagesIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 72" fill="none" className={className} aria-hidden="true">
      <rect x="14" y="14" width="40" height="50" rx="8" fill="var(--surface-1)" stroke="var(--border-strong)" strokeWidth="1.4" />
      <rect x="34" y="8" width="40" height="50" rx="8" fill="var(--surface-2)" stroke="var(--grad-from)" strokeWidth="1.4" />
      <path d="M43 22h22M43 30h22M43 38h14" stroke="var(--foreground-faint)" strokeWidth="2.2" strokeLinecap="round" opacity="0.6" />
      <circle cx="76" cy="56" r="9" fill="color-mix(in oklab, var(--grad-from) 14%, transparent)" stroke="var(--grad-from)" strokeWidth="1.4" />
      <path d="M72.5 56h7M76 52.5v7" stroke="var(--grad-from)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Offline / on-device: a laptop with a local-only badge. */
export function OfflineIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 84" fill="none" className={className} aria-hidden="true">
      <rect x="24" y="16" width="72" height="46" rx="8" fill="var(--surface-2)" stroke="var(--border-strong)" strokeWidth="1.5" />
      <rect x="32" y="24" width="56" height="30" rx="5" fill="var(--surface-1)" />
      <rect x="40" y="32" width="22" height="4" rx="2" fill="var(--grad-from)" opacity="0.8" />
      <rect x="40" y="40" width="34" height="4" rx="2" fill="var(--border-strong)" />
      <path d="M16 66h88l-6 8H22l-6-8Z" fill="var(--surface-3)" stroke="var(--border-strong)" strokeWidth="1.4" />
      <circle cx="88" cy="20" r="8" fill="color-mix(in oklab, var(--success) 16%, transparent)" stroke="var(--success)" strokeWidth="1.5" />
      <path d="M84.8 20.2l2.4 2.4 4.4-5" stroke="var(--success)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
