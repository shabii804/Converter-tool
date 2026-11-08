"use client";

import { motion, useReducedMotion } from "framer-motion";

/** SuccessCheck — drawn checkmark for the done state (subtle, reduced-motion aware). */
export function SuccessCheck({ size = 80 }: { size?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      initial={reduce ? undefined : { scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 18 }}
      className="relative inline-flex items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: "color-mix(in oklab, var(--success) 14%, transparent)",
        border: "1px solid color-mix(in oklab, var(--success) 30%, transparent)",
      }}
      role="img"
      aria-label="Completed"
    >
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none">
        <motion.path
          d="M4.5 12.5l4.5 4.5L19.5 6.5"
          stroke="var(--success)"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduce ? undefined : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={
            reduce
              ? { duration: 0 }
              : { duration: 0.45, delay: 0.12, ease: "easeOut" }
          }
        />
      </svg>
    </motion.span>
  );
}
