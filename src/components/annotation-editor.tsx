"use client";

/**
 * AnnotationEditor — shared interactive editor for Edit PDF / Sign PDF /
 * Redact PDF. Renders pages with pdf.js, keeps every item in PDF user
 * space (rotation-proof via viewport transforms), and emits engine-ready
 * options through onChange(). 100% client-side.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MousePointer2,
  Type as TypeIcon,
  Highlighter,
  Square,
  Circle,
  Slash,
  PenTool,
  ImagePlus,
  Signature,
  EyeOff,
  Undo2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  TriangleAlert,
} from "lucide-react";
import "@fontsource/caveat";
import { Button } from "@/components/kit/button";
import { notify } from "@/components/kit/toast";
import { Modal, ModalContent } from "@/components/kit/modal";
import { cn } from "@/lib/utils";

export type EditorMode = "edit" | "sign" | "redact";

/** items are stored in PDF user space (origin bottom-left, y up) */
interface EditorItem {
  id: string;
  page: number;
  kind:
    | "text"
    | "highlight"
    | "rect"
    | "ellipse"
    | "line"
    | "draw"
    | "image"
    | "signature"
    | "redact";
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  text?: string;
  size?: number;
  color?: string;
  opacity?: number;
  font?: "helvetica" | "helvetica-bold" | "times" | "courier";
  thickness?: number;
  points?: { x: number; y: number }[];
  dataUrl?: string;
  rotate?: number;
}

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const INK_COLORS = ["#111827", "#1D4ED8", "#DC2626", "#16A34A"];
const HIGHLIGHT_COLOR = "#FDE047";

interface PageMeta {
  vpt1: any; // pdf.js viewport at scale 1 (rotation applied)
  width1: number;
  height1: number;
}

