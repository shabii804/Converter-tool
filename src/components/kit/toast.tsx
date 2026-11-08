"use client";

import { toast } from "sonner";

/**
 * Toast — branding for sonner. The <Toaster> in layout.tsx already renders;
 * this module documents the API and provides typed helpers used across the app.
 */
export { toast } from "sonner";

export const notify = {
  success: (msg: string, description?: string) =>
    toast.success(msg, { description }),
  error: (msg: string, description?: string) => toast.error(msg, { description }),
  warning: (msg: string, description?: string) => toast.warning(msg, { description }),
  info: (msg: string, description?: string) => toast.info(msg, { description }),
};
