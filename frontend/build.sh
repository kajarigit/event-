#!/bin/bash
# Render build script for React SPA

echo "📦 Installing dependencies..."
npm install

echo "🏗️ Building React app..."
npm run build

echo "✅ Build complete!"
echo "📂 Output directory: dist/"
ls -la dist/

# Create _redirects file for SPA routing (if it doesn't exist)
if [ ! -f "dist/_redirects" ]; then
  echo "Creating _redirects for SPA routing..."
  echo "/*    /index.html   200" > dist/_redirects
fi

echo "✅ Deploy ready!"
