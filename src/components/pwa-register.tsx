"use client";

import { useEffect } from "react";

/** Registers the offline service worker — production only, never in dev. */
export function PwaRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV === "production" &&
      typeof navigator !== "undefined" &&
      "serviceWorker" in navigator
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* SW is a progressive enhancement — ignore failures */
      });
    }
  }, []);
  return null;
}
