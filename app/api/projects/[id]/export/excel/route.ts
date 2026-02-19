/**
 * GET /api/projects/[id]/export/excel
 * Generates and streams an Excel workbook with:
 *   - Project Info sheet
 *   - Measurements sheet (inches + cm)
 *   - Bill of Materials sheet
 *   - Construction Notes sheet
 */
import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { getProject, getMeasurements, getBomItems, getConstructionNotes } from '@/lib/db';

export const runtime = 'nodejs';

const NAVY_ARGB   = 'FF1E3A5F';
const WHITE_ARGB  = 'FFFFFFFF';
const LGRAY_ARGB  = 'FFF5F5F5';
const GRAY_ARGB   = 'FF6B7280';

function inToCm(n: number) { return Math.round(n * 2.54 * 10) / 10; }

function styleHeader(row: ExcelJS.Row) {
  row.height = 22;
  row.eachCell((cell) => {
    cell.font      = { bold: true, color: { argb: WHITE_ARGB }, size: 10, name: 'Helvetica' };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_ARGB } };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    cell.border    = { bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } } };
  });
}

function styleData(row: ExcelJS.Row, alt: boolean) {
  row.height = 18;
  row.eachCell((cell) => {
    if (alt) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LGRAY_ARGB } };
    }
    cell.font      = { size: 9, name: 'Helvetica' };
    cell.alignment = { vertical: 'middle' };
    cell.border    = { bottom: { style: 'hair', color: { argb: 'FFDDDDDD' } } };
  });
}

