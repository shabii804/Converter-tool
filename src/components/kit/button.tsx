"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * PrivyPDF Button — brand primary uses the indigo→violet gradient.
 * Subtle press feedback (scale .98); respects reduced motion via tokens.
 */
const buttonVariants = cva(
  cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control font-semibold",
    "transition-[box-shadow,background-color,color,transform] duration-150 ease-out",
    "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0"
  ),
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-brand text-white shadow-glow hover:brightness-[1.06] active:brightness-[0.98]",
        secondary:
          "bg-surface-2 text-foreground border border-border-strong/60 shadow-xs hover:bg-surface-3",
        outline:
          "border border-border-strong/70 bg-transparent text-foreground hover:bg-surface-1",
        ghost: "text-fg-muted hover:bg-surface-1 hover:text-foreground",
        destructive: "bg-destructive text-destructive-foreground hover:brightness-105",
      },
      size: {
        sm: "h-9 px-3.5 text-[13px] [&_svg]:size-4",
        md: "h-10 px-4 text-sm [&_svg]:size-4",
        lg: "h-12 px-6 text-[15px] [&_svg]:size-[18px]",
        xl: "h-14 px-8 text-base [&_svg]:size-5",
        icon: "size-10 [&_svg]:size-[18px]",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
);
Button.displayName = "Button";

export { buttonVariants };
