#!/bin/bash
# Lighthouse runs (mobile emulation) — writes reports to tests/lighthouse/
set -e
CHROME=$(ls -d ~/.cache/ms-playwright/chromium-*/chrome-linux64/chrome 2>/dev/null | sort -V | tail -1)
export CHROME_PATH="$CHROME"
BASE=${BASE:-http://localhost:3101}
OUT=tests/lighthouse
mkdir -p "$OUT"

run_lh () {
  local path="$1"
  local name="$2"
  echo "=== Lighthouse: $name ($path) ==="
  npx --yes lighthouse "$BASE$path" \
    --quiet \
    --chrome-flags="--headless=new --no-sandbox --disable-dev-shm-usage" \
    --only-categories=performance,accessibility,best-practices,seo \
    --form-factor=mobile \
    --screenEmulation.mobile \
    --output=json --output=html \
    --output-path="$OUT/lh-$name" \
    --report-description="SwiftPDF Lighthouse $name"
}

run_lh "/en" "home"
run_lh "/en/tool/merge" "tool-merge"
run_lh "/en/tool/compress-target" "tool-compress-target"
run_lh "/en/blog/merge-pdf-files-without-uploading" "blog-article"
run_lh "/en/compress-pdf-to-100kb" "intent-100kb"

node scripts/lh-summary.mjs
