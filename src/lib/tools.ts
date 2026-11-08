import type { LucideIcon } from "lucide-react";
import {
  Combine,
  Scissors,
  FileDown,
  LayoutGrid,
  RotateCw,
  Image as ImageIcon,
  Images,
  FileText,
  Table,
  Presentation,
  FileType2,
  Droplets,
  Hash,
  Crop,
  Lock,
  Unlock,
} from "lucide-react";

export type ToolCategory = "core" | "convert" | "edit" | "security";

export interface ToolDef {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: ToolCategory;
  icon: LucideIcon;
  /** accepted mime / extension spec for input */
  accept: string;
  /** minimum number of input files */
  minFiles: number;
  /** maximum number of input files (Infinity = unlimited) */
  maxFiles: number;
  /** whether the input can be multiple PDF files */
  multiPdf?: boolean;
  /** input kind */
  input: "pdf" | "image" | "docx";
  /** needs per-page thumbnails */
  needsThumbs?: boolean;
  /** does the tool run with zero user options (true one-click) */
  zeroOption?: boolean;
  badge?: string;
  /** extra search terms for the local grid search (UI only) */
  keywords?: string;
}

export const CATEGORIES: { id: ToolCategory | "all"; label: string }[] = [
  { id: "all", label: "All tools" },
  { id: "core", label: "Core" },
  { id: "convert", label: "Convert" },
  { id: "edit", label: "Edit" },
  { id: "security", label: "Security" },
];

