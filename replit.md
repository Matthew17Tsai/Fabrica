# Fabrica

## Overview
Fabrica is a Next.js application that transforms design sketches into editable flat sketches and complete tech packs. Users can upload garment designs (hoodies, sweatshirts, sweatpants), which are processed into line art, SVGs, and exportable tech packs (PDF, Excel, JSON).

## Recent Changes
- 2026-02-12: Initial Replit environment setup, moved files from subdirectory, configured for port 5000

## Project Architecture
- **Framework**: Next.js 14 (App Router) with TypeScript
- **Styling**: Tailwind CSS
- **Database**: SQLite via better-sqlite3 (local file `fabrica.db`)
- **Image Processing**: Sharp, Potrace (vectorization)
- **Canvas Editor**: Konva / React-Konva
- **Export**: pdf-lib, ExcelJS, Puppeteer
- **Port**: 5000 (dev and production)

### Directory Structure
```
app/              - Next.js App Router pages and API routes
  api/upload/     - File upload endpoint
  new/            - New project creation page
  project/[id]/   - Project detail/editor page
components/       - React components (FlatSketchEditor)
lib/              - Backend utilities
  db.ts           - SQLite database connection and queries
  storage.ts      - File storage utilities
  jobs/           - Job processing queue
  processing/     - Image processing pipeline (preprocess, lineart, vectorize)
migrations/       - SQL migration files
public/templates/ - BOM/POM template JSON files
scripts/          - Setup and utility scripts
start.sh          - Startup script (runs migrations + dev server)
```

### Key Scripts
- `npm run dev` - Start development server on port 5000
- `npm run build` - Build for production
- `npm run migrate` - Run database migrations
- `npm run setup` - Run migrations + create temp directory

## User Preferences
- No specific preferences recorded yet
