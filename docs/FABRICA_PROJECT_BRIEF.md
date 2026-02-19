# FABRICA — Complete Project Brief for Claude Code

## What This Document Is

This is the complete product specification, architecture decisions, and build plan for Fabrica — a tech pack creation platform for fashion designers. Feed this entire document to Claude Code so it has full context of every decision made. The GitHub repo is at: https://github.com/Matthew17Tsai/Fabrica

---

## Product Vision

Fabrica simplifies the fashion design workflow from **inspiration → editable flat sketch → tech pack → factory sample request**.

**Core value proposition:** "Upload your inspiration image, get an editable vector flat sketch and complete tech pack — ready for factory."

**Target users:** Fashion designers who need to create tech packs for garment manufacturing.

**The problem:** Creating a tech pack today requires multiple disconnected tools — Illustrator for flat sketches, Excel for measurements, separate templates for BOM. Fabrica consolidates this into one workflow.

---

## The Workflow (Option C — Hybrid Approach)

We chose a hybrid approach where Fabrica handles the tech pack intelligence, and designers use Adobe Illustrator for detailed flat sketch refinement.

### Step 1: Inspiration Input
Designer uploads whatever they have:
- A product photo of an existing garment
- A hand-drawn sketch
- A mood board image
- An AI-generated render
- Any visual reference

### Step 2: AI Flat Sketch Generation (via Adobe Firefly API)
Fabrica sends the uploaded image to the **Adobe Firefly API** using the **Text to Vector** feature with the uploaded image as a structure reference. Firefly generates a **native SVG vector flat sketch** — NOT a raster image.

**Key discovery:** Adobe Firefly has a Text-to-Vector feature that outputs clean, editable .svg files directly. This eliminates the need for any raster-to-vector conversion (no need for Vectorizer.AI, potrace, VTracer, or OpenCV tracing). The Firefly Node.js SDK (`@adobe/firefly-apis`) integrates directly into the Next.js stack.

Prompt strategy: "Technical flat sketch of [garment type], [features], front view, clean vector outlines, fashion industry technical drawing style, no shading"

The system generates both **front view** and **back view** flat sketches.

### Step 3: AI Analysis (via OpenAI Vision — already built)
Simultaneously, the existing OpenAI Vision system (`lib/ai/openaiVision.ts`) analyzes the uploaded image and detects:
- **Garment type:** hoodie, sweatshirt, sweatpants (and sub-variants)
- **Features:** zip/pullover, kangaroo pocket, hood style, drawcord, rib cuffs/hem
- **Fit:** oversized, regular, slim
- **Material detection:** fabric type (French terry, fleece, jersey), weight estimate
- **Color:** primary color, accent colors
- **Construction details:** seam types, shoulder style (drop/set-in), stitch details
- **Logo/branding placement:** position and type (embroidery, print, etc.)

### Step 4: Measurement Pre-fill
Based on the detected garment type, fit, and designer's selected base size (XS–XXL), the system pre-fills all **Points of Measure (POM)** with industry-standard measurements. Designer adjusts values as needed.

### Step 5: Designer Review & Edit
Interactive page showing:
- **Left:** The generated flat sketch (front + back views) with measurement callout lines overlaid
- **Right:** Editable measurement table with all POM values
- Designer can override any measurement value
- Designer can download the SVG to refine in Illustrator
- Designer can re-upload a refined SVG back into the project

### Step 6: Tech Pack Assembly
Designer fills in:
- **BOM (Bill of Materials):** fabric, trims, labels, thread — pre-filled from AI detection + templates
- **Construction notes:** sewing instructions, special techniques
- **Colorways:** color variants if applicable
- **Size grading:** (future feature — single size for MVP)

### Step 7: Export
- **PDF tech pack** — factory-ready document with flat sketch, measurement spec sheet, BOM, construction notes
- **Excel measurement spec** — grading table format
- **SVG flat sketch download** — for Illustrator editing
- **JSON data** — for programmatic access

---

## Garment Types & Variants (MVP Scope)

### Hoodies (4 variants)
1. **Oversized Hoodie** — no pocket, no zip, oversized fit (template: Hoodie.png)
2. **Pullover Hoodie** — kangaroo pocket, regular fit (template: Pullover_Hoodie.png)
3. **Zip Hoodie** — full zip, kangaroo pocket, oversized (template: Zipper_Hoodie.png)
4. **Unisex Hoodie** — kangaroo pocket, different hood style (template: Unisex_Hoodie.png)

