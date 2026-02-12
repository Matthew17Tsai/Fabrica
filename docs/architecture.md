# Fabrica Architecture

## Overview

Fabrica is an MVP application that transforms design sketches into editable flat sketches (SVG) and generates comprehensive tech packs for apparel manufacturing.

## Data Model

### Database Schema (SQLite)

**projects**
- `id` (TEXT, PK): Unique project identifier (nanoid)
- `created_at` (TEXT): ISO timestamp
- `title` (TEXT): User-provided project name
- `category` (TEXT): hoodie | sweatshirt | sweatpants
- `status` (TEXT): uploaded | processing | ready | error
- `error_message` (TEXT, nullable): Error details if status=error

**assets**
- `id` (TEXT, PK): Unique asset identifier
- `project_id` (TEXT, FK): References projects.id
- `type` (TEXT): original | preprocessed | lineart | svg | techpack_json | techpack_pdf | techpack_xlsx
- `path` (TEXT): Relative file path from storage root
- `created_at` (TEXT): ISO timestamp

**jobs**
- `id` (TEXT, PK): Unique job identifier
- `project_id` (TEXT, FK): References projects.id
- `status` (TEXT): queued | running | done | error
- `step` (TEXT): Current processing step name
- `progress` (INTEGER): 0-100 percentage
- `updated_at` (TEXT): Last update timestamp
- `error_message` (TEXT, nullable): Error details if failed

**techpacks**
- `id` (TEXT, PK): Unique tech pack identifier
- `project_id` (TEXT, FK): References projects.id (UNIQUE)
- `json_text` (TEXT): Complete tech pack JSON
- `created_at` (TEXT): ISO timestamp

### File Storage Structure

```
/tmp/fabrica/
└── {projectId}/
    ├── original.png         # User upload
    ├── preprocessed.png     # Normalized, grayscale image
    ├── lineart.png          # High-contrast line art
    ├── flatsketch.svg       # Vectorized flat sketch
    ├── techpack.json        # Tech pack data (source of truth)
    ├── techpack.pdf         # Generated PDF export
    └── techpack.xlsx        # Generated Excel export
```

## Pipeline Stages

### Stage 1: Upload
1. User uploads image via `/new` page
2. POST `/api/upload` receives file + metadata (title, category)
3. Generate projectId using nanoid
4. Save file to `/tmp/fabrica/{projectId}/original.png`
5. Create project record (status: uploaded)
6. Create asset record (type: original)
7. Create job record (status: queued, step: preprocess, progress: 0)
8. Update project status to processing
9. Redirect to `/project/{id}` status page

### Stage 2: Processing (Triggered by Job Runner)
Client-side interval on status page calls `/api/jobs/run` every 2 seconds.

**Pipeline steps:**

1. **Preprocess** (progress: 0-25%)
   - Load original.png
   - Resize to max 2000px (maintain aspect ratio)
   - Convert to grayscale
   - Normalize contrast
   - Apply slight sharpen
   - Save as preprocessed.png
   - Create asset record

2. **Generate Line Art** (progress: 25-50%)
   - Load preprocessed.png
   - Apply high-contrast adjustment
   - Threshold to black/white bitmap
   - Remove noise (morphological operations or blur+threshold)
   - Save as lineart.png
   - Create asset record

3. **Vectorize** (progress: 50-75%)
   - Load lineart.png
   - Run potrace to generate SVG paths
   - Save raw SVG output

4. **Normalize SVG** (progress: 75-100%)
   - Parse SVG
   - Apply style normalization:
     - stroke: black
     - fill: none
     - stroke-width: 2
   - Wrap in required group structure:
     ```xml
     <svg ...>
       <g id="Outline"></g>
       <g id="Details">
         {all generated paths}
       </g>
       <g id="Callouts"></g>
     </svg>
     ```
   - Save as flatsketch.svg
   - Create asset record (type: svg)
   - Update project status to ready
   - Update job status to done

### Stage 3: Flat Sketch Editor
- Load flatsketch.svg
- Render using Konva.js canvas
- Features:
  - Select and drag paths/groups
  - Add callouts: click → type label → create dot + leader + text in Callouts group
  - Save: POST `/api/editor/save` with updated SVG
