/**
 * MeshBackdrop — original, CSS-only gradient mesh for the hero.
 * No image assets, no network requests; adapts to light/dark via tokens.
 * Purely decorative (aria-hidden, pointer-events-none).
 */
export function MeshBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-[520px] overflow-hidden"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(52% 58% at 18% 0%, color-mix(in oklab, var(--grad-from) 14%, transparent), transparent 70%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(46% 52% at 82% 4%, color-mix(in oklab, var(--grad-to) 13%, transparent), transparent 72%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(38% 42% at 55% 14%, color-mix(in oklab, var(--cat-convert) 7%, transparent), transparent 75%)",
        }}
      />
      {/* fine grid — very low contrast, brand-technical feel */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--border-subtle) 1px, transparent 1px), linear-gradient(to bottom, var(--border-subtle) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage:
            "radial-gradient(70% 60% at 50% 0%, black 0%, transparent 78%)",
          WebkitMaskImage:
            "radial-gradient(70% 60% at 50% 0%, black 0%, transparent 78%)",
        }}
      />
    </div>
  );
}