### Sweatshirts (1 variant)
1. **Crewneck Sweatshirt** — crew neck, rib details, oversized (template: Crewneck.png)

### Sweatpants (1 variant)
1. **Sweatpants** — tapered, side pockets front, back patch pockets, rib cuffs (template: Sweat_Pants.png)

Template images are stored in the repo and serve as visual references. The actual flat sketch output comes from Firefly API.

---

## Measurement System (POM — Points of Measure)

All measurements in **inches**. Industry-standard tolerance ranges. The system should support both inches and centimeters (toggle).

### Hoodie POM (18 measurements)
| ID | Label | Description | Tolerance | Default M |
|----|-------|-------------|-----------|-----------|
| body_length | Body Length | HPS to bottom hem | ±0.5" | 28.0" |
| chest_width | Chest Width | 1" below armhole, laid flat | ±0.5" | 23.0" |
| shoulder_across | Shoulder Across | Shoulder seam to shoulder seam | ±0.25" | 21.0" |
| sleeve_length | Sleeve Length | Center back neck to cuff edge | ±0.5" | 34.5" |
| upper_arm | Upper Arm Width | Bicep area, laid flat | ±0.25" | 9.5" |
| cuff_width | Cuff Width | Rib cuff opening, laid flat | ±0.25" | 4.0" |
| hem_width | Bottom Hem Width | Rib hem, laid flat | ±0.5" | 22.0" |
| hood_height | Hood Height | Back neck to top of hood | ±0.5" | 14.0" |
| hood_width | Hood Width | Hood opening width | ±0.5" | 12.0" |
| neck_opening | Neck Opening | Neckline circumference/width | ±0.25" | 9.0" |
| armhole_straight | Armhole Straight | Straight measurement | ±0.25" | 11.5" |
| armhole_curved | Armhole Curved | Along curve | ±0.5" | 22.0" |
| pocket_width | Kangaroo Pocket Width | If applicable | ±0.25" | 13.0" |
| pocket_height | Kangaroo Pocket Height | If applicable | ±0.25" | 8.0" |
| front_length | Front Length | CF neck to hem | ±0.5" | 26.5" |
| cuff_height | Cuff Rib Height | Height of rib band at cuff | ±0.25" | 3.0" |
| hem_rib_height | Hem Rib Height | Height of rib band at hem | ±0.25" | 3.0" |
| zipper_length | Zipper Length | If applicable (zip hoodie) | ±0.5" | 25.0" |

### Sweatshirt POM (14 measurements)
Same as hoodie minus hood measurements (hood_height, hood_width), plus:
| ID | Label | Description | Tolerance | Default M |
|----|-------|-------------|-----------|-----------|
| neckband_width | Neckband Width | Crew neck rib width | ±0.25" | 7.5" |
| neckband_height | Neckband Height | Crew neck rib height | ±0.25" | 1.0" |

### Sweatpants POM (14 measurements)
| ID | Label | Description | Tolerance | Default M |
|----|-------|-------------|-----------|-----------|
| waist_relaxed | Waist Relaxed | Waistband laid flat, relaxed | ±0.5" | 16.0" |
| waist_stretched | Waist Stretched | Waistband fully stretched | ±0.5" | 22.0" |
| hip_width | Hip Width | Widest point, laid flat | ±0.5" | 24.0" |
| front_rise | Front Rise | Waistband to crotch seam (front) | ±0.25" | 12.5" |
| back_rise | Back Rise | Waistband to crotch seam (back) | ±0.25" | 15.0" |
| inseam | Inseam | Crotch to hem | ±0.5" | 30.0" |
| outseam | Outseam | Waist to hem (side) | ±0.5" | 41.0" |
| thigh_width | Thigh Width | 1" below crotch, laid flat | ±0.25" | 13.5" |
| knee_width | Knee Width | At knee, laid flat | ±0.25" | 9.5" |
| leg_opening | Leg Opening | Hem circumference/width | ±0.25" | 6.5" |
| waistband_height | Waistband Height | Height of elastic waistband | ±0.25" | 2.5" |
| drawcord_length | Drawcord Length | Total exposed length | ±0.5" | 24.0" |
| side_pocket_depth | Side Pocket Depth | Opening to bottom | ±0.25" | 7.5" |
| back_pocket_width | Back Pocket Width | Patch pocket width | ±0.25" | 6.5" |

