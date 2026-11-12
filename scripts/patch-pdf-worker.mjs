/**
 * Prepends browser-compat shims to public/pdf.worker.min.mjs.
 *
 * pdfjs-dist 6's worker code calls Map.prototype.getOrInsertComputed and
 * Promise.withResolvers, which older browsers lack. The main-thread shims
 * (src/lib/compat-shims.ts) do not apply inside the worker realm, so the
 * same shims are prepended directly to the worker asset. Idempotent:
 * re-running after a pdfjs-dist upgrade re-applies cleanly (marker check).
 *
 * Usage: node scripts/patch-pdf-worker.mjs
 */
import fs from "node:fs";

const WORKER = "public/pdf.worker.min.mjs";
const MARKER = "/* swiftpdf-compat-shims v1 */";

const SHIMS = `${MARKER}
(() => {
  const defineOnce = (holder, name, value) => {
    if (!Object.prototype.hasOwnProperty.call(holder, name)) {
      Object.defineProperty(holder, name, { value, writable: true, configurable: true, enumerable: false });
    }
  };
  defineOnce(Map.prototype, "getOrInsert", function (key, value) {
    if (!this.has(key)) this.set(key, value);
    return this.get(key);
  });
  defineOnce(Map.prototype, "getOrInsertComputed", function (key, cb) {
    if (!this.has(key)) this.set(key, cb(key));
    return this.get(key);
  });
  defineOnce(WeakMap.prototype, "getOrInsert", function (key, value) {
    if (!this.has(key)) this.set(key, value);
    return this.get(key);
  });
  defineOnce(WeakMap.prototype, "getOrInsertComputed", function (key, cb) {
    if (!this.has(key)) this.set(key, cb(key));
    return this.get(key);
  });
  if (!Object.prototype.hasOwnProperty.call(Promise, "withResolvers")) {
    Object.defineProperty(Promise, "withResolvers", {
      value: function withResolvers() {
        let resolve, reject;
        const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
        return { promise, resolve, reject };
      },
      writable: true, configurable: true, enumerable: false,
    });
  }
})();
`;

let src = fs.readFileSync(WORKER, "utf8");
if (src.includes(MARKER)) {
  src = src.slice(src.indexOf(MARKER)); // strip previous shim block
}
fs.writeFileSync(WORKER, SHIMS + src);
console.log(`patched ${WORKER} (+${SHIMS.length} bytes)`);
