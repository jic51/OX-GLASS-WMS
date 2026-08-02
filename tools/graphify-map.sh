#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Build a graphify knowledge graph of this project.
#
# Why a wrapper is needed: graphify classifies files by extension, and this
# project has neither extension it expects.
#   • Code_v3_fixed.gs  — Apps Script is JavaScript, but ".gs" is unknown to
#                         graphify, so the backend is skipped entirely.
#   • Index_v3_fixed.html — classified as a *document*, so its ~5,600 lines of
#                         embedded JS are never AST-parsed and it demands an LLM
#                         API key it does not need.
#
# So we stage copies with the extensions graphify understands, pulling the
# frontend's <script> block out into its own file, and index that instead. The
# staging directory is disposable; nothing here changes the real sources.
#
# Usage:  ./tools/graphify-map.sh
# Output: graphify-out/graph.json, graph.html, GRAPH_REPORT.md
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAGE="$ROOT/.graphify-stage"

command -v graphify >/dev/null 2>&1 || {
  echo "graphify not found. Install it with:  uv tool install graphifyy" >&2
  exit 1
}

rm -rf "$STAGE"
mkdir -p "$STAGE"

cp "$ROOT/Code_v3_fixed.gs" "$STAGE/backend_Code.js"

python3 - "$ROOT/Index_v3_fixed.html" "$STAGE/frontend_Index.js" <<'PY'
import re, sys
src, dst = sys.argv[1], sys.argv[2]
html = open(src, encoding='utf-8').read()
blocks = re.findall(r'<script[^>]*>([\s\S]*?)</script>', html)
if not blocks:
    sys.exit("No <script> block found in " + src)
# The app's own code is the largest block; the others are CDN loader tags.
open(dst, 'w', encoding='utf-8').write(max(blocks, key=len))
PY

cd "$STAGE"
graphify . --code-only
graphify cluster-only "$STAGE" || true

rm -rf "$ROOT/graphify-out"
mv "$STAGE/graphify-out" "$ROOT/graphify-out"
rm -rf "$STAGE"

echo
echo "Graph written to $ROOT/graphify-out/"
echo "  graph.json       — nodes and edges"
echo "  graph.html       — open in a browser to explore"
echo "  GRAPH_REPORT.md  — named communities"
