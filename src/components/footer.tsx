import { Logo } from "./logo";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-muted/30">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-center sm:flex-row sm:px-6 sm:text-left">
        <div className="flex items-center gap-2">
          <Logo className="h-5 w-5" />
          <span className="text-sm font-semibold">
            Swift<span className="text-primary">PDF</span>
          </span>
          <span className="text-xs text-muted-foreground">
            — fast, private PDF tools
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>100% in-browser processing</span>
          <span aria-hidden="true" className="hidden sm:inline">·</span>
          <span>No sign-up</span>
          <span aria-hidden="true" className="hidden sm:inline">·</span>
          <span>Unlimited files</span>
          <span aria-hidden="true" className="hidden sm:inline">·</span>
          <span>Free forever</span>
        </div>
      </div>
    </footer>
  );
}