### Base Size Templates
Provide default measurements for sizes XS through XXL. The designer selects a base size and all measurements pre-fill. They can then adjust individual values.

Fit variants affect the base measurements:
- **Oversized fit:** +2–3" on chest, +1–2" on body length, drop shoulder
- **Regular fit:** standard measurements
- **Slim fit:** -1–2" on chest, closer sleeve

---

## BOM (Bill of Materials) Templates

### Hoodie BOM (pre-filled, editable)
| Component | Material | Composition | Weight | Notes |
|-----------|----------|-------------|--------|-------|
| Body Fabric | French Terry | 80% Cotton / 20% Polyester | 280 GSM | Main body, sleeves, hood |
| Rib Fabric | 1x1 Rib | 95% Cotton / 5% Spandex | 240 GSM | Cuffs and hem |
| Drawcord | Flat Drawcord | 100% Cotton | 5mm width | Hood drawstring |
| Grommets | Brass Grommets | Metal | 10mm ID | 2 pcs for drawcord |
| Zipper | YKK Metal Zipper | Metal/Polyester | #5 gauge | Full front (zip variant) |
| Main Label | Woven Label | Polyester | Standard | Inside back neck |
| Size Label | Printed Label | Polyester Satin | Standard | Inside side seam |
| Care Label | Printed Label | Polyester Satin | Standard | Inside side seam |
| Thread | Poly-Poly Thread | 100% Polyester | 40/2 | All construction |

### Sweatshirt BOM
Same as hoodie minus drawcord, grommets, zipper. Plus neckband rib may be different weight.

### Sweatpants BOM
| Component | Material | Composition | Weight | Notes |
|-----------|----------|-------------|--------|-------|
| Body Fabric | French Terry | 80% Cotton / 20% Polyester | 280 GSM | Main body, legs |
| Rib Fabric | 1x1 Rib | 95% Cotton / 5% Spandex | 240 GSM | Leg cuffs |
| Elastic | Woven Elastic | Polyester/Rubber | 35mm width | Waistband |
| Drawcord | Flat Drawcord | 100% Cotton | 5mm width | Waistband |
| Pocket Bag | Pocket Lining | 100% Cotton | 150 GSM | Side + back pockets |
| Main Label | Woven Label | Polyester | Standard | Inside back waist |
| Size Label | Printed Label | Polyester Satin | Standard | Inside side seam |
| Thread | Poly-Poly Thread | 100% Polyester | 40/2 | All construction |

---

## Tech Stack

### Current (keep)
- **Next.js 14** (App Router) — framework
- **TypeScript** — language
- **Tailwind CSS** — styling
- **SQLite (better-sqlite3)** — database
- **Sharp** — image processing
- **React** — UI

### Add
- **Adobe Firefly API** (`@adobe/firefly-apis` Node SDK) — flat sketch SVG generation
- **OpenAI API** (already in package.json) — vision analysis, expand the prompt
- **ExcelJS** (already in package.json) — Excel export
- **pdf-lib** (already in package.json) — PDF export

### Remove / Replace
- **potrace** — no longer needed (Firefly generates SVGs directly)
- **puppeteer** — replace with pdf-lib for PDF generation (lighter weight)
- **konva / react-konva** — evaluate if still needed; the editor may be simpler HTML/SVG-based
- **lib/processing/lineart.ts, vectorize.ts, preprocess.ts** — no longer needed
- **lib/parametric/generateFlatSvg.ts** — replace with Firefly API + template system

---

## Database Schema

### Existing tables (keep, expand)

**projects**
- id (TEXT PK)
- created_at (TEXT)
- title (TEXT)
- category (TEXT) — 'hoodie' | 'sweatshirt' | 'sweatpants'
- status (TEXT) — 'uploaded' | 'processing' | 'ready' | 'error'
- error_message (TEXT NULL)
- **NEW: sub_type** (TEXT) — 'oversized_hoodie' | 'pullover_hoodie' | 'zip_hoodie' | 'unisex_hoodie' | 'crewneck' | 'sweatpants'
- **NEW: fit** (TEXT) — 'oversized' | 'regular' | 'slim'
- **NEW: base_size** (TEXT) — 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL'
- **NEW: detected_color** (TEXT NULL) — hex color from AI detection
- **NEW: detected_material** (TEXT NULL) — material description from AI
- **NEW: ai_analysis_json** (TEXT NULL) — full AI analysis result as JSON

