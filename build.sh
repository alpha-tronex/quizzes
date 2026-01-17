#!/bin/bash
# Build script for Render.com

echo "Installing root dependencies..."
npm install --legacy-peer-deps

echo "Building Angular app..."
npm run build

echo "Installing server dependencies..."
cd server
npm install

echo "Build complete!"
