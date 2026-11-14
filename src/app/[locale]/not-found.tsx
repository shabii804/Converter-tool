import Link from "next/link";

export default function LocaleNotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">404</p>
      <h1 className="text-h2 font-bold tracking-heading">This page does not exist</h1>
      <p className="max-w-md text-sm text-fg-muted">
        The tool or page you were looking for is not here. All PrivyPDF tools
        run entirely in your browser — nothing you do here is ever uploaded.
      </p>
      <Link
        href="/en"
        className="mt-2 rounded-control bg-gradient-brand px-6 py-3 text-sm font-semibold text-white shadow-glow outline-none transition-[filter] hover:brightness-105 focus-visible:ring-2 focus-visible:ring-ring"
      >
        Go to PrivyPDF
      </Link>
    </div>
  );
}