export const TOOLS: ToolDef[] = [
  {
    id: "merge",
    name: "Merge PDF",
    tagline: "Combine files into one",
    description: "Combine multiple PDFs into a single document, in your order.",
    keywords: "combine join unite concatenate",
    category: "core",
    icon: Combine,
    accept: "application/pdf",
    minFiles: 2,
    maxFiles: 100,
    multiPdf: true,
    input: "pdf",
    zeroOption: true,
    badge: "Popular",
  },
  {
    id: "split",
    name: "Split PDF",
    tagline: "Extract the pages you need",
    description: "Split one PDF into several files by ranges, chunks or selection.",
    keywords: "extract pages cut separate",
    category: "core",
    icon: Scissors,
    accept: "application/pdf",
    minFiles: 1,
    maxFiles: 1,
    input: "pdf",
    needsThumbs: true,
  },
  {
    id: "compress",
    name: "Compress PDF",
    tagline: "Shrink file size",
    description: "Reduce PDF size while keeping quality. Pick your balance.",
    keywords: "reduce shrink optimize size",
    category: "core",
    icon: FileDown,
    accept: "application/pdf",
    minFiles: 1,
    maxFiles: 20,
    input: "pdf",
    badge: "Popular",
  },
  {
    id: "organize",
    name: "Organize Pages",
    tagline: "Sort, delete, rotate pages",
    description: "Visually reorder, delete or rotate pages with live thumbnails.",
    keywords: "reorder arrange sort delete",
    category: "core",
    icon: LayoutGrid,
    accept: "application/pdf",
    minFiles: 1,
    maxFiles: 1,
    input: "pdf",
    needsThumbs: true,
    badge: "Visual",
  },
  {
    id: "rotate",
    name: "Rotate PDF",
    tagline: "Fix page orientation",
    description: "Rotate every page 90°, 180° or 270° in one click.",
    keywords: "orientation landscape portrait turn",
    category: "core",
    icon: RotateCw,
    accept: "application/pdf",
    minFiles: 1,
    maxFiles: 20,
    input: "pdf",
    zeroOption: false,
  },
  {
    id: "pdf-to-jpg",
    name: "PDF to JPG",
    tagline: "Every page as an image",
    description: "Turn each PDF page into a high-quality JPG image.",
    keywords: "image export picture jpeg convert",
    category: "convert",
    icon: ImageIcon,
    accept: "application/pdf",
    minFiles: 1,
    maxFiles: 10,
    input: "pdf",
  },
  {
    id: "jpg-to-pdf",
    name: "JPG to PDF",
    tagline: "Images into a document",
    description: "Convert JPG or PNG images into one tidy PDF, in your order.",
    keywords: "image picture photo png convert",
    category: "convert",
    icon: Images,
    accept: "image/jpeg,image/png",
    minFiles: 1,
    maxFiles: 200,
    input: "image",
    badge: "Popular",
  },
  {
    id: "pdf-to-word",
    name: "PDF to Word",
    tagline: "Editable .docx text",
    description: "Extract the text layer into an editable Word document.",
    keywords: "docx editable text word convert",
    category: "convert",
    icon: FileText,
    accept: "application/pdf",
    minFiles: 1,
    maxFiles: 5,
    input: "pdf",
  },
  {
    id: "pdf-to-excel",
    name: "PDF to Excel",
    tagline: "Text rows in .xlsx",
    description: "Pull text lines into a spreadsheet you can sort and edit.",
    keywords: "xlsx spreadsheet excel rows convert",
    category: "convert",
    icon: Table,
    accept: "application/pdf",
    minFiles: 1,
    maxFiles: 5,
    input: "pdf",
  },
  {
    id: "pdf-to-ppt",
    name: "PDF to PPT",
    tagline: "Slides ready to present",
    description: "Each page becomes a full-slide image in a PowerPoint file.",
    keywords: "powerpoint slides pptx presentation convert",
    category: "convert",
    icon: Presentation,
    accept: "application/pdf",
    minFiles: 1,
    maxFiles: 5,
    input: "pdf",
  },
  {
    id: "word-to-pdf",
    name: "Word to PDF",
    tagline: ".docx to clean PDF",
    description: "Convert Word documents into share-ready PDF files.",
    keywords: "docx word share convert",
    category: "convert",
    icon: FileType2,
    accept: "application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx",
    minFiles: 1,
    maxFiles: 10,
    input: "docx",
  },
  {
    id: "watermark",
    name: "Watermark",
    tagline: "Brand or protect pages",
    description: "Stamp text over every page with live preview and controls.",
    keywords: "stamp brand text overlay",
    category: "edit",
    icon: Droplets,
    accept: "application/pdf",
    minFiles: 1,
    maxFiles: 10,
    input: "pdf",
  },
  {
    id: "page-numbers",
    name: "Page Numbers",
    tagline: "Number every page",
    description: "Add page numbers in any position and format you like.",
    keywords: "numbering folio paginate insert",
    badge: "New",
    category: "edit",
    icon: Hash,
    accept: "application/pdf",
    minFiles: 1,
    maxFiles: 10,
    input: "pdf",
  },
  {
    id: "crop",
    name: "Crop PDF",
    tagline: "Trim page margins",
    description: "Visually trim white edges and margins across all pages.",
    keywords: "trim margins resize edges",
    badge: "New",
    category: "edit",
    icon: Crop,
    accept: "application/pdf",
    minFiles: 1,
    maxFiles: 10,
    input: "pdf",
    needsThumbs: true,
  },
  {
    id: "protect",
    name: "Protect PDF",
    tagline: "Encrypt with password",
    description: "Add a password so only the right people can open your PDF.",
    keywords: "password encrypt lock secure",
    category: "security",
    icon: Lock,
    accept: "application/pdf",
    minFiles: 1,
    maxFiles: 10,
    input: "pdf",
  },
  {
    id: "unlock",
    name: "Unlock PDF",
    tagline: "Remove a known password",
    description: "You know the password — remove it and save a free copy.",
    keywords: "password remove decrypt open",
    category: "security",
    icon: Unlock,
    accept: "application/pdf",
    minFiles: 1,
    maxFiles: 10,
    input: "pdf",
  },
];

export const toolById = (id: string | null | undefined) =>
  TOOLS.find((t) => t.id === id) ?? null;

export const toolsByCategory = (cat: ToolCategory | "all") =>
  cat === "all" ? TOOLS : TOOLS.filter((t) => t.category === cat);
