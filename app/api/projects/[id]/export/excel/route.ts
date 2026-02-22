/**
 * GET /api/projects/[id]/export/excel
 *
 * Exports BOM + POM + Size Run as a .xlsx workbook using exceljs.
 *
 * Sheets:
 *   1. BOM — Bill of Materials with pricing columns
 *   2. POM — Points of Measure (base size)
 *   3. Size Run — grading table (measurements × sizes)
 */

import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import sharp from 'sharp';
import { getProject, getMeasurements, getBomItems, getSizeRun } from '@/lib/db';
import type { Measurement } from '@/lib/db';
import { fileExists, readFile, FILES } from '@/lib/storage';

export const runtime = 'nodejs';

// ── POM callout positions (0-100 relative to image dimensions) ─────────────
interface CalloutLine { x1: number; y1: number; x2: number; y2: number; }
const POM_CALLOUTS: Record<string, CalloutLine> = {
  body_length:      { x1: 8,  y1: 14, x2: 8,  y2: 90 },
  front_length:     { x1: 92, y1: 14, x2: 92, y2: 90 },
  chest_width:      { x1: 12, y1: 38, x2: 88, y2: 38 },
  shoulder_across:  { x1: 20, y1: 13, x2: 80, y2: 13 },
  hem_width:        { x1: 14, y1: 91, x2: 86, y2: 91 },
  sleeve_length:    { x1: 5,  y1: 14, x2: 5,  y2: 68 },
  upper_arm:        { x1: 5,  y1: 33, x2: 18, y2: 33 },
  cuff_width:       { x1: 5,  y1: 70, x2: 18, y2: 70 },
  cuff_height:      { x1: 3,  y1: 65, x2: 3,  y2: 73 },
  hood_height:      { x1: 50, y1: 2,  x2: 50, y2: 14 },
  hood_width:       { x1: 32, y1: 7,  x2: 68, y2: 7  },
  kangaroo_width:   { x1: 25, y1: 63, x2: 75, y2: 63 },
  pocket_height:    { x1: 73, y1: 55, x2: 73, y2: 72 },
  pocket_width:     { x1: 25, y1: 63, x2: 75, y2: 63 },
  zipper_length:    { x1: 50, y1: 14, x2: 50, y2: 89 },
  waist_width:      { x1: 15, y1: 8,  x2: 85, y2: 8  },
  hip_width:        { x1: 12, y1: 20, x2: 88, y2: 20 },
  thigh_width:      { x1: 15, y1: 38, x2: 55, y2: 38 },
  knee_width:       { x1: 15, y1: 62, x2: 55, y2: 62 },
  leg_opening:      { x1: 15, y1: 90, x2: 45, y2: 90 },
  inseam:           { x1: 50, y1: 20, x2: 50, y2: 90 },
  outseam:          { x1: 8,  y1: 8,  x2: 8,  y2: 90 },
  waistband_height: { x1: 92, y1: 8,  x2: 92, y2: 16 },
};

/**
 * Composite POM callout lines + letter badges onto a sketch image using sharp.
 * Returns a PNG buffer with the callout overlay baked in.
 */