**assets** — keep as-is

**jobs** — keep as-is

**techpacks** — keep as-is

### New tables

**measurements**
- id (TEXT PK)
- project_id (TEXT FK → projects)
- measurement_id (TEXT) — e.g., 'chest_width', 'body_length'
- label (TEXT)
- value_inches (REAL NULL) — the actual measurement
- tolerance (REAL) — tolerance in inches
- notes (TEXT NULL)
- created_at (TEXT)
- updated_at (TEXT)

**bom_items**
- id (TEXT PK)
- project_id (TEXT FK → projects)
- component (TEXT) — e.g., 'Body Fabric'
- material (TEXT)
- composition (TEXT)
- weight (TEXT)
- supplier (TEXT NULL)
- color (TEXT NULL)
- notes (TEXT NULL)
- sort_order (INTEGER)

**construction_notes**
- id (TEXT PK)
- project_id (TEXT FK → projects)
- section (TEXT) — e.g., 'seams', 'finishing', 'labels'
- content (TEXT)
- sort_order (INTEGER)

---

## API Routes

### Existing (keep/modify)
- `POST /api/upload` — upload image, create project
- `GET /api/jobs/[id]` — get job status
- `GET /api/projects/[id]` — get project details

### New routes needed
- `POST /api/projects/[id]/generate-flat` — trigger Firefly SVG generation
- `GET /api/projects/[id]/flat-sketch` — get generated SVG
- `POST /api/projects/[id]/upload-refined-svg` — re-upload Illustrator-refined SVG
- `GET /api/projects/[id]/measurements` — get all measurements
- `PUT /api/projects/[id]/measurements` — update measurements
- `POST /api/projects/[id]/measurements/prefill` — load template measurements for size
- `GET /api/projects/[id]/bom` — get BOM
- `PUT /api/projects/[id]/bom` — update BOM
- `GET /api/projects/[id]/techpack` — get full tech pack data
- `POST /api/projects/[id]/export/pdf` — generate and download PDF
- `POST /api/projects/[id]/export/excel` — generate and download Excel
- `GET /api/projects/[id]/export/svg` — download SVG for Illustrator

### Vision API enhancement
- `POST /api/vision/analyze` — expanded AI analysis endpoint

---

## Pages / UI

### Existing pages
- `/` — Home page (keep, update copy)
- `/new` — New project form (update with new fields)
- `/project/[id]` — Project page (rebuild)

### New/Updated pages

**`/new` — Create Project**
- Upload image
- Enter project title
- Select garment category (hoodie / sweatshirt / sweatpants)
- Select base size (XS–XXL)
- Select fit (oversized / regular / slim)
- Submit → creates project, triggers AI analysis + Firefly generation

**`/project/[id]` — Project Dashboard**
Tab-based interface:
1. **Overview** — project details, status, uploaded image vs. generated flat sketch side-by-side
2. **Flat Sketch** — front + back view display, download SVG button, re-upload button
3. **Measurements** — interactive measurement editor with flat sketch + callout lines
4. **BOM** — editable bill of materials table
5. **Construction** — construction notes editor
6. **Export** — PDF preview, download buttons (PDF, Excel, SVG, JSON)

---

## AI Vision Prompt Enhancement

The current `openaiVision.ts` detects garment params as 0-1 ratios. Expand to also detect:

```typescript
interface ExpandedAnalysis {
  // Existing
  category: GarmentCategory;
  params: GarmentParams;
  features: GarmentFeatures;
  confidence: number;

  // New
  fit: 'oversized' | 'regular' | 'slim';
  material: {
    primary: string;       // e.g., "French Terry"
    weight_estimate: string; // e.g., "280 GSM"
    composition_guess: string; // e.g., "80% Cotton / 20% Polyester"
  };
  color: {
    primary_hex: string;   // e.g., "#4B5D52"
    primary_name: string;  // e.g., "Forest Green"
    accent_hex?: string;
  };
  construction: {
    shoulder_type: 'drop' | 'set-in' | 'raglan';
    sleeve_style: 'regular' | 'balloon' | 'tapered';
    seam_type: 'flatlock' | 'overlock' | 'coverstitch';
    hem_style: 'rib' | 'raw' | 'folded' | 'elastic';
    cuff_style: 'rib' | 'raw' | 'elastic' | 'open';
  };
  branding?: {
    position: string;      // e.g., "left chest"
    type: string;          // e.g., "embroidered logo"
    description: string;
  };
  sub_type: string;        // e.g., "zip_hoodie", "pullover_hoodie"
}
```

