/**
 * Compatibility shims required by pdf.js (pdfjs-dist 6.x).
 *
 * pdfjs-dist 6 ships only its modern build: it calls the TC39 "upsert"
 * methods Map.prototype.getOrInsert / getOrInsertComputed (and their
 * WeakMap variants) plus the static Promise.withResolvers. Those APIs
 * exist only in very recent engines (Chrome/Edge 136+, Firefox 134+,
 * Safari 18.4+), so on slightly older browsers the PDF→JPG, PDF→PNG,
 * PDF→PPT and Extract-Images tools crash with:
 *   "getOrInsertComputed is not a function"
 *
 * This module installs no-op-if-present shims with the exact semantics of
 * the proposal (https://tc39.es/proposal-upsert) and of Promise.withResolvers
 * (https://tc39.es/proposal-promise-with-resolvers). It is imported first
 * from the root layout so it always runs before any engine code, and the
 * same shims are prepended to public/pdf.worker.min.mjs for the worker
 * realm (see scripts/patch-pdf-worker.mjs).
 */

/* eslint-disable @typescript-eslint/no-extend-native, no-prototype-builtins */

function defineOnce(
  holder: object,
  name: string,
  value: (...args: never[]) => unknown,
  enumerable = false
) {
  if (!Object.prototype.hasOwnProperty.call(holder, name)) {
    Object.defineProperty(holder, name, {
      value,
      writable: true,
      configurable: true,
      enumerable,
    });
  }
}

type MapLike<K, V> = {
  has(key: K): boolean;
  get(key: K): V | undefined;
  set(key: K, value: V): unknown;
};

/* Map upsert — CanonicalizeKeyedCollectionKey (-0 → +0) is handled by
   Map.prototype.set/get itself, so a thin has/get/set wrapper is exact. */
defineOnce(
  Map.prototype,
  "getOrInsert",
  function getOrInsert<K, V>(this: MapLike<K, V>, key: K, value: V) {
    if (!this.has(key)) this.set(key, value);
    return this.get(key);
  }
);

defineOnce(
  Map.prototype,
  "getOrInsertComputed",
  function getOrInsertComputed<K, V>(this: MapLike<K, V>, key: K, cb: (key: K) => V) {
    if (!this.has(key)) this.set(key, cb(key));
    return this.get(key);
  }
);

type WeakMapLike<K extends object, V> = {
  has(key: K): boolean;
  get(key: K): V | undefined;
  set(key: K, value: V): unknown;
};

defineOnce(
  WeakMap.prototype,
  "getOrInsert",
  function wmGetOrInsert<K extends object, V>(this: WeakMapLike<K, V>, key: K, value: V) {
    if (!this.has(key)) this.set(key, value);
    return this.get(key);
  }
);

defineOnce(
  WeakMap.prototype,
  "getOrInsertComputed",
  function wmGetOrInsertComputed<K extends object, V>(
    this: WeakMapLike<K, V>,
    key: K,
    cb: (key: K) => V
  ) {
    if (!this.has(key)) this.set(key, cb(key));
    return this.get(key);
  }
);

/* static Promise.withResolvers */
interface WithResolvers<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

defineOnce(
  Promise as unknown as object,
  "withResolvers",
  function withResolvers<T>(): WithResolvers<T> {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  }
);

/* static Math.sumPrecise — used by @cantoo/pdf-lib's encryption path
   (Protect PDF); shipped in ES2026-era engines only */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Math {
    sumPrecise(values: Iterable<number>): number;
  }
}

defineOnce(
  Math as unknown as object,
  "sumPrecise",
  function sumPrecise(values: Iterable<number>): number {
    let sum = 0;
    for (const v of values) sum += v;
    return sum;
  }
);

/* module marker — keeps "declare global" valid in this file */
export {};
