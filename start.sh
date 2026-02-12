#!/bin/bash

echo "🚀 Starting Fabrica..."

# Run database migrations
echo "📦 Running database migrations..."
node scripts/migrate.js

# Create /tmp/fabrica directory
mkdir -p /tmp/fabrica

# Start Next.js dev server
echo "✅ Starting dev server..."
npm run dev
