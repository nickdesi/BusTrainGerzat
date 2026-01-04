#!/bin/bash
set -euo pipefail

echo "📦 Bundling React app to single HTML artifact..."

# Cleanup trap
cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        echo "❌ process failed with exit code $exit_code"
    fi
}
trap cleanup EXIT

# Check if we're in a project directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: No package.json found. Run this script from your project root."
  exit 1
fi

# Check if index.html exists
if [ ! -f "index.html" ]; then
  echo "❌ Error: No index.html found in project root."
  echo "   This script requires an index.html entry point."
  exit 1
fi

# Detect Package Manager
PM='npm'
EXEC='npx'
INSTALL='npm install -D'

if [ -f "pnpm-lock.yaml" ]; then
    PM='pnpm'
    EXEC='pnpm exec'
    INSTALL='pnpm add -D'
elif [ -f "yarn.lock" ]; then
    PM='yarn'
    EXEC='yarn'
    INSTALL='yarn add -D'
fi

echo "🔧 Detected package manager: $PM"

# Install bundling dependencies
echo "📦 Installing bundling dependencies..."
$INSTALL parcel @parcel/config-default parcel-resolver-tspaths html-inline

# Create Parcel config with tspaths resolver
if [ ! -f ".parcelrc" ]; then
  echo "🔧 Creating Parcel configuration with path alias support..."
  cat > .parcelrc << 'EOF'
{
  "extends": "@parcel/config-default",
  "resolvers": ["parcel-resolver-tspaths", "..."]
}
EOF
fi

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist bundle.html

# Build with Parcel
echo "🔨 Building with Parcel..."
$EXEC parcel build index.html --dist-dir dist --no-source-maps

# Inline everything into single HTML
echo "🎯 Inlining all assets into single HTML file..."
$EXEC html-inline dist/index.html > bundle.html

# Get file size
if [[ "$OSTYPE" == "darwin"* ]]; then
  FILE_SIZE=$(du -h bundle.html | cut -f1)
else
  FILE_SIZE=$(du -h bundle.html | cut -f1) # standard du output
fi

echo ""
echo "✅ Bundle complete!"
echo "📄 Output: bundle.html ($FILE_SIZE)"
echo ""
echo "You can now use this single HTML file as an artifact in Antigravity conversations."
echo "To test locally: open bundle.html in your browser"