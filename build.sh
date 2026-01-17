#!/bin/bash
# Build script for Render.com

set -e  # Exit on error

echo "Installing root dependencies with legacy peer deps..."
npm ci --legacy-peer-deps || npm install --legacy-peer-deps

echo "Building Angular app..."
export PATH="$PWD/node_modules/.bin:$PATH"
ng build --configuration production

echo "Installing server dependencies..."
cd server
npm install --production

echo "Build complete!"
