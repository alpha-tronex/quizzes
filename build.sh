#!/bin/bash
# Build script for Render.com

set -e  # Exit on error

echo "Installing root dependencies with legacy peer deps..."
npm install --legacy-peer-deps

echo "Building Angular app..."
npm run build

echo "Installing server dependencies..."
cd server
npm install --production

echo "Build complete!"
