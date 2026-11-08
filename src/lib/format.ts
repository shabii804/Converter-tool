export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const idx = Math.min(i, sizes.length - 1);
  const val = bytes / Math.pow(k, idx);
  return `${val.toFixed(idx === 0 ? 0 : decimals)} ${sizes[idx]}`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)} s`;
  const m = Math.floor(ms / 60000);
  const s = Math.round((ms % 60000) / 1000);
  return `${m}m ${s}s`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function baseName(name: string): string {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
}

export function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(i + 1).toLowerCase() : "";
}

/** parse "1-3, 5, 8-10" against total page count */
export function parseRanges(
  spec: string,
  total: number
): { ok: boolean; pages: number[][]; error?: string } {
  const groups: number[][] = [];
  const parts = spec
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0)
    return { ok: false, pages: [], error: "Enter at least one range" };
  for (const part of parts) {
    const m = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (m) {
      let a = parseInt(m[1], 10);
      let b = parseInt(m[2], 10);
      if (a > b) [a, b] = [b, a];
      if (a < 1 || b > total) {
        return {
          ok: false,
          pages: [],
          error: `Range ${part} is outside 1–${total}`,
        };
      }
      const g: number[] = [];
      for (let i = a; i <= b; i++) g.push(i);
      groups.push(g);
    } else if (/^\d+$/.test(part)) {
      const n = parseInt(part, 10);
      if (n < 1 || n > total) {
        return {
          ok: false,
          pages: [],
          error: `Page ${n} is outside 1–${total}`,
        };
      }
      groups.push([n]);
    } else {
      return {
        ok: false,
        pages: [],
        error: `"${part}" is not a valid page or range`,
      };
    }
  }
  return { ok: true, pages: groups };
}

export function canRunInBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}
