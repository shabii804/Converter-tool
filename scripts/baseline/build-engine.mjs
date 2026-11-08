/**
 * Build the browser harness bundle: the real engine (src/lib/pdf-engine.ts)
 * bundled for headless Chromium. The engine source is imported untouched —
 * any engine change would alter the bundle.
 */
import esbuild from "esbuild";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const outdir = path.join(here, "../../tests/baseline/harness");
mkdirSync(outdir, { recursive: true });

const stubNodeBuiltins = {
  name: "stub-node-builtins",
  setup(build) {
    const mods = [
      "fs", "path", "crypto", "stream", "os", "url", "http", "https",
      "zlib", "util", "child_process", "net", "tls", "readline", "assert",
    ];
    for (const m of mods) {
      build.onResolve({ filter: new RegExp(`^${m}$`) }, () => ({
        path: m,
        namespace: "stub",
      }));
    }
    build.onLoad({ filter: /.*/, namespace: "stub" }, (args) => ({
      contents: "module.exports = {};",
      loader: "js",
    }));
  },
};

await esbuild.build({
  entryPoints: [path.join(here, "harness.src.ts")],
  bundle: true,
  format: "iife",
  platform: "browser",
  outfile: path.join(outdir, "harness.js"),
  sourcemap: false,
  minify: false,
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [stubNodeBuiltins],
  logLevel: "warning",
});

console.log("✓ harness bundle → tests/baseline/harness/harness.js");
