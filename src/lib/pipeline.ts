import { useStore } from "./store";
import { runTool, type EngineResult } from "./pdf-engine";
import { toast } from "sonner";
import { toolById } from "./tools";

export async function executeRun(
  toolId: string,
  entries: { id: string; file: File }[],
  opts: Record<string, unknown>
) {
  const s = useStore.getState();
  const tool = toolById(toolId);
  const t0 = performance.now();

  const jobs: Record<
    string,
    { fileId: string; status: "queued" | "processing"; progress: number }
  > = {};
  for (const f of entries) jobs[f.id] = { fileId: f.id, status: "queued", progress: 0 };
  s.setJobs(jobs);
  useStore.setState({ toolId });
  s.setView("processing");

  const updateJob = (id: string, patch: { status?: "processing"; progress?: number }) => {
    const st = useStore.getState();
    st.updateJob(id, patch);
  };

  try {
    /* code-split: the extra engine (Tier-1 tools) loads only when used */
    const { isExtraTool, runExtraTool } = await import("./extra-engine");
    const result: EngineResult = isExtraTool(toolId)
      ? await runExtraTool(toolId, entries, opts, {
          onOverall: (p) => {
            const keys = Object.keys(jobs);
            const last = keys[keys.length - 1];
            if (last) updateJob(last, { status: "processing", progress: p });
          },
          onFileProgress: (id, p) => {
            if (jobs[id]) updateJob(id, { status: "processing", progress: p });
          },
        })
      : await runTool(toolId, entries, opts, {
      onOverall: (p) => {
        const keys = Object.keys(jobs);
        const last = keys[keys.length - 1];
        if (last) updateJob(last, { status: "processing", progress: p });
      },
      onFileProgress: (id, p) => {
        if (jobs[id]) updateJob(id, { status: "processing", progress: p });
      },
    });

    const st = useStore.getState();
    const ms = performance.now() - t0;
    const inBytes = entries.reduce((a, f) => a + f.file.size, 0);
    const outBytes = result.files.reduce((a, f) => a + f.size, 0);
    st.setResults(
      result.files.map((f, i) => ({
        id: `r${i}`,
        name: f.name,
        blob: f.blob,
        size: f.size,
        kind: f.kind,
      }))
    );
    st.setStats({
      toolName: tool?.name ?? toolId,
      fileCount: entries.length,
      inputBytes: inBytes,
      outputBytes: outBytes,
      ms,
      note: result.note,
    });
    st.setView("done");
  } catch (err) {
    toast.error(
      err instanceof Error
        ? err.message
        : "Something went wrong while processing"
    );
    useStore.getState().setView("tool");
  }
}