export function AnnotationEditor({
  file,
  mode,
  onChange,
}: {
  file: File;
  mode: EditorMode;
  onChange: (engineOpts: Record<string, unknown>, count: number) => void;
}) {
  const [pageMetas, setPageMetas] = useState<PageMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [items, setItems] = useState<EditorItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<
    "select" | "text" | "highlight" | "rect" | "ellipse" | "line" | "draw" | "image" | "sig" | "redact"
  >(mode === "redact" ? "redact" : mode === "sign" ? "sig" : "select");
  const [color, setColor] = useState(mode === "redact" ? "#000000" : "#1D4ED8");
  const [renderScale, setRenderScale] = useState(0); // 0 = not computed yet
  const [canvasDims, setCanvasDims] = useState<{ w: number; h: number } | null>(null);
  const [draft, setDraft] = useState<
    | null
    | { startV: { x: number; y: number }; curV: { x: number; y: number }; points?: { x: number; y: number }[] }
  >(null);
  const [sigModalOpen, setSigModalOpen] = useState(false);
  const [history, setHistory] = useState<EditorItem[][]>([]);
  const [imgCounter, setImgCounter] = useState(0);

  const docRef = useRef<any>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<null | {
    id: string;
    startV: { x: number; y: number };
    orig: EditorItem;
  }>(null);
  const historyPush = useCallback((prev: EditorItem[]) => {
    setHistory((h) => [...h.slice(-29), prev]);
  }, []);

  /* ---------- load document ---------- */
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setLoadError(null);
    setItems([]);
    setSelectedId(null);
    setPageIndex(0);
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const bytes = new Uint8Array(await file.arrayBuffer());
        const doc = await pdfjs.getDocument({ data: bytes }).promise;
        if (!alive) return;
        const metas: PageMeta[] = [];
        for (let p = 1; p <= doc.numPages; p++) {
          const pg = await doc.getPage(p);
          const vpt1 = pg.getViewport({ scale: 1 });
          metas.push({ vpt1, width1: vpt1.width, height1: vpt1.height });
        }
        docRef.current = doc;
        setPageMetas(metas);
        setLoading(false);
      } catch (err: any) {
        if (!alive) return;
        const msg = String(err?.message ?? err);
        setLoadError(
          /password/i.test(msg)
            ? "This PDF is password-protected. Unlock it first, then edit it here."
            : `"${file.name}" could not be opened as a PDF.`
        );
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
      docRef.current = null;
    };
  }, [file]);

  /* ---------- render current page ---------- */
  const meta = pageMetas[pageIndex];

  // compute render scale from container width (fit width, DPR-aware)
  useEffect(() => {
    if (!meta) return;
    const compute = () => {
      const cw = wrapRef.current?.clientWidth ?? 720;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const s = (cw * dpr) / meta.width1;
      setRenderScale(Math.max(0.5, Math.min(2.5, s)));
    };
    compute();
    const ro = new ResizeObserver(() => compute());
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [meta]);

  useEffect(() => {
    if (!meta || !renderScale || !canvasRef.current) return;
    let alive = true;
    (async () => {
      try {
        const page = await docRef.current.getPage(pageIndex + 1);
        const vpt = page.getViewport({ scale: renderScale });
        const canvas = canvasRef.current!;
        canvas.width = Math.max(1, Math.floor(vpt.width));
        canvas.height = Math.max(1, Math.floor(vpt.height));
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport: vpt } as any).promise;
        if (!alive) return;
        setCanvasDims({ w: canvas.width, h: canvas.height });
      } catch {
        /* page render cancelled — ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, [meta, renderScale, pageIndex]);

  /* ---------- coordinate helpers (pdf space ⇄ canvas px) ---------- */
  const toCanvas = useCallback(
    (px: number, py: number) => {
      if (!meta) return { x: 0, y: 0 };
      const [vx, vy] = meta.vpt1.convertToViewportPoint(px, py);
      return { x: vx * renderScale, y: vy * renderScale };
    },
    [meta, renderScale]
  );

  const toPdf = useCallback(
    (cx: number, cy: number) => {
      if (!meta) return { x: 0, y: 0 };
      const [px, py] = meta.vpt1.convertToPdfPoint(cx / renderScale, cy / renderScale);
      return { x: px, y: py };
    },
    [meta, renderScale]
  );

  /** angle (deg) of view-space +x in pdf space — for text/image on rotated pages */
  const viewAngleDeg = useCallback(
    (pdfAnchor: { x: number; y: number }) => {
      if (!meta) return 0;
      const a = meta.vpt1.convertToPdfPoint(
        pdfAnchor.x, pdfAnchor.y
      );
      // map a tiny view-space step from the anchor's view position
      const v = meta.vpt1.convertToViewportPoint(pdfAnchor.x, pdfAnchor.y);
      const v2 = { x: v[0] + 5, y: v[1] };
      const p2 = meta.vpt1.convertToPdfPoint(v2.x, v2.y);
      void a;
      return (Math.atan2(p2[1] - pdfAnchor.y, p2[0] - pdfAnchor.x) * 180) / Math.PI;
    },
    [meta]
  );

  /* ---------- emit engine options ---------- */
  const serialize = useCallback(
    async (currentItems: EditorItem[]) => {
      if (mode === "redact") {
        const boxes = currentItems
          .filter((it) => it.kind === "redact")
          .map((it) => ({ page: it.page, x: it.x!, y: it.y!, w: it.w!, h: it.h! }));
        const scope = (document.getElementById("redact-scope-all") as HTMLInputElement)?.checked
          ? "all"
          : "affected";
        onChange({ boxes, scope }, boxes.length);
        return;
      }
      const out: Record<string, unknown>[] = [];
      for (const it of currentItems) {
        if (it.kind === "text") {
          out.push({
            page: it.page,
            type: "text",
            text: it.text,
            x: it.x,
            y: it.y,
            size: it.size,
            color: it.color,
            font: it.font ?? "helvetica",
            rotate: it.rotate ?? 0,
            opacity: 1,
          });
        } else if (it.kind === "highlight") {
          out.push({
            page: it.page,
            type: "highlight",
            x: it.x,
            y: it.y,
            w: it.w,
            h: it.h,
            color: it.color ?? HIGHLIGHT_COLOR,
            opacity: 0.35,
          });
        } else if (it.kind === "rect" || it.kind === "ellipse") {
          out.push({
            page: it.page,
            type: it.kind,
            x: it.x,
            y: it.y,
            w: it.w,
            h: it.h,
            color: it.color,
            thickness: it.thickness ?? 2,
          });
        } else if (it.kind === "line") {
          const pts = it.points ?? [];
          if (pts.length === 2) {
            out.push({
              page: it.page,
              type: "line",
              x1: pts[0].x,
              y1: pts[0].y,
              x2: pts[1].x,
              y2: pts[1].y,
              color: it.color,
              thickness: it.thickness ?? 2,
            });
          }
        } else if (it.kind === "draw") {
          out.push({
            page: it.page,
            type: "draw",
            points: it.points,
            color: it.color,
            thickness: it.thickness ?? 2,
          });
        } else if (it.kind === "image" || it.kind === "signature") {
          out.push({
            page: it.page,
            type: "image",
            dataUrl: it.dataUrl,
            x: it.x,
            y: it.y,
            w: it.w,
            h: it.h,
            rotate: it.rotate ?? 0,
            opacity: 1,
          });
        }
      }
      onChange({ items: out }, out.length);
    },
    [mode, onChange]
  );

  useEffect(() => {
    if (loading || loadError) return;
    void serialize(items);
  }, [items, loading, loadError, serialize]);

  /* ---------- item mutations ---------- */
  const addItems = useCallback(
    (next: EditorItem[]) => {
      setItems((prev) => {
        historyPush(prev);
        return [...prev, ...next];
      });
    },
    [historyPush]
  );

  const updateItem = useCallback(
    (id: string, patch: Partial<EditorItem>, recordHistory = true) => {
      setItems((prev) => {
        if (recordHistory) historyPush(prev);
        return prev.map((it) => (it.id === id ? { ...it, ...patch } : it));
      });
    },
    [historyPush]
  );

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    setItems((prev) => {
      historyPush(prev);
      return prev.filter((it) => it.id !== selectedId);
    });
    setSelectedId(null);
  }, [selectedId, historyPush]);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (!h.length) return h;
      const last = h[h.length - 1];
      setItems(last);
      setSelectedId(null);
      return h.slice(0, -1);
    });
  }, []);

  /* ---------- pointer interactions ---------- */
  const pointerPos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const hitTest = (v: { x: number; y: number }): EditorItem | null => {
    const pageItems = items.filter((it) => it.page === pageIndex);
    for (let i = pageItems.length - 1; i >= 0; i--) {
      const it = pageItems[i];
      const box = itemViewBox(it);
      if (
        box &&
        v.x >= box.x - 6 &&
        v.x <= box.x + box.w + 6 &&
        v.y >= box.y - 6 &&
        v.y <= box.y + box.h + 6
      ) {
        return it;
      }
    }
    return null;
  };

  /** bounding box in canvas px for an item on the current page */
  function itemViewBox(it: EditorItem): { x: number; y: number; w: number; h: number } | null {
    if (it.page !== pageIndex) return null;
    if (it.kind === "line" || it.kind === "draw") {
      const pts = (it.points ?? []).map((p) => toCanvas(p.x, p.y));
      if (!pts.length) return null;
      const xs = pts.map((p) => p.x);
      const ys = pts.map((p) => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      return { x: minX, y: minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY };
    }
    if (it.x === undefined || it.y === undefined) return null;
    if (it.kind === "text") {
      const a = toCanvas(it.x, it.y);
      const sizePx = (it.size ?? 14) * renderScale;
      const w = (it.text?.length ?? 0) * sizePx * 0.55 || sizePx * 4;
      return { x: a.x, y: a.y - sizePx, w: Math.max(w, 24), h: sizePx * 1.3 };
    }
    const a = toCanvas(it.x!, it.y! + (it.h ?? 0));
    const b = toCanvas(it.x! + (it.w ?? 0), it.y!);
    return {
      x: Math.min(a.x, b.x),
      y: Math.min(a.y, b.y),
      w: Math.abs(b.x - a.x),
      h: Math.abs(b.y - a.y),
    };
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (loading || !meta) return;
    const v = pointerPos(e);
    if (tool === "select") {
      const hit = hitTest(v);
      setSelectedId(hit?.id ?? null);
      if (hit) {
        dragRef.current = { id: hit.id, startV: v, orig: { ...hit } };
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      }
      return;
    }
    if (tool === "text") {
      const p = toPdf(v.x, v.y);
      const angle = viewAngleDeg(p);
      const item: EditorItem = {
        id: uid(),
        page: pageIndex,
        kind: "text",
        x: p.x,
        y: p.y,
        text: "New text",
        size: 14,
        color,
        font: "helvetica",
        rotate: angle,
      };
      addItems([item]);
      setSelectedId(item.id);
      setTool("select");
      return;
    }
    if (tool === "sig") {
      setSigModalOpen(true);
      setTool("select");
      return;
    }
    if (tool === "image") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/png,image/jpeg,image/webp";
      input.onchange = async () => {
        const f = input.files?.[0];
        if (!f) return;
        try {
          const dataUrl = await fileToDataUrlPng(f);
          placeImage(dataUrl, v);
        } catch {
          notify.error("Could not read that image file");
        }
      };
      input.click();
      setTool("select");
      return;
    }
    // drag-creation tools
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    if (tool === "draw") {
      const p = toPdf(v.x, v.y);
      setDraft({ startV: v, curV: v, points: [p] });
    } else {
      setDraft({ startV: v, curV: v });
    }
  };

  const placeImage = async (dataUrl: string, v: { x: number; y: number }) => {
    const bmp = await createImageBitmap(await (await fetch(dataUrl)).blob());
    const aspect = bmp.width / bmp.height;
    bmp.close();
    const wPdf = 160;
    const hPdf = wPdf / aspect;
    const center = toPdf(v.x, v.y);
    const anchor = toPdf(v.x - (wPdf * renderScale) / 2, v.y + (hPdf * renderScale) / 2);
    const angle = viewAngleDeg(anchor);
    const item: EditorItem = {
      id: uid(),
      page: pageIndex,
      kind: mode === "sign" ? "signature" : "image",
      dataUrl,
      x: anchor.x,
      y: anchor.y,
      w: wPdf,
      h: hPdf,
      rotate: angle,
      opacity: 1,
    };
    void center;
    addItems([item]);
    setSelectedId(item.id);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const v = pointerPos(e);
    if (dragRef.current) {
      const { id, orig } = dragRef.current;
      if (orig.kind === "line" || orig.kind === "draw") {
        const pts = (orig.points ?? []).map((p) => {
          const c = toCanvas(p.x, p.y);
          return toPdf(c.x + (v.x - dragRef.current!.startV.x), c.y + (v.y - dragRef.current!.startV.y));
        });
        updateItem(id, { points: pts }, false);
      } else {
        const a = toCanvas(orig.x!, orig.y! + (orig.h ?? 0));
        const na = toPdf(a.x + (v.x - dragRef.current!.startV.x), a.y + (v.y - dragRef.current!.startV.y));
        // pdf-space delta: anchor moves with pointer
        const a0 = toPdf(a.x, a.y);
        updateItem(id, { x: orig.x! + (na.x - a0.x), y: orig.y! + (na.y - a0.y) }, false);
      }
      return;
    }
    if (!draft) return;
    if (draft.points) {
      const lastC = draft.points.length
        ? toCanvas(
            draft.points[draft.points.length - 1].x,
            draft.points[draft.points.length - 1].y
          )
        : null;
      if (!lastC || Math.hypot(lastC.x - v.x, lastC.y - v.y) > 2) {
        const p = toPdf(v.x, v.y);
        setDraft({ ...draft, curV: v, points: [...draft.points, p] });
      } else {
        setDraft({ ...draft, curV: v });
      }
    } else {
      setDraft({ ...draft, curV: v });
    }
  };

  const onPointerUp = () => {
    if (dragRef.current) {
      dragRef.current = null;
      void serialize(itemsRef.current);
      return;
    }
    if (!draft) return;
    const { startV, curV, points } = draft;
    const dx = Math.abs(curV.x - startV.x);
    const dy = Math.abs(curV.y - startV.y);
    if (tool === "draw" && points && points.length > 1) {
      addItems([
        {
          id: uid(),
          page: pageIndex,
          kind: "draw",
          points,
          color,
          thickness: 2,
        },
      ]);
    } else if (dx > 8 || dy > 8) {
      const a = toPdf(Math.min(startV.x, curV.x), Math.max(startV.y, curV.y));
      const b = toPdf(Math.max(startV.x, curV.x), Math.min(startV.y, curV.y));
      if (tool === "redact") {
        addItems([
          {
            id: uid(),
            page: pageIndex,
            kind: "redact",
            x: Math.min(a.x, b.x),
            y: Math.min(a.y, b.y),
            w: Math.abs(b.x - a.x),
            h: Math.abs(b.y - a.y),
          },
        ]);
      } else if (tool === "highlight") {
        addItems([
          {
            id: uid(),
            page: pageIndex,
            kind: "highlight",
            x: Math.min(a.x, b.x),
            y: Math.min(a.y, b.y),
            w: Math.abs(b.x - a.x),
            h: Math.abs(b.y - a.y),
            color: HIGHLIGHT_COLOR,
          },
        ]);
      } else if (tool === "rect" || tool === "ellipse") {
        addItems([
          {
            id: uid(),
            page: pageIndex,
            kind: tool,
            x: Math.min(a.x, b.x),
            y: Math.min(a.y, b.y),
            w: Math.abs(b.x - a.x),
            h: Math.abs(b.y - a.y),
            color,
            thickness: 2,
          },
        ]);
      } else if (tool === "line") {
        const p1 = toPdf(startV.x, startV.y);
        const p2 = toPdf(curV.x, curV.y);
        addItems([
          {
            id: uid(),
            page: pageIndex,
            kind: "line",
            points: [p1, p2],
            color,
            thickness: 2,
          },
        ]);
      }
    }
    setDraft(null);
  };

  /* keep a ref of items for drag-end serialization */
  const itemsRef = useRef<EditorItem[]>([]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  /* keyboard: undo / delete / pages */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId) {
          e.preventDefault();
          deleteSelected();
        }
      } else if (e.key === "ArrowLeft" && pageIndex > 0) {
        setPageIndex((p) => p - 1);
      } else if (e.key === "ArrowRight" && pageIndex < pageMetas.length - 1) {
        setPageIndex((p) => p + 1);
      } else if (e.key === "Escape") {
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, deleteSelected, selectedId, pageIndex, pageMetas.length]);

  /* ---------- derived ---------- */
  const selected = items.find((it) => it.id === selectedId) ?? null;
  const pageItems = items.filter((it) => it.page === pageIndex);

  const displayScale = useMemo(() => {
    if (!canvasDims || !wrapRef.current) return 1;
    return Math.min(1, (wrapRef.current.clientWidth - 2) / canvasDims.w);
  }, [canvasDims]);

  const toolsForMode =
    mode === "redact"
      ? ([
          { id: "redact", icon: EyeOff, label: "Draw redaction box" },
        ] as const)
      : mode === "sign"
        ? ([
            { id: "select", icon: MousePointer2, label: "Select / move" },
            { id: "sig", icon: Signature, label: "Add signature" },
          ] as const)
        : ([
            { id: "select", icon: MousePointer2, label: "Select / move" },
            { id: "text", icon: TypeIcon, label: "Add text" },
            { id: "highlight", icon: Highlighter, label: "Highlight" },
            { id: "rect", icon: Square, label: "Rectangle" },
            { id: "ellipse", icon: Circle, label: "Ellipse" },
            { id: "line", icon: Slash, label: "Line" },
            { id: "draw", icon: PenTool, label: "Freehand draw" },
            { id: "image", icon: ImagePlus, label: "Insert image" },
          ] as const);

  const countForApply =
    mode === "redact"
      ? items.filter((it) => it.kind === "redact").length
      : mode === "sign"
        ? items.filter((it) => it.kind === "signature").length
        : items.length;

  /* ---------- render ---------- */
  return (
    <div className="space-y-4">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Editor tools">
        {toolsForMode.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              if (t.id === "sig") {
                setSigModalOpen(true);
                setTool("select");
              } else {
                setTool(t.id);
              }
            }}
            aria-pressed={tool === t.id && t.id !== "sig"}
            aria-label={t.label}
            title={t.label}
            className={cn(
              "flex size-11 items-center justify-center rounded-control border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
              tool === t.id
                ? "border-ring bg-gradient-brand text-white shadow-glow"
                : "border-border bg-background text-fg-muted hover:border-border-strong hover:text-foreground"
            )}
          >
            <t.icon className="size-4.5" aria-hidden="true" />
          </button>
        ))}
        {mode === "edit" && (
          <label className="ml-1 flex size-11 items-center justify-center rounded-control border border-border bg-background" title="Ink color">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="size-7 cursor-pointer rounded border-0 bg-transparent p-0"
              aria-label="Ink color"
            />
          </label>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={undo}
            disabled={!history.length}
            aria-label="Undo"
            title="Undo (Ctrl+Z)"
            className="flex size-11 items-center justify-center rounded-control border border-border bg-background text-fg-muted outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
          >
            <Undo2 className="size-4.5" aria-hidden="true" />
          </button>
          <button
            onClick={deleteSelected}
            disabled={!selectedId}
            aria-label="Delete selected"
            title="Delete selected (Del)"
            className="flex size-11 items-center justify-center rounded-control border border-border bg-background text-fg-muted outline-none transition-colors hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
          >
            <Trash2 className="size-4.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* canvas area */}
      {loadError ? (
        <div className="flex items-center gap-2.5 rounded-control border border-warning/30 bg-warning/10 p-4">
          <TriangleAlert className="size-4 shrink-0 text-warning" />
          <p className="text-[13px] text-fg-muted">{loadError}</p>
        </div>
      ) : (
        <div ref={wrapRef} className="relative w-full">
          <div
            className="relative mx-auto overflow-hidden rounded-card border border-border bg-surface-1 shadow-sm"
            style={{
              width: canvasDims ? canvasDims.w * displayScale : "100%",
              height: canvasDims ? canvasDims.h * displayScale : 420,
            }}
          >
            <div
              style={{
                width: canvasDims?.w ?? "100%",
                height: canvasDims?.h ?? 420,
                transform: `scale(${displayScale})`,
                transformOrigin: "top left",
              }}
            >
              <canvas ref={canvasRef} className="block bg-white" />
              {/* item overlay */}
              <div
                className="absolute inset-0 touch-none"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              >
                {pageItems.map((it) => {
                  const box = itemViewBox(it);
                  if (!box) return null;
                  const sel = it.id === selectedId;
                  if (it.kind === "text") {
                    return (
                      <div
                        key={it.id}
                        className={cn(
                          "absolute cursor-move whitespace-pre rounded-sm border px-0.5",
                          sel ? "border-ring bg-primary/10" : "border-transparent"
                        )}
                        style={{
                          left: box.x,
                          top: box.y,
                          color: it.color,
                          fontSize: (it.size ?? 14) * renderScale,
                          fontFamily:
                            it.font === "times"
                              ? "Georgia, serif"
                              : it.font === "courier"
                                ? "monospace"
                                : "system-ui, sans-serif",
                          fontWeight: it.font?.includes("bold") ? 700 : 400,
                        }}
                      >
                        {it.text}
                      </div>
                    );
                  }
                  if (it.kind === "draw" || it.kind === "line") {
                    const pts = (it.points ?? []).map((p) => toCanvas(p.x, p.y));
                    return (
                      <svg
                        key={it.id}
                        className={cn("absolute inset-0", sel && "outline-dashed outline-1 outline-ring")}
                        style={{ pointerEvents: "none" }}
                        width={canvasDims?.w}
                        height={canvasDims?.h}
                      >
                        {it.kind === "line" && pts.length === 2 ? (
                          <line
                            x1={pts[0].x}
                            y1={pts[0].y}
                            x2={pts[1].x}
                            y2={pts[1].y}
                            stroke={it.color}
                            strokeWidth={(it.thickness ?? 2) * renderScale}
                            strokeLinecap="round"
                          />
                        ) : (
                          <polyline
                            points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
                            fill="none"
                            stroke={it.color}
                            strokeWidth={(it.thickness ?? 2) * renderScale}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}
                      </svg>
                    );
                  }
                  if (it.kind === "signature" || it.kind === "image") {
                    return (
                      <img
                        key={it.id}
                        src={it.dataUrl}
                        alt={it.kind === "signature" ? "Signature" : "Inserted image"}
                        className={cn("absolute cursor-move", sel && "outline outline-2 outline-ring")}
                        style={{
                          left: box.x,
                          top: box.y,
                          width: box.w,
                          height: box.h,
                        }}
                        draggable={false}
                      />
                    );
                  }
                  // highlight / rect / ellipse / redact
                  return (
                    <div
                      key={it.id}
                      className={cn(
                        "absolute cursor-move",
                        it.kind === "ellipse" && "rounded-[50%]",
                        sel && "outline outline-2 outline-ring outline-offset-1"
                      )}
                      style={{
                        left: box.x,
                        top: box.y,
                        width: box.w,
                        height: box.h,
                        background:
                          it.kind === "redact"
                            ? "#000"
                            : it.kind === "highlight"
                              ? hexA(it.color ?? HIGHLIGHT_COLOR, 0.35)
                              : it.kind === "rect" || it.kind === "ellipse"
                                ? "transparent"
                                : undefined,
                        border:
                          it.kind === "rect" || it.kind === "ellipse"
                            ? `${Math.max(1.5, (it.thickness ?? 2) * renderScale)}px solid ${it.color}`
                            : undefined,
                      }}
                    />
                  );
                })}
                {/* live draft */}
                {draft && (
                  <div
                    className="absolute border-2 border-dashed border-ring bg-primary/10"
                    style={{
                      left: Math.min(draft.startV.x, draft.curV.x),
                      top: Math.min(draft.startV.y, draft.curV.y),
                      width: Math.abs(draft.curV.x - draft.startV.x),
                      height: Math.abs(draft.curV.y - draft.startV.y),
                    }}
                  />
                )}
                {draft?.points && (
                  <svg className="absolute inset-0" width={canvasDims?.w} height={canvasDims?.h}>
                    <polyline
                      points={draft.points
                        .map((p) => {
                          const c = toCanvas(p.x, p.y);
                          return `${c.x},${c.y}`;
                        })
                        .join(" ")}
                      fill="none"
                      stroke={color}
                      strokeWidth={2 * renderScale}
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </div>
            </div>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-surface-1/80 text-sm text-fg-muted">
                Rendering page…
              </div>
            )}
          </div>
        </div>
      )}

      {/* page nav + count */}
      {!loadError && meta && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              disabled={pageIndex === 0}
              aria-label="Previous page"
              className="min-h-11"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-20 text-center text-[13px] font-semibold">
              Page {pageIndex + 1} / {pageMetas.length}
            </span>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setPageIndex((p) => Math.min(pageMetas.length - 1, p + 1))}
              disabled={pageIndex >= pageMetas.length - 1}
              aria-label="Next page"
              className="min-h-11"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <p className="text-[13px] text-fg-muted">
            {mode === "redact"
              ? `${countForApply} redaction box${countForApply === 1 ? "" : "es"} · drag to draw`
              : mode === "sign"
                ? `${countForApply} signature${countForApply === 1 ? "" : "s"} placed`
                : `${countForApply} annotation${countForApply === 1 ? "" : "s"} · ${pageItems.length} on this page`}
          </p>
        </div>
      )}

      {/* selected item inspector */}
      {selected && !loadError && (
        <div className="rounded-control border border-border bg-surface-1 p-4">
          {selected.kind === "text" ? (
            <div className="space-y-3">
              <label className="block text-[13px] font-medium" htmlFor="ann-text">
                Text content
              </label>
              <textarea
                id="ann-text"
                value={selected.text ?? ""}
                onChange={(e) => updateItem(selected.id, { text: e.target.value }, false)}
                rows={2}
                className="w-full rounded-control border border-border bg-background p-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-medium text-fg-muted">Size</span>
                  <input
                    type="number"
                    min={6}
                    max={72}
                    value={selected.size ?? 14}
                    onChange={(e) =>
                      updateItem(selected.id, { size: Math.max(6, Math.min(72, Number(e.target.value) || 14)) }, false)
                    }
                    className="w-full rounded-control border border-border bg-background p-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-medium text-fg-muted">Font</span>
                  <select
                    value={selected.font ?? "helvetica"}
                    onChange={(e) => updateItem(selected.id, { font: e.target.value as EditorItem["font"] }, false)}
                    className="w-full rounded-control border border-border bg-background p-2 text-sm"
                  >
                    <option value="helvetica">Helvetica</option>
                    <option value="helvetica-bold">Helvetica Bold</option>
                    <option value="times">Times</option>
                    <option value="courier">Courier</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-medium text-fg-muted">Color</span>
                  <input
                    type="color"
                    value={selected.color ?? "#111827"}
                    onChange={(e) => updateItem(selected.id, { color: e.target.value }, false)}
                    className="h-9 w-full cursor-pointer rounded-control border border-border bg-background p-1"
                  />
                </label>
                <div className="flex items-end">
                  <button
                    onClick={deleteSelected}
                    className="min-h-9 w-full rounded-control border border-destructive/40 bg-destructive/10 px-3 text-[13px] font-semibold text-destructive outline-none transition-colors hover:bg-destructive/20 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Delete text
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] text-fg-muted">
                {labelFor(selected)} — drag to move it, or delete it.
              </p>
              <button
                onClick={deleteSelected}
                className="min-h-11 rounded-control border border-destructive/40 bg-destructive/10 px-3 text-[13px] font-semibold text-destructive outline-none hover:bg-destructive/20 focus-visible:ring-2 focus-visible:ring-ring"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      )}

      {/* redact scope + warning */}
      {mode === "redact" && !loadError && (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-control border border-border p-3.5">
            <label htmlFor="redact-scope-all" className="text-[13px] font-medium">
              Flatten every page (not only redacted ones)
            </label>
            <input
              id="redact-scope-all"
              type="checkbox"
              className="size-5 accent-[var(--primary)]"
            />
          </div>
          <div className="flex items-start gap-2.5 rounded-control border border-warning/30 bg-warning/10 p-3.5">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
            <p className="text-[13px] leading-snug text-fg-muted">
              <b className="text-foreground">Redaction is permanent.</b> Black
              boxes are burned in and the text underneath is removed from the
              file. Pages that carry boxes are flattened to images — other
              pages keep their text. Double-check every box before applying.
            </p>
          </div>
        </div>
      )}

      {/* signature modal */}
      <SignatureModal
        open={sigModalOpen}
        onOpenChange={setSigModalOpen}
        onDone={(dataUrl) => {
          setSigModalOpen(false);
          const midX = (canvasDims?.w ?? 600) / 2;
          const midY = (canvasDims?.h ?? 800) / 2;
          void placeImage(dataUrl, { x: midX, y: midY });
          setImgCounter((c) => c + 1);
        }}
      />
      {void imgCounter}
    </div>
  );
}