- Persist changes to disk

### Stage 4: Tech Pack Editor
- Load or create tech pack JSON
- Merge data from:
  - Category templates (POM/BOM)
  - SVG Callouts group (extract labels)
  - User edits
- UI sections:
  - Header: style name, season, fit, notes
  - BOM: editable table of materials/components
  - Measurements: POM list + optional size chart CSV upload
  - Construction: callout → instruction mapping
- Save: POST `/api/techpack/save` with JSON
- Store in techpacks table and techpack.json file

### Stage 5: Export
**PDF Export**
- Use Puppeteer to render HTML template
- Template includes:
  - Title block with header fields
  - Embedded flat sketch (SVG or converted to PNG)
  - Callouts list
  - BOM table
  - Measurements table
  - Construction notes
- Output: techpack.pdf
- Fallback: If Puppeteer fails (Chrome unavailable), use pdf-lib with basic layout

**Excel Export**
- Use exceljs to create workbook
- Sheets:
  1. Overview: header info
  2. BOM: materials table
  3. Measurements: POM + size chart
  4. Construction: callout instructions
  5. Flat Sketch: link or note
- Output: techpack.xlsx

**Download Links**
- `/project/{id}/export` page provides download buttons
- API routes serve files from storage

## Editor Approach

### Flat Sketch Editor (Konva.js)
Konva provides:
- Canvas-based rendering (good for complex SVG)
- Built-in drag/drop and transform tools
- Event handling for clicks
- Export to image formats

**Implementation:**
1. Parse SVG into Konva shapes (paths → Konva.Path)
2. Make groups draggable
3. Click handler for callout placement:
   - User clicks canvas → prompt for label
   - Create Konva.Circle (dot) + Konva.Line (leader) + Konva.Text (label)
   - Add to Callouts layer
4. Export Konva stage back to SVG XML
5. Save via API

**V1 Limitations:**
- No node-level path editing (too complex)
- Only group/shape dragging + callout placement
- Acceptable for MVP

### Tech Pack Editor (React Forms)
Simple React form with:
- Controlled inputs for header fields
- Dynamic table rows for BOM (add/remove/edit)
- CSV upload + parse with papaparse
- Editable table for size chart
- Callout-to-instruction mapping UI

## Future PLM Integration Notes

For future integration with PLM systems:

1. **API Layer**: Add REST API endpoints for external systems
2. **Data Sync**: 
   - Webhook notifications on project completion
   - Poll endpoint for status updates
   - Bulk export API
3. **Identity**: Add user authentication and multi-tenancy
4. **Mapping**: 
   - Map Fabrica categories to PLM categories
   - Map BOM fields to PLM material specs
   - Map measurements to PLM grading rules
5. **Versioning**: Add version control for tech packs
6. **Approval Workflow**: Add status states (draft → review → approved)

**Example Integration Flow:**
```
User uploads → Fabrica processes → Tech pack ready
→ Webhook to PLM → PLM creates product record
→ PLM fetches JSON/PDF via API → Stores in PLM
```

## Technology Choices

**Why better-sqlite3?**
- Synchronous API (simpler code)
- No external database needed
- Perfect for Replit
- Fast for read-heavy workloads

**Why Konva over Fabric.js?**
- Better React integration (react-konva)
- Simpler event handling
- Good SVG import support

**Why Potrace?**
- Industry-standard vectorization
- Proven algorithm (Potrace by Peter Selinger)
- Available as Node.js package

**Why Puppeteer primary, pdf-lib fallback?**
- Puppeteer: HTML→PDF gives best layout control
- pdf-lib: Pure JS, no Chrome needed (Replit fallback)

## Current Status

**Completed:**
- ✅ Scaffold (Step 1)
- ✅ Database schema and helpers
- ✅ File storage abstraction
- ✅ Landing page
- ✅ Basic layout

**Next Up (Step 2):**
- Upload form implementation
- Project creation API
- Status page with polling
- Job runner trigger
