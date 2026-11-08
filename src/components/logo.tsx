"use client";

import { useId } from "react";

/**
 * SwiftPDF brand mark — a document sheet with a folded corner and a bolt,
 * on an indigo→violet gradient badge ("PDF" + "Swift").
 * Literal brand colors (not CSS vars) so the mark is identical in light/dark,
 * in-app, in icons and in share previews — one source of truth, mirrored by
 * public/logo.svg (rasterized into PWA icons by scripts/gen-assets.mjs).
 */
export function Logo({ className }: { className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const bg = `spdf-bg-${uid}`;
  const bolt = `spdf-bolt-${uid}`;
  const clip = `spdf-clip-${uid}`;
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={bg} x1="3" y1="2.5" x2="29" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" />
          <stop offset="0.52" stopColor="#7C5BF6" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
        <linearGradient id={bolt} x1="13" y1="11" x2="20" y2="25" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4338CA" />
          <stop offset="1" stopColor="#6D28D9" />
        </linearGradient>
        <clipPath id={clip}>
          <rect width="32" height="32" rx="7.5" />
        </clipPath>
      </defs>
      <rect width="32" height="32" rx="7.5" fill={`url(#${bg})`} />
      <g clipPath={`url(#${clip})`}>
        <ellipse cx="9" cy="5" rx="16" ry="11" fill="#fff" opacity="0.14" />
        <ellipse cx="27" cy="31" rx="14" ry="10" fill="#312E81" opacity="0.18" />
      </g>
      <path
        d="M9.75 6.5h6.75l7 7v10.25A2.25 2.25 0 0 1 21.25 26h-11.5A2.25 2.25 0 0 1 7.5 23.75V8.75A2.25 2.25 0 0 1 9.75 6.5Z"
        fill="#fff"
      />
      <path d="M16.5 6.5v4.75a2.25 2.25 0 0 0 2.25 2.25H23.5l-7-7Z" fill="#C7D2FE" />
      <path
        d="M17.7 11.4 12.9 18.7h3.1l-1.6 6.3 5.3-7.6h-3.2l2-6Z"
        fill={`url(#${bolt})`}
      />
    </svg>
  );
}
