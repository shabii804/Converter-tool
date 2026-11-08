import { create } from "zustand";
import { TOOLS, toolById, type ToolCategory } from "./tools";
import type { Lang } from "./i18n";

export interface StoreFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
}

export interface ResultFile {
  id: string;
  name: string;
  blob: Blob;
  size: number;
  kind: string;
}

export interface FileJob {
  fileId: string;
  status: "queued" | "processing" | "done" | "error";
  progress: number;
}

export interface RunStats {
  toolName: string;
  fileCount: number;
  inputBytes: number;
  outputBytes: number;
  ms: number;
  note?: string;
}

export type View = "home" | "tool" | "processing" | "done";

export interface Suggestion {
  primary: string;
  alternatives: string[];
  /** i18n key — rendered through the copy dictionary */
  reasonKey: "combine" | "convert" | "one";
  count: number;
}

interface AppState {
  view: View;
  toolId: string | null;
  files: StoreFile[];
  suggestion: Suggestion | null;
  results: ResultFile[];
  jobs: Record<string, FileJob>;
  stats: RunStats | null;
  errorMsg: string | null;
  paletteOpen: boolean;
  /** preset seeded by intent pages (consumed once by Workspace on mount) */
  pendingPreset: Record<string, unknown> | null;

  /** UI language (persisted locally) */
  lang: Lang;
  /** tool-grid filter: category, favorites, or all */
  toolFilter: ToolCategory | "all" | "favorites";
  /** favorite tool ids (persisted locally) */
  favorites: string[];
  /** recently used tool ids, most recent first (persisted locally) */
  recent: string[];

  setView: (v: View) => void;
  openTool: (id: string) => void;
  goHome: () => void;
  addFiles: (files: File[]) => { added: number; rejected: number };
  removeFile: (id: string) => void;
  clearFiles: () => void;
  setSuggestion: (s: Suggestion | null) => void;
  setJobs: (jobs: Record<string, FileJob>) => void;
  updateJob: (fileId: string, patch: Partial<FileJob>) => void;
  setResults: (r: ResultFile[]) => void;
  setStats: (s: RunStats) => void;
  setError: (e: string | null) => void;
  setPalette: (open: boolean) => void;
  setLang: (l: Lang) => void;
  setToolFilter: (f: ToolCategory | "all" | "favorites") => void;
  toggleFavorite: (id: string) => void;
  pushRecent: (id: string) => void;
  clearRecent: () => void;
  /** read persisted UI prefs from localStorage (call once after mount) */
  hydrateLocal: () => void;
  resetAll: () => void;
  /** keep tool, clear results/files for another run */
  nextRun: () => void;
}

const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

/* ---- local-only persistence (never transmitted; rule 5) ---- */
const LS = {
  lang: "swiftpdf.lang",
  favs: "swiftpdf.favs",
  recent: "swiftpdf.recent",
} as const;

function readLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLS(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — prefs stay in-memory */
  }
}

function detectToolForFiles(files: File[]): Suggestion | null {
  if (files.length === 0) return null;
  const pdfs = files.filter((f) => f.type === "application/pdf");
  const imgs = files.filter((f) => f.type.startsWith("image/"));

  if (pdfs.length >= 2) {
    return {
      primary: "merge",
      alternatives: ["compress", "split", "rotate"],
      reasonKey: "combine",
      count: pdfs.length,
    };
  }
  if (imgs.length >= 1 && pdfs.length === 0) {
    return {
      primary: "jpg-to-pdf",
      alternatives: [],
      reasonKey: "convert",
      count: imgs.length,
    };
  }
  if (pdfs.length === 1) {
    return {
      primary: "compress",
      alternatives: ["split", "organize", "pdf-to-jpg", "protect"],
      reasonKey: "one",
      count: 1,
    };
  }
  return null;
}

