import { type ToolCategory } from "@/lib/tools";

/** Category → token mapping. Accents come from src/design/tokens.css. */
export const CATEGORY_META: Record<
  ToolCategory,
  { label: string; accentVar: string; tintVar: string; description: string }
> = {
  core: {
    label: "Core",
    accentVar: "--cat-core",
    tintVar: "--cat-core-tint",
    description: "Structure and organise documents",
  },
  convert: {
    label: "Convert",
    accentVar: "--cat-convert",
    tintVar: "--cat-convert-tint",
    description: "Move between PDF and other formats",
  },
  edit: {
    label: "Edit",
    accentVar: "--cat-edit",
    tintVar: "--cat-edit-tint",
    description: "Annotate, stamp and adjust pages",
  },
  security: {
    label: "Security",
    accentVar: "--cat-security",
    tintVar: "--cat-security-tint",
    description: "Encrypt and unlock documents",
  },
};

export const categoryMeta = (c: ToolCategory) => CATEGORY_META[c];
