/**
 * Build the toolcheck bundle: the real engine additions
 * (src/lib/extra-engine.ts) bundled for headless Chromium.
 */
import esbuild from "esbuild";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const outdir = path.join(here, "../../tests/toolcheck/harness");
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

console.log("✓ toolcheck bundle → tests/toolcheck/harness/harness.js");
