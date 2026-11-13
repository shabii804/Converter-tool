/**
 * ID-photo preset data — single source shared by the tool UI, the
 * workspace option mapping (buildOptions) and the engine (extra-engine).
 * Pure data + pure math, no dependencies.
 *
 * Sizes are real published standards:
 * - 35×45 mm  — ICAO/EU passport (also Pakistan passport & CNIC, NADRA)
 * - 51×51 mm  — US 2×2 inch (US passport/visa) and India 2×2 inch (OCI/visa)
 * - 33×48 mm  — Schengen/China visa, 30×40, 25×35 (stamp), 40×50 generic
 */

export interface IdpPreset {
  key: string;
  /** mm */
  w: number;
  /** mm */
  h: number;
  name: string;
  note: string;
}

export const IDP_PRESETS: IdpPreset[] = [
  { key: "p35x45", w: 35, h: 45, name: "Passport (ICAO)", note: "most countries" },
  { key: "p51x51", w: 51, h: 51, name: "US 2 × 2 in", note: "US passport & visa" },
  { key: "pin2x2", w: 51, h: 51, name: "India 2 × 2 in", note: "OCI & visa" },
  { key: "ppk3545", w: 35, h: 45, name: "Pakistan", note: "passport & CNIC" },
  { key: "p33x48", w: 33, h: 48, name: "Schengen visa", note: "33 × 48 mm" },
  { key: "p25x35", w: 25, h: 35, name: "Stamp size", note: "small prints" },
  { key: "p30x40", w: 30, h: 40, name: "30 × 40 mm", note: "generic" },
  { key: "p40x50", w: 40, h: 50, name: "40 × 50 mm", note: "generic" },
];

export const IDP_CUSTOM_KEY = "custom";

/** print sheet papers, in mm */
export const IDP_PAPERS = {
  "10x15": { w: 100, h: 150, label: "10 × 15 cm" },
  "4x6": { w: 101.6, h: 152.4, label: "4 × 6 in" },
  a4: { w: 210, h: 297, label: "A4" },
} as const;

export type IdpPaper = keyof typeof IDP_PAPERS;

const IN_TO_MM = 25.4;
const clampMm = (v: number) =>
  Math.min(210, Math.max(15, Math.round(v * 10) / 10));

/** resolved mm size for the current UI state (preset or custom inputs) */
export function idpMmSize(
  presetKey: string,
  customW: number,
  customH: number,
  unit: "mm" | "in"
): { w: number; h: number } {
  if (presetKey === IDP_CUSTOM_KEY) {
    return {
      w: clampMm(unit === "in" ? customW * IN_TO_MM : customW),
      h: clampMm(unit === "in" ? customH * IN_TO_MM : customH),
    };
  }
  const p = IDP_PRESETS.find((x) => x.key === presetKey) ?? IDP_PRESETS[0];
  return { w: p.w, h: p.h };
}

/** pixels at 300 DPI */
export const idpPx = (mm: number) => Math.round((mm / 25.4) * 300);

/** copy grid for a sheet — same math the engine uses to lay out copies */
export function idpSheetGrid(
  photoW: number,
  photoH: number,
  paperW: number,
  paperH: number,
  gap = 3
) {
  const cols = Math.max(1, Math.floor((paperW + gap) / (photoW + gap)));
  const rows = Math.max(1, Math.floor((paperH + gap) / (photoH + gap)));
  return { cols, rows, gap };
}