function labelFor(it: EditorItem): string {
  switch (it.kind) {
    case "highlight":
      return "Highlight";
    case "rect":
      return "Rectangle";
    case "ellipse":
      return "Ellipse";
    case "line":
      return "Line";
    case "draw":
      return "Freehand drawing";
    case "image":
      return "Image";
    case "signature":
      return "Signature";
    case "redact":
      return "Redaction box";
    default:
      return "Item";
  }
}

function hexA(hex: string, alpha: number): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function fileToDataUrlPng(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

/* ================================================================
   Signature modal — draw / type / upload
   ================================================================ */

function SignatureModal({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: (dataUrl: string) => void;
}) {
  const [tab, setTab] = useState<"draw" | "type" | "upload">("draw");
  const [typed, setTyped] = useState("");
  const [ink, setInk] = useState("#1D4ED8");
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    if (!open) return;
    // ensure the handwriting font is ready before canvas use
    document.fonts?.load('48px Caveat').catch(() => {});
    setHasInk(false);
  }, [open]);

  const ctxOf = () => {
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    return ctx;
  };

  const pos = (e: React.PointerEvent) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * c.width,
      y: ((e.clientY - rect.top) / rect.height) * c.height,
    };
  };

  const startDraw = (e: React.PointerEvent) => {
    drawingRef.current = true;
    const ctx = ctxOf();
    const p = pos(e);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const moveDraw = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    const ctx = ctxOf();
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setHasInk(true);
  };

  const endDraw = () => {
    drawingRef.current = false;
  };

  const clearDraw = () => {
    const c = canvasRef.current!;
    ctxOf().clearRect(0, 0, c.width, c.height);
    setHasInk(false);
  };

  const renderTyped = (text: string) => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = ink;
    ctx.font = "72px Caveat, cursive";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 24, c.height / 2);
    setHasInk(!!text.trim());
  };

  /* canvas is shared across tabs — clear it whenever the tab changes */
  useEffect(() => {
    const c = canvasRef.current;
    if (open && c) {
      c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
      setHasInk(false);
    }
  }, [open, tab]);

  /* keep the typed preview in sync with text + ink (no stale closures) */
  useEffect(() => {
    if (open && tab === "type") renderTyped(typed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab, typed, ink]);

  const save = () => {
    const c = canvasRef.current;
    if (!c) return;
    if (tab === "type" ? !typed.trim() : !hasInk) return;
    // trim to content bounding box for a tight placement
    const ctx = c.getContext("2d")!;
    const img = ctx.getImageData(0, 0, c.width, c.height);
    let minX = c.width;
    let minY = c.height;
    let maxX = 0;
    let maxY = 0;
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        if (img.data[(y * c.width + x) * 4 + 3] > 8) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    const pad = 6;
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(c.width, maxX + pad);
    maxY = Math.min(c.height, maxY + pad);
    const w = Math.max(1, maxX - minX);
    const h = Math.max(1, maxY - minY);
    const out = document.createElement("canvas");
    out.width = w;
    out.height = h;
    out.getContext("2d")!.drawImage(c, minX, minY, w, h, 0, 0, w, h);
    onDone(out.toDataURL("image/png"));
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent title="Create a signature" description="Draw, type or upload — it stays on your device.">
        <button
          onClick={() => onOpenChange(false)}
          aria-label="Close"
          className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-chip text-fg-muted outline-none hover:bg-surface-3 focus-visible:ring-2 focus-visible:ring-ring"
        >
          ✕
        </button>

        <div className="mb-4 grid grid-cols-3 gap-2" role="tablist" aria-label="Signature method">
          {(
            [
              { id: "draw", label: "Draw" },
              { id: "type", label: "Type" },
              { id: "upload", label: "Upload" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "min-h-11 rounded-control border px-3 text-[13px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                tab === t.id
                  ? "border-ring bg-primary/10 text-primary"
                  : "border-border text-fg-muted hover:border-border-strong"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 pb-3">
          <span className="text-[13px] font-medium text-fg-muted">Ink</span>
          {INK_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setInk(c)}
              aria-label={`Ink color ${c}`}
              aria-pressed={ink === c}
              className={cn(
                "size-7 rounded-full border-2 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                ink === c ? "border-foreground" : "border-transparent"
              )}
              style={{ background: c }}
            />
          ))}
        </div>

        {tab === "draw" && (
          <div className="space-y-3">
            <canvas
              ref={canvasRef}
              width={560}
              height={200}
              className="block w-full cursor-crosshair touch-none rounded-control border border-dashed border-border-strong bg-white"
              onPointerDown={startDraw}
              onPointerMove={moveDraw}
              onPointerUp={endDraw}
              onPointerCancel={endDraw}
              aria-label="Signature drawing pad"
            />
            <button
              onClick={clearDraw}
              className="min-h-11 rounded-control border border-border px-4 text-[13px] font-semibold text-fg-muted outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              Clear
            </button>
          </div>
        )}

        {tab === "type" && (
          <div className="space-y-3">
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Your name"
              aria-label="Type your name"
              className="min-h-11 w-full rounded-control border border-border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <canvas
              ref={canvasRef}
              width={560}
              height={140}
              className="block w-full rounded-control border border-border bg-white"
              aria-label="Typed signature preview"
            />
          </div>
        )}

        {tab === "upload" && (
          <div className="space-y-3">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                fileToDataUrlPng(f).then(setUploadUrl).catch(() => notify.error("Could not read that file"));
              }}
              aria-label="Upload a signature image"
              className="block w-full text-[13px] text-fg-muted file:mr-3 file:min-h-11 file:rounded-control file:border file:border-border file:bg-background file:px-4 file:text-[13px] file:font-semibold file:text-foreground"
            />
            {uploadUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={uploadUrl}
                alt="Uploaded signature preview"
                className="mx-auto max-h-36 rounded-control border border-border bg-white p-2"
              />
            )}
            <p className="text-micro text-fg-faint">
              PNG with a transparent background works best.
            </p>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" size="lg" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="lg"
            onClick={save}
            disabled={
              (tab === "draw" && !hasInk) ||
              (tab === "type" && !typed.trim()) ||
              (tab === "upload" && !uploadUrl)
            }
          >
            Place signature
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}