const SUB_LABELS: Record<string, string> = {
  oversized_hoodie: 'Oversized Hoodie',
  pullover_hoodie:  'Pullover Hoodie',
  zip_hoodie:       'Zip Hoodie',
  unisex_hoodie:    'Unisex Hoodie',
  crewneck:         'Crewneck Sweatshirt',
  sweatpants:       'Sweatpants',
};

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
  const construction = getConstructionNotes(params.id);

  const wb = new ExcelJS.Workbook();
  wb.creator  = 'Fabrica';
  wb.created  = new Date();
  wb.modified = new Date();

  const typeLabel = project.sub_type ? (SUB_LABELS[project.sub_type] ?? project.sub_type)
                                     : (project.category.charAt(0).toUpperCase() + project.category.slice(1));
  const fitLabel  = project.fit  ? (project.fit.charAt(0).toUpperCase()  + project.fit.slice(1))  : 'Regular';
  const sizeLabel = project.base_size ?? 'M';

  // ── Sheet 1: Project Info ─────────────────────────────────────────────────

  const infoSheet = wb.addWorksheet('Project Info');
  infoSheet.columns = [
    { key: 'field', width: 22 },
    { key: 'value', width: 45 },
  ];

  const titleRow = infoSheet.addRow(['FABRICA TECH PACK', '']);
  titleRow.height = 30;
  titleRow.getCell(1).font      = { bold: true, size: 16, color: { argb: NAVY_ARGB }, name: 'Helvetica' };
  titleRow.getCell(1).alignment = { vertical: 'middle' };

  infoSheet.addRow([]);

  const infoData: [string, string][] = [
    ['Project Title', project.title],
    ['Garment Type',  typeLabel],
    ['Base Size',     sizeLabel],
    ['Fit',           fitLabel],
    ['Status',        project.status],
    ['Generated',     new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })],
  ];
  infoData.forEach(([field, value]) => {
    const row = infoSheet.addRow([field, value]);
    row.height = 18;
    row.getCell(1).font      = { bold: true, size: 10, color: { argb: GRAY_ARGB }, name: 'Helvetica' };
    row.getCell(2).font      = { size: 10, name: 'Helvetica' };
    row.getCell(1).alignment = { vertical: 'middle' };
    row.getCell(2).alignment = { vertical: 'middle' };
  });

  // ── Sheet 2: Measurements ─────────────────────────────────────────────────

  const measSheet = wb.addWorksheet('Measurements');
  measSheet.columns = [
    { key: 'label',     width: 32 },
    { key: 'value_in',  width: 13 },
    { key: 'value_cm',  width: 13 },
    { key: 'tolerance', width: 13 },
    { key: 'notes',     width: 38 },
  ];

  const mTitle = measSheet.addRow([`${project.title}  ·  Size ${sizeLabel}  ·  ${fitLabel} fit`]);
  mTitle.height = 24;
  mTitle.getCell(1).font      = { bold: true, size: 12, color: { argb: NAVY_ARGB }, name: 'Helvetica' };
  mTitle.getCell(1).alignment = { vertical: 'middle' };

  measSheet.addRow([]);

  const mHeader = measSheet.addRow(['Point of Measure', 'Value (in)', 'Value (cm)', 'Tolerance', 'Notes']);
  styleHeader(mHeader);

  measurements.forEach((m, i) => {
    const row = measSheet.addRow([
      m.label,
      m.value_inches ?? null,
      m.value_inches != null ? inToCm(m.value_inches) : null,
      `±${m.tolerance}"`,
      m.notes ?? '',
    ]);
    styleData(row, i % 2 === 1);
    row.getCell(2).alignment = { horizontal: 'right',  vertical: 'middle' };
    row.getCell(3).alignment = { horizontal: 'right',  vertical: 'middle' };
    row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    // Number format for value columns
    row.getCell(2).numFmt = '0.000';
    row.getCell(3).numFmt = '0.0';
  });

  // ── Sheet 3: BOM ─────────────────────────────────────────────────────────

  if (bomItems.length > 0) {
    const bomSheet = wb.addWorksheet('Bill of Materials');
    bomSheet.columns = [
      { key: 'component',   width: 20 },
      { key: 'material',    width: 20 },
      { key: 'composition', width: 28 },
      { key: 'weight',      width: 14 },
      { key: 'supplier',    width: 18 },
      { key: 'color',       width: 14 },
      { key: 'notes',       width: 30 },
    ];

    const bTitle = bomSheet.addRow([`${project.title}  ·  Bill of Materials`]);
    bTitle.height = 24;
    bTitle.getCell(1).font      = { bold: true, size: 12, color: { argb: NAVY_ARGB }, name: 'Helvetica' };
    bTitle.getCell(1).alignment = { vertical: 'middle' };
    bomSheet.addRow([]);

    const bHeader = bomSheet.addRow(['Component', 'Material', 'Composition', 'Weight', 'Supplier', 'Color', 'Notes']);
    styleHeader(bHeader);

    bomItems.forEach((b, i) => {
      const row = bomSheet.addRow([
        b.component, b.material, b.composition, b.weight,
        b.supplier ?? '', b.color ?? '', b.notes ?? '',
      ]);
      styleData(row, i % 2 === 1);
    });
  }

  // ── Sheet 4: Construction Notes ───────────────────────────────────────────

  if (construction.length > 0) {
    const consSheet = wb.addWorksheet('Construction Notes');
    consSheet.columns = [
      { key: 'section', width: 24 },
      { key: 'content', width: 85 },
    ];

    const cTitle = consSheet.addRow([`${project.title}  ·  Construction Notes`]);
    cTitle.height = 24;
    cTitle.getCell(1).font      = { bold: true, size: 12, color: { argb: NAVY_ARGB }, name: 'Helvetica' };
    cTitle.getCell(1).alignment = { vertical: 'middle' };
    consSheet.addRow([]);

    const cHeader = consSheet.addRow(['Section', 'Notes']);
    styleHeader(cHeader);

    construction.forEach((n, i) => {
      const row = consSheet.addRow([n.section, n.content]);
      styleData(row, i % 2 === 1);
      row.getCell(1).font      = { bold: true, size: 9, name: 'Helvetica' };
      row.getCell(2).alignment = { wrapText: true, vertical: 'top' };
      row.height = 56;
    });
  }

  // ── Serialize ────────────────────────────────────────────────────────────

  // ExcelJS returns Buffer in Node.js; cast through unknown to avoid conflicting type defs
  const raw  = await wb.xlsx.writeBuffer() as unknown as ArrayBuffer;
  const slug = project.title.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 40);

  return new NextResponse(raw, {
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="techpack_${slug}.xlsx"`,
    },
  });
}
