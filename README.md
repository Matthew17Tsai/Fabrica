# Fabrica (ProductCreation)

Convert sketches and design images into editable flat sketches and complete tech packs.

## Features

- Upload design images (hoodie, sweatshirt, sweatpants)
- Automatic vectorization to SVG flat sketch
- Interactive flat sketch editor with callouts
- Tech pack editor with BOM, POM, and measurements
- Export to PDF, Excel, and JSON

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- SQLite (better-sqlite3)
- Sharp (image processing)
- Potrace (vectorization)
- Konva (canvas editor)
- Puppeteer (PDF generation)
- ExcelJS (Excel generation)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Run database migrations

```bash
npm run migrate
```

### 3. Start development server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Testing

### Test the processing pipeline

```bash
npm run test:pipeline
```

This creates a test image and runs it through all processing steps, validating the output.

### Generate sample images

```bash
npm run generate:samples
```

Creates sample hoodie, sweatshirt, and sweatpants images in `public/samples/`.

## Environment Notes

This app is designed to run in Replit but can run in any Node.js environment with:
- Node.js 18+
- Write access to `/tmp/fabrica/` directory
- Chrome/Chromium available for Puppeteer (or falls back to pdf-lib)

## Project Structure

```
fabrica/
├── app/              # Next.js App Router pages and API routes
├── lib/              # Core libraries (db, storage, processing)
├── components/       # React components
├── public/           # Static assets and templates
├── migrations/       # Database schema
└── docs/             # Documentation
```

## Development Status

✅ Step 1: Scaffold complete
✅ Step 2: Upload + Status complete
✅ Step 3: Processing pipeline complete
⏳ Step 4: Editor (next)
⏳ Step 5: Tech pack editor
⏳ Step 6: Export
⏳ Step 7: Samples + polish

## Next Steps

See `docs/architecture.md` for detailed system design and implementation notes.
