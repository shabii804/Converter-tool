"use client";

import { useId } from "react";

/**
 * PrivyPDF brand mark — document sheet with a folded corner, fronted by a
 * shield with a padlock ("Privy" + "PDF"), on a tinted badge.
 *
 * This is the SMALL-SIZE lockup: it drops the orbit ring of the full artwork
 * (public/logo.svg) because three overlapping shapes turn to noise at the
 * 28–32px this component renders at (navbar, footer) — the doc + shield core
 * is scaled up instead so the identity stays crisp. Literal brand colors (not
 * CSS vars) so the mark is identical in light/dark, in-app and in icons —
 * mirrored by public/logo.svg (full) and public/logo-small.svg (this one,
 * rasterized into the favicon by scripts/gen-assets.mjs).
 */
export function Logo({ className }: { className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const shield = `ppdf-shield-${uid}`;
  const clip = `ppdf-clip-${uid}`;
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={shield} x1="15.3" y1="13" x2="26.3" y2="26.8" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2F5FB3" />
          <stop offset="1" stopColor="#16346F" />
        </linearGradient>
        <clipPath id={clip}>
          <rect width="32" height="32" rx="9" />
        </clipPath>
      </defs>

      {/* tinted badge + edge so the mark reads on light and dark */}
      <rect width="32" height="32" rx="9" fill="#F3F7FF" />
      <g clipPath={`url(#${clip})`}>
        <rect x="0.5" y="0.5" width="31" height="31" rx="8.5" stroke="#D8E2F6" />

        {/* doc + shield core, enlarged for small sizes */}
        <g transform="translate(16 16) scale(1.22) translate(-16 -16)">
          {/* document sheet with folded corner */}
          <path
            d="M9.7 5.6 h6.6 l4.9 4.9 v12.2 a1.9 1.9 0 0 1 -1.9 1.9 H9.7 a1.9 1.9 0 0 1 -1.9 -1.9 V7.5 a1.9 1.9 0 0 1 1.9 -1.9 Z"
            fill="#FFFFFF"
            stroke="#2E6BE6"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M16.3 5.6 v3.0 a1.9 1.9 0 0 0 1.9 1.9 h3.0 Z" fill="#1C3F94" />

          {/* shield with padlock */}
          <path
            d="M20.8 13.0 l5.5 2 v5.75 c0 3.5 -2.3 5.7 -5.5 6.75 c-3.2 -1.05 -5.5 -3.25 -5.5 -6.75 V15 Z"
            fill={`url(#${shield})`}
            stroke="#D9E1EF"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <rect x="17.9" y="17.7" width="5.8" height="5.0" rx="1.2" fill="#FFFFFF" />
          <path d="M19.1 17.7 v-1.5 a1.7 1.7 0 0 1 3.4 0 v1.5" stroke="#FFFFFF" strokeWidth="1.7" fill="none" />
          <circle cx="20.8" cy="19.9" r="0.95" fill="#1C3F94" />
          <rect x="20.35" y="20.3" width="0.9" height="1.5" rx="0.45" fill="#1C3F94" />
        </g>
      </g>
    </svg>
  );
}
