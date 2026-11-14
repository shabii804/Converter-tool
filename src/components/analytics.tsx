import type { Metadata } from "next";

/**
 * Privacy-friendly analytics — OFF by default. Nothing loads and nothing is
 * measured until NEXT_PUBLIC_PLAUSIBLE_DOMAIN (Plausible) or
 * NEXT_PUBLIC_UMAMI_* (Umami) is configured. No file-adjacent tracking,
 * no cookies, per both providers' design.
 */
export function Analytics() {
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  const umamiId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  const umamiSrc = process.env.NEXT_PUBLIC_UMAMI_SRC;

  if (plausibleDomain) {
    return (
      <script
        defer
        data-domain={plausibleDomain}
        src="https://plausible.io/js/script.js"
      />
    );
  }
  if (umamiId && umamiSrc) {
    return <script defer data-website-id={umamiId} src={umamiSrc} />;
  }
  return null;
}

/** Metadata additions for the PWA (icons, manifest, standalone display). */
export function pwaMetadata(): Metadata {
  return {
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "PrivyPDF",
    },
  };
}