---

## Firefly Integration Notes

### API Setup
- Requires Adobe Creative Cloud developer credentials (CLIENT_ID + CLIENT_SECRET)
- Node.js SDK: `@adobe/firefly-apis`
- Authentication: OAuth client credentials flow
- Rate limits: 4 req/min default, 9,000/day

### Flat Sketch Generation Prompt Strategy
For each garment, construct a prompt like:
```
"Technical flat sketch of an oversized zip hoodie with kangaroo pocket, front view.
Clean black vector outlines on white background.
Fashion industry technical drawing style.
Include construction details: shoulder seams, side seams, rib cuffs, rib hem, zipper, pocket opening.
No shading, no color fill, no background elements."
```

Generate separately for front and back views.

Use the uploaded designer image as a **structure reference** so the generated flat sketch matches the proportions and silhouette of their design.

### SVG Output Requirements
The Firefly-generated SVG should be Illustrator-compatible:
- Clean, editable vector paths
- Proper layer structure if possible
- Scalable without quality loss

---

## Build Priority (Phase Order)

### Phase 1: Data Layer & Measurement System
- Expand database schema (new tables + columns)
- Create measurement template JSON files for all garment types + sizes
- Build measurement CRUD API routes
- Build BOM template system

### Phase 2: AI Analysis Enhancement
- Expand OpenAI Vision prompt for material, color, construction detection
- Build `/api/vision/analyze` endpoint
- Store analysis results in project record

### Phase 3: Firefly Integration
- Set up Adobe Firefly API authentication
- Build `/api/projects/[id]/generate-flat` endpoint
- SVG storage and retrieval
- Front + back view generation

### Phase 4: Project UI — Measurement Editor
- Build the measurement review page
- Flat sketch display with measurement callout overlay
- Editable measurement table
- Front/back view toggle

### Phase 5: Tech Pack Assembly UI
- BOM editor page
- Construction notes page
- Full tech pack preview

### Phase 6: Export
- PDF tech pack generation (pdf-lib)
- Excel measurement spec (ExcelJS)
- SVG download + re-upload flow

---

## Environment Variables Needed

```env
# Existing
OPENAI_API_KEY=...
OPENAI_VISION_MODEL=gpt-4o-mini

# New — Adobe Firefly
ADOBE_CLIENT_ID=...
ADOBE_CLIENT_SECRET=...
```

---

## Template Images Available

The following template reference images are in the repo (uploaded by the user). They serve as visual references for what the generated flat sketches should look like:

1. `Hoodie.png` — Oversized hoodie, no pocket, no zip (front + back, black bg)
2. `Pullover_Hoodie.png` — Regular fit hoodie, kangaroo pocket (front + back, black bg)
3. `Zipper_Hoodie.png` — Oversized zip hoodie, kangaroo pocket (front + back, black bg)
4. `Unisex_Hoodie.png` — Regular fit hoodie, different hood style (front + back, black bg)
5. `Crewneck.png` — Oversized crewneck sweatshirt (front + back, black bg)
6. `Sweat_Pants.png` — Tapered sweatpants, side + back pockets (front + back, black bg)

All images are professional-quality flat sketches with gray garment fill on black backgrounds, showing construction details like rib texture, stitch lines, seams, and pocket construction.

---

## Key Design Decisions (Do Not Re-debate)

1. **Hybrid approach (Option C):** Fabrica generates flat sketch + measurements + tech pack. Designer refines flat sketch in Illustrator if needed.
2. **Firefly for SVG generation:** Adobe Firefly Text-to-Vector generates native SVG. No raster-to-vector conversion needed.
3. **Measurement accuracy target: 80-90%.** AI pre-fills, designer fine-tunes before sending to factory.
4. **Industry tolerance ranges:** As specified in the POM tables above.
5. **Start with 3 garment categories:** Hoodie (4 variants), Sweatshirt (1), Sweatpants (1).
6. **Both digital and physical input:** System handles both inspiration images and photos of physical garments.
7. **Unisex sizing for MVP.** Can add gendered sizing later.
8. **Inches as primary unit** with cm toggle.
9. **Single size for MVP.** Size grading (S/M/L/XL with grade rules) is a v2 feature.
10. **No built-in vector editor.** Designer uses Illustrator for flat sketch refinement.
