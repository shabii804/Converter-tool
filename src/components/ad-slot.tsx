/**
 * AdSlot — fixed-height advertising slot. DISABLED BY DEFAULT: it renders
 * nothing (and costs no layout bytes) until NEXT_PUBLIC_ADSENSE_CLIENT is
 * configured. When enabled, the fixed height prevents layout shift (CLS)
 * because the space is reserved before the ad loads.
 */
export function AdSlot({
  height,
  slot,
  label = "Advertisement",
}: {
  /** fixed height in px — reserved even while the ad loads (no CLS) */
  height: number;
  slot: string;
  label?: string;
}) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  if (!client) return null;
  return (
    <aside
      aria-label={label}
      style={{ height, minHeight: height }}
      className="my-8 flex w-full items-center justify-center overflow-hidden rounded-card border border-border-subtle bg-surface-1"
      data-ad-slot-name={slot}
    >
      <ins
        className="adsbygoogle block w-full"
        style={{ display: "block", height }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="horizontal"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