async function compositeCallouts(buf: Buffer, measurements: Measurement[]): Promise<Buffer> {
  const meta = await sharp(buf).metadata();
  const W = meta.width  ?? 400;
  const H = meta.height ?? 560;

  const strokeW = Math.max(1.5, W / 200);
  const tickLen = Math.max(3, H / 100);
  const bSize   = Math.max(10, W / 30);
  const fontSize = Math.max(7, W / 45);

  const parts: string[] = [];

  measurements.forEach((m, idx) => {
    const c = POM_CALLOUTS[m.measurement_id];
    if (!c) return;
    const code = String.fromCharCode(65 + idx);

    const x1 = (c.x1 / 100) * W;
    const y1 = (c.y1 / 100) * H;
    const x2 = (c.x2 / 100) * W;
    const y2 = (c.y2 / 100) * H;
    const isHoriz = Math.abs(y2 - y1) < H * 0.03;
    const dash    = isHoriz ? `stroke-dasharray="${strokeW * 2.5} ${strokeW * 1.3}"` : '';

    parts.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ef4444" stroke-width="${strokeW}" ${dash}/>`);

    if (isHoriz) {
      parts.push(`<line x1="${x1}" y1="${y1 - tickLen}" x2="${x1}" y2="${y1 + tickLen}" stroke="#ef4444" stroke-width="${strokeW}"/>`);
      parts.push(`<line x1="${x2}" y1="${y2 - tickLen}" x2="${x2}" y2="${y2 + tickLen}" stroke="#ef4444" stroke-width="${strokeW}"/>`);
    } else {
      parts.push(`<line x1="${x1 - tickLen}" y1="${y1}" x2="${x1 + tickLen}" y2="${y1}" stroke="#ef4444" stroke-width="${strokeW}"/>`);
      parts.push(`<line x1="${x2 - tickLen}" y1="${y2}" x2="${x2 + tickLen}" y2="${y2}" stroke="#ef4444" stroke-width="${strokeW}"/>`);
    }

    const bX = (c.x1 < 50 ? x1 - bSize : x1);
    const bY = y1 - bSize / 2;
    parts.push(`<rect x="${bX}" y="${bY}" width="${bSize}" height="${bSize}" rx="${bSize * 0.15}" fill="#ef4444"/>`);
    parts.push(`<text x="${bX + bSize / 2}" y="${bY + bSize * 0.72}" font-size="${fontSize}" font-weight="700" fill="#fff" text-anchor="middle" font-family="monospace">${code}</text>`);
  });

  const svg    = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${parts.join('')}</svg>`;
  const svgBuf = Buffer.from(svg);

  return sharp(buf)
    .composite([{ input: svgBuf, top: 0, left: 0 }])
    .png()
    .toBuffer();
}

/** Detect image extension from buffer magic bytes. */
function imageExtension(buf: Buffer): 'jpeg' | 'png' {
  return (buf[0] === 0xFF && buf[1] === 0xD8) ? 'jpeg' : 'png';
}

/** Try to load a sketch file: user-uploaded first, then AI-generated. Returns null if neither found. */
function loadSketch(projectId: string, userFile: string, aiFile: string): Buffer | null {
  if (fileExists(projectId, userFile)) return readFile(projectId, userFile);
  if (fileExists(projectId, aiFile))   return readFile(projectId, aiFile);
  return null;
}

const DARK_FILL: ExcelJS.Fill = {
  type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1C1917' },
};
const ALT_FILL: ExcelJS.Fill = {
  type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F4' },
};
const WHITE_FILL: ExcelJS.Fill = {
  type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' },
};

function headerStyle(bold = true): Partial<ExcelJS.Style> {
  return {
    font:      { bold, color: { argb: 'FFFFFFFF' }, size: 10 },
    fill:      DARK_FILL,
    alignment: { vertical: 'middle', wrapText: true },
    border: {
      bottom: { style: 'thin', color: { argb: 'FF44403C' } },
    },
  };
}

function applyHeaderRow(row: ExcelJS.Row) {
  row.height = 22;
  row.eachCell(cell => Object.assign(cell, headerStyle()));
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const project = getProject(params.id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const measurements = getMeasurements(params.id);
  const bomItems     = getBomItems(params.id);
  const sizeRunRows  = getSizeRun(params.id);

  const wb = new ExcelJS.Workbook();
  wb.creator  = 'Fabrica';
  wb.created  = new Date();
  wb.modified = new Date();

  // Load sketch buffers and register images once in the workbook (IDs reused across sheets)
  const frontBuf   = loadSketch(params.id, FILES.SKETCH_FRONT, FILES.AI_SKETCH_FRONT);
  const backBuf    = loadSketch(params.id, FILES.SKETCH_BACK,  FILES.AI_SKETCH_BACK);
  const frontImgId = frontBuf ? wb.addImage({ buffer: frontBuf, extension: imageExtension(frontBuf) }) : null;
  const backImgId  = backBuf  ? wb.addImage({ buffer: backBuf,  extension: imageExtension(backBuf)  }) : null;

  // POM sheet uses a version of the front sketch with callout lines composited on top.
  let pomImgId: number | null = frontImgId;
  if (frontBuf && measurements.length > 0) {
    try {
      const pomBuf = await compositeCallouts(frontBuf, measurements);
      pomImgId = wb.addImage({ buffer: pomBuf, extension: 'png' });
    } catch {
      // If compositing fails, fall back to the plain sketch
      pomImgId = frontImgId;
    }
  }

  // ── Sheet 1: Sketches ────────────────────────────────────────────────────────

  {
    const ws = wb.addWorksheet('Sketches');
    ws.getColumn('A').width = 42;
    ws.getColumn('B').width = 42;

    // Title
    ws.mergeCells('A1:B1');
    ws.getCell('A1').value = `FLAT SKETCHES — ${project.style_name}`;
    ws.getCell('A1').style = { font: { bold: true, size: 13 }, alignment: { vertical: 'middle' } };
    ws.getRow(1).height = 28;

    ws.mergeCells('A2:B2');
    ws.getCell('A2').value = `Style: ${project.style_number ?? '—'}  ·  Season: ${project.season ?? '—'}  ·  Generated by Fabrica`;
    ws.getCell('A2').style = { font: { size: 9, color: { argb: 'FF78716C' } } };
    ws.getRow(2).height = 16;

    // Labels row
    ws.getRow(3).height = 16;
    ws.getCell('A3').value = 'FRONT VIEW';
    ws.getCell('B3').value = 'BACK VIEW';
    ws.getCell('A3').style = { font: { bold: true, size: 9, color: { argb: 'FF78716C' } }, alignment: { horizontal: 'center' } };
    ws.getCell('B3').style = { font: { bold: true, size: 9, color: { argb: 'FF78716C' } }, alignment: { horizontal: 'center' } };

    // Reserve rows for images (row 4 → 34, ~30 rows ≈ 450px)
    for (let r = 4; r <= 34; r++) ws.getRow(r).height = 15;

    if (frontImgId !== null) ws.addImage(frontImgId, { tl: { col: 0, row: 3 }, ext: { width: 300, height: 420 } });
    if (backImgId  !== null) ws.addImage(backImgId,  { tl: { col: 1, row: 3 }, ext: { width: 300, height: 420 } });
    if (frontImgId === null && backImgId === null) {
      ws.getCell('A4').value = 'No sketches generated yet.';
      ws.getCell('A4').style = { font: { size: 10, color: { argb: 'FF78716C' } } };
    }
  }

  // ── Sheet 2: BOM ────────────────────────────────────────────────────────────

  {
    const ws = wb.addWorksheet('BOM');

    // Title row
    ws.mergeCells('A1:G1');
    const titleCell = ws.getCell('A1');
    titleCell.value = `BILL OF MATERIALS — ${project.style_name}`;
    titleCell.style = { font: { bold: true, size: 13 }, alignment: { vertical: 'middle' } };
    ws.getRow(1).height = 28;

    // Subtitle
    ws.mergeCells('A2:G2');
    const subtitleCell = ws.getCell('A2');
    subtitleCell.value = `Style: ${project.style_number ?? '—'}  ·  Season: ${project.season ?? '—'}  ·  Generated by Fabrica`;
    subtitleCell.style = { font: { size: 9, color: { argb: 'FF78716C' } } };
    ws.getRow(2).height = 16;

    ws.addRow([]); // spacer

    // Headers
    const headerRow = ws.addRow(['Component', 'Category', 'Material', 'Composition', '$/Unit', 'Qty / Consumption', 'Waste %', 'Total Cost']);
    applyHeaderRow(headerRow);
    ws.columns = [
      { key: 'component',    width: 24 },
      { key: 'category',     width: 14 },
      { key: 'material',     width: 20 },
      { key: 'composition',  width: 22 },
      { key: 'unit_price',   width: 10 },
      { key: 'consumption',  width: 18 },
      { key: 'wastage',      width: 10 },
      { key: 'total_cost',   width: 12 },
    ];

    let totalMaterials = 0;
    const BOM_ORDER = ['fabric', 'trim', 'label', 'packaging', 'thread'];

    for (const cat of BOM_ORDER) {
      const items = bomItems.filter(b => b.category === cat);
      if (items.length === 0) continue;

      // Category header row
      const catRow = ws.addRow([cat.toUpperCase()]);
      catRow.height = 18;
      catRow.getCell(1).style = {
        font:      { bold: true, size: 9, color: { argb: 'FF78716C' } },
        fill:      ALT_FILL,
        alignment: { vertical: 'middle' },
      };
      ws.mergeCells(`A${catRow.number}:H${catRow.number}`);

      items.forEach((b, idx) => {
        const row = ws.addRow([
          b.component,
          b.category,
          b.material,
          b.composition,
          b.unit_price ?? null,
          b.consumption ?? 1,
          b.wastage != null ? b.wastage / 100 : 0,
          b.total_cost ?? null,
        ]);
        row.height = 16;

        const fill = idx % 2 === 0 ? WHITE_FILL : ALT_FILL;
        row.eachCell(cell => {
          cell.fill = fill;
          cell.alignment = { vertical: 'middle', wrapText: true };
          cell.font = { size: 9 };
          cell.border = { bottom: { style: 'hair', color: { argb: 'FFE7E5E4' } } };
        });

        // Format number cells
        const priceCell = row.getCell(5);
        priceCell.numFmt = '$#,##0.00';
        const wasteCell  = row.getCell(7);
        wasteCell.numFmt = '0%';
        const totalCell  = row.getCell(8);
        totalCell.numFmt = '$#,##0.00';
        totalCell.font   = { bold: true, size: 9 };

        totalMaterials += b.total_cost ?? 0;
      });
    }

    // Total row
    ws.addRow([]);
    const totalRow = ws.addRow(['', '', '', '', '', '', 'TOTAL MATERIALS', totalMaterials]);
    totalRow.height = 20;
    totalRow.getCell(7).style = { font: { bold: true, size: 10 }, alignment: { horizontal: 'right' } };
    totalRow.getCell(8).style = { font: { bold: true, size: 10, color: { argb: 'FF1C1917' } }, numFmt: '$#,##0.00' };
    totalRow.getCell(8).numFmt = '$#,##0.00';
  }

  // ── Sheet 2: POM ────────────────────────────────────────────────────────────

  {
    const ws = wb.addWorksheet('POM');

    ws.mergeCells('A1:F1');
    ws.getCell('A1').value = `POINTS OF MEASURE — ${project.style_name}`;
    ws.getCell('A1').style = { font: { bold: true, size: 13 }, alignment: { vertical: 'middle' } };
    ws.getRow(1).height = 28;

    ws.mergeCells('A2:F2');
    ws.getCell('A2').value = `Base size: ${project.base_size ?? 'M'}  ·  Values in inches`;
    ws.getCell('A2').style = { font: { size: 9, color: { argb: 'FF78716C' } } };
    ws.getRow(2).height = 16;

    ws.addRow([]);

    const headerRow = ws.addRow(['Code', 'Point of Measure', 'Group', 'How to Measure', 'Base Value (in)', 'Tolerance ±"']);
    applyHeaderRow(headerRow);
    ws.columns = [
      { key: 'code',      width: 8  },
      { key: 'label',     width: 30 },
      { key: 'group',     width: 14 },
      { key: 'how_to',    width: 28 },
      { key: 'value',     width: 16 },
      { key: 'tolerance', width: 14 },
    ];

    measurements.forEach((m, idx) => {
      const code = String.fromCharCode(65 + idx);
      const row  = ws.addRow([
        code,
        m.label,
        m.group_name ?? '',
        m.measurement_point ?? '',
        m.base_value ?? null,
        m.tolerance ?? null,
      ]);
      row.height = 16;
      const fill = idx % 2 === 0 ? WHITE_FILL : ALT_FILL;
      row.eachCell(cell => {
        cell.fill      = fill;
        cell.font      = { size: 9 };
        cell.alignment = { vertical: 'middle', wrapText: true };
        cell.border    = { bottom: { style: 'hair', color: { argb: 'FFE7E5E4' } } };
      });
      row.getCell(5).numFmt = '0.00';
      row.getCell(6).numFmt = '0.00';
    });

    if (measurements.length === 0) {
      ws.addRow(['No measurements entered yet.']);
    }

    // Embed POM sketch with callout lines to the right of the table (column H onward)
    if (pomImgId !== null) {
      ws.getColumn(8).width = 36;
      ws.getColumn(9).width = 36;
      ws.addImage(pomImgId, { tl: { col: 7, row: 3 }, ext: { width: 260, height: 380 } });
      ws.getCell('H1').value = 'POM SKETCH (with callouts)';
      ws.getCell('H1').style = { font: { bold: true, size: 9, color: { argb: 'FF78716C' } } };
    }
  }

  // ── Sheet 3: Size Run ──────────────────────────────────────────────────────

  {
    const ws = wb.addWorksheet('Size Run');

    ws.mergeCells('A1:A1');
    ws.getCell('A1').value = `SIZE RUN — ${project.style_name}`;
    ws.getCell('A1').style = { font: { bold: true, size: 13 }, alignment: { vertical: 'middle' } };
    ws.getRow(1).height = 28;

    ws.mergeCells('A2:A2');
    ws.getCell('A2').value = `Base size: ${project.base_size ?? 'M'}  ·  Values in inches`;
    ws.getCell('A2').style = { font: { size: 9, color: { argb: 'FF78716C' } } };
    ws.getRow(2).height = 16;

    ws.addRow([]);

    if (sizeRunRows.length === 0) {
      ws.addRow(['No size run generated yet.']);
    } else {
      const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL'];
      const uniqueSizes = [...new Set(sizeRunRows.map(r => r.size_label))]
        .sort((a, b) => {
          const ai = SIZE_ORDER.indexOf(a);
          const bi = SIZE_ORDER.indexOf(b);
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        });
      const measurementIds = [...new Set(sizeRunRows.map(r => r.measurement_id))];

      // POM label map
      const pomLabelMap: Record<string, string> = {};
      for (const m of measurements) pomLabelMap[m.measurement_id] = m.label;

      // Header row: "Measurement" + size labels
      const headerRow = ws.addRow(['Measurement', ...uniqueSizes]);
      applyHeaderRow(headerRow);

      // Set column widths
      ws.getColumn(1).width = 30;
      uniqueSizes.forEach((_, i) => { ws.getColumn(i + 2).width = 10; });

      // Find base size column index
      const baseSizeIdx = uniqueSizes.indexOf(project.base_size ?? 'M');

      measurementIds.forEach((mid, idx) => {
        const label = pomLabelMap[mid] ?? mid;
        const rowData: (string | number | null)[] = [label];
        for (const sz of uniqueSizes) {
          const cell = sizeRunRows.find(r => r.measurement_id === mid && r.size_label === sz);
          rowData.push(cell ? cell.value : null);
        }
        const row  = ws.addRow(rowData);
        row.height = 16;
        const fill = idx % 2 === 0 ? WHITE_FILL : ALT_FILL;
        row.eachCell((cell, colNumber) => {
          cell.fill      = fill;
          cell.font      = { size: 9 };
          cell.alignment = { vertical: 'middle' };
          cell.border    = { bottom: { style: 'hair', color: { argb: 'FFE7E5E4' } } };
          // Bold the base size column
          if (colNumber === baseSizeIdx + 2) {
            cell.font = { bold: true, size: 9 };
          }
          if (colNumber > 1) cell.numFmt = '0.00';
        });
      });
    }
  }

  // ── Serialize ──────────────────────────────────────────────────────────────

  const buffer = await wb.xlsx.writeBuffer();
  const slug   = project.style_name.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 40);

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="techpack_${slug}.xlsx"`,
    },
  });
}
