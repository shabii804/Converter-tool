import Link from "next/link";
import { Logo } from "./logo";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border-subtle bg-surface-1/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-center sm:flex-row sm:px-6 sm:text-left">
        <div className="flex items-center gap-2.5">
          <Logo className="size-6" />
          <span className="text-sm font-bold">
            Swift<span className="text-gradient">PDF</span>
          </span>
          <span className="text-[13px] text-fg-faint">
            — fast, private PDF tools
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[13px] text-fg-muted">
          <span>100% in-browser processing</span>
          <span aria-hidden="true" className="hidden sm:inline">·</span>
          <span>No sign-up</span>
          <span aria-hidden="true" className="hidden sm:inline">·</span>
          <span>Private by design</span>
          <span aria-hidden="true" className="hidden sm:inline">·</span>
          <span>Free forever</span>
          <span aria-hidden="true" className="hidden sm:inline">·</span>
          <Link
            href="/design"
            className="font-medium text-fg-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Design system
          </Link>
        </div>
      </div>
    </footer>
  );
}
