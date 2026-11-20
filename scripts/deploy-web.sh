#!/usr/bin/env bash
# Builds the web app and publishes it to Vercel (magicmeat-web).
# Vercel never uploads folders named node_modules, and Expo's export keeps
# fonts and router images under assets/node_modules, so they are renamed to
# assets/nm and every reference is rewritten before upload.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${WEB_DEPLOY_DIR:-$ROOT/.web-deploy}"
cd "$ROOT"
rm -rf dist "$OUT"
npx expo export --platform web
mkdir -p "$OUT"
cp -R dist/. "$OUT"/
rm -rf dist
if [ -d "$OUT/assets/node_modules" ]; then mv "$OUT/assets/node_modules" "$OUT/assets/nm"; fi
grep -rl "assets/node_modules/" "$OUT" | while read -r f; do
  LC_ALL=C sed -i.bak 's#assets/node_modules/#assets/nm/#g' "$f" && rm "$f.bak"
done
cat > "$OUT/vercel.json" <<'JSON'
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["bom1"],
  "rewrites": [{ "source": "/((?!_expo/|assets/|favicon).*)", "destination": "/index.html" }],
  "headers": [{ "source": "/_expo/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] }]
}
JSON
# Keep the link to the existing Vercel project between runs.
mkdir -p "$ROOT/.vercel-web"
if [ -f "$ROOT/.vercel-web/project.json" ]; then mkdir -p "$OUT/.vercel" && cp "$ROOT/.vercel-web/project.json" "$OUT/.vercel/"; fi
cd "$OUT"
npx vercel deploy --prod --yes
cp .vercel/project.json "$ROOT/.vercel-web/project.json"
