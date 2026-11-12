"use client";

import { useId } from "react";

/**
 * SwiftPDF brand mark — a document sheet with a folded corner and a bolt,
 * on an indigo→violet gradient badge ("PDF" + "Swift").
 * Modern refinement: squircle badge (28% radius), richer diagonal gradient,
 * softer glass highlights, larger doc glyph with a bigger fold, and a bolt
 * with rounded joins (paint-order stroke).
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
        <linearGradient id={bg} x1="3.5" y1="2" x2="29" y2="30.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" />
          <stop offset="0.5" stopColor="#7C5BF6" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
        <linearGradient id={bolt} x1="13" y1="11" x2="20" y2="25" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4338CA" />
          <stop offset="1" stopColor="#6D28D9" />
        </linearGradient>
        <clipPath id={clip}>
          <rect width="32" height="32" rx="9" />
        </clipPath>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${bg})`} />
      <g clipPath={`url(#${clip})`}>
        <ellipse cx="10" cy="4.5" rx="17" ry="10.5" fill="#fff" opacity="0.16" />
        <ellipse cx="26" cy="31.5" rx="15" ry="10" fill="#312E81" opacity="0.2" />
      </g>
      <path
        d="M9.8 5.9h7l7.4 7.4v10.6a2.4 2.4 0 0 1-2.4 2.4H9.8a2.4 2.4 0 0 1-2.4-2.4V8.3a2.4 2.4 0 0 1 2.4-2.4Z"
        fill="#fff"
      />
      <path d="M16.8 5.9v4.9a2.5 2.5 0 0 0 2.5 2.5h4.9l-7.4-7.4Z" fill="#C7D2FE" />
      <path
        d="M17.7 11.4 12.9 18.7h3.1l-1.6 6.3 5.3-7.6h-3.2l2-6Z"
        fill={`url(#${bolt})`}
        stroke={`url(#${bolt})`}
        strokeLinejoin="round"
      />
    </svg>
  );
}
