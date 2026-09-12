#!/usr/bin/env bash
set -e

# ==============================================================================
# Deployment Package Generator for charts.fluidpalette.com
# Creates a clean deployable archive for Hostinger (VPS or Node.js hosting)
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST_DIR="$ROOT_DIR/deploy/dist"
ZIP_FILE="$ROOT_DIR/deploy/charts_fluidpalette_latest.zip"

echo "==> Building fresh Next.js production build..."
cd "$ROOT_DIR"
npm run build

echo "==> Preparing distribution package directory..."
rm -rf "$DIST_DIR" "$ZIP_FILE"
mkdir -p "$DIST_DIR"

echo "==> Copying project files..."
cp -R "$ROOT_DIR/package.json" "$DIST_DIR/"
cp -R "$ROOT_DIR/package-lock.json" "$DIST_DIR/"
cp -R "$ROOT_DIR/next.config.ts" "$DIST_DIR/"
cp -R "$ROOT_DIR/tsconfig.json" "$DIST_DIR/"
cp -R "$ROOT_DIR/ecosystem.config.js" "$DIST_DIR/"
cp -R "$ROOT_DIR/server.js" "$DIST_DIR/"
cp -R "$ROOT_DIR/.env.example" "$DIST_DIR/"
cp -R "$ROOT_DIR/public" "$DIST_DIR/"
cp -R "$ROOT_DIR/prisma" "$DIST_DIR/"
cp -R "$ROOT_DIR/src" "$DIST_DIR/"
cp -R "$ROOT_DIR/.next" "$DIST_DIR/"

mkdir -p "$DIST_DIR/deploy"
cp "$ROOT_DIR/deploy/nginx-charts.fluidpalette.com.conf" "$DIST_DIR/deploy/"
cp "$ROOT_DIR/deploy/HOSTINGER_DEPLOYMENT_GUIDE.md" "$DIST_DIR/deploy/"

echo "==> Compressing into deployable archive: $ZIP_FILE"
cd "$DIST_DIR"
zip -r -q "$ZIP_FILE" .

echo "==> Cleaning up temporary dist folder..."
rm -rf "$DIST_DIR"

echo "================================================================="
echo "✅ Package created successfully:"
echo "   $ZIP_FILE"
echo "   Size: $(du -h "$ZIP_FILE" | cut -f1)"
echo "================================================================="