export const useStore = create<AppState>((set, get) => ({
  view: "home",
  toolId: null,
  files: [],
  suggestion: null,
  results: [],
  jobs: {},
  stats: null,
  errorMsg: null,
  paletteOpen: false,
  pendingPreset: null,

  lang: "en",
  toolFilter: "all",
  favorites: [],
  recent: [],

  setView: (v) => set({ view: v }),

  openTool: (id) => {
    const tool = toolById(id);
    if (!tool) return;
    get().pushRecent(id);
    // keep files that already match this tool (drop-first flow)
    const kept = get().files.filter((f) => matchesTool(f.file, tool.accept, tool.input));
    const sameTool = get().toolId === id;
    set({
      toolId: id,
      view: "tool",
      files: sameTool ? get().files : kept,
      suggestion: null,
      results: [],
      jobs: {},
      stats: null,
      errorMsg: null,
    });
  },

  goHome: () =>
    set({
      view: "home",
      toolId: null,
      files: [],
      suggestion: null,
      results: [],
      jobs: {},
      stats: null,
      errorMsg: null,
    }),

  addFiles: (incoming) => {
    const tool = toolById(get().toolId);
    let added = 0;
    let rejected = 0;
    const next: StoreFile[] = [...get().files];

    for (const f of incoming) {
      if (tool) {
        const ok = matchesTool(f, tool.accept, tool.input);
        if (!ok) {
          rejected++;
          continue;
        }
        if (next.length >= tool.maxFiles) {
          rejected++;
          continue;
        }
      }
      next.push({
        id: uid(),
        file: f,
        name: f.name,
        size: f.size,
        type: f.type,
      });
      added++;
    }

    if (added > 0) {
      set({ files: next });
      // update suggestion on home
      if (!tool && get().view === "home") {
        set({ suggestion: detectToolForFiles(next.map((s) => s.file)) });
      }
    }
    return { added, rejected };
  },

  removeFile: (id) => {
    const next = get().files.filter((f) => f.id !== id);
    set({ files: next });
    if (get().view === "home" && next.length > 0) {
      set({ suggestion: detectToolForFiles(next.map((s) => s.file)) });
    } else if (next.length === 0) {
      set({ suggestion: null });
    }
  },

  clearFiles: () => set({ files: [], suggestion: null }),

  setSuggestion: (s) => set({ suggestion: s }),
  setJobs: (jobs) => set({ jobs }),
  updateJob: (fileId, patch) =>
    set((st) => ({
      jobs: {
        ...st.jobs,
        [fileId]: { ...st.jobs[fileId], ...patch },
      },
    })),
  setResults: (r) => set({ results: r }),
  setStats: (s) => set({ stats: s }),
  setError: (e) => set({ errorMsg: e }),
  setPalette: (open) => set({ paletteOpen: open }),

  setLang: (l) => {
    writeLS(LS.lang, l);
    set({ lang: l });
  },

  setToolFilter: (f) => set({ toolFilter: f }),

  toggleFavorite: (id) =>
    set((st) => {
      const favorites = st.favorites.includes(id)
        ? st.favorites.filter((x) => x !== id)
        : [...st.favorites, id];
      writeLS(LS.favs, favorites);
      return { favorites };
    }),

  pushRecent: (id) =>
    set((st) => {
      if (!toolById(id)) return {};
      const recent = [id, ...st.recent.filter((x) => x !== id)].slice(0, 6);
      writeLS(LS.recent, recent);
      return { recent };
    }),

  clearRecent: () => {
    writeLS(LS.recent, []);
    set({ recent: [] });
  },

  hydrateLocal: () =>
    set({
      lang: readLS<Lang>(LS.lang, "en"),
      favorites: readLS<string[]>(LS.favs, []),
      recent: readLS<string[]>(LS.recent, []),
    }),

  resetAll: () =>
    set({
      view: "home",
      toolId: null,
      files: [],
      suggestion: null,
      results: [],
      jobs: {},
      stats: null,
      errorMsg: null,
    }),

  nextRun: () => {
    const id = get().toolId;
    set({
      view: "tool",
      files: [],
      results: [],
      jobs: {},
      stats: null,
      errorMsg: null,
      suggestion: null,
    });
    if (!id) set({ view: "home" });
  },
}));

export function matchesTool(f: File, accept: string, input: string): boolean {
  if (input === "none") return false;
  // open image inputs (image/*) only for tools that declare them;
  // jpg-to-pdf keeps its historical strict jpeg/png behavior
  if (accept === "image/*") return f.type.startsWith("image/");
  if (input === "image") {
    return f.type === "image/jpeg" || f.type === "image/png";
  }
  if (input === "docx") {
    return (
      f.name.toLowerCase().endsWith(".docx") ||
      f.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
  }
  if (accept.includes(f.type)) return true;
  if (input === "pdf" && f.name.toLowerCase().endsWith(".pdf")) return true;
  return false;
}

export function autoToolIdFor(files: File[]): string | null {
  if (files.length === 0) return null;
  const s = detectToolForFiles(files);
  return s ? s.primary : null;
}

export { TOOLS };
