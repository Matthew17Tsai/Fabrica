/**
 * BOM API routes — new schema with pricing
 *
 * GET    /api/projects/[id]/bom              — list items
 * PUT    /api/projects/[id]/bom              — full replace
 * POST   /api/projects/[id]/bom              — add single item
 * PATCH  /api/projects/[id]/bom/[itemId]     — update single item (handled separately)
 * DELETE /api/projects/[id]/bom/[itemId]     — remove item (handled separately)
 */

import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import {
  getProject,
  getBomItems,
  replaceBomItems,
  upsertBomItem,
  getProjectCostSettings,
} from '@/lib/db';
import type { BomCategory } from '@/lib/db';
import { computeCostBreakdown } from '@/lib/cost/calculator';
import { getBomTemplateWithPricing } from '@/lib/templates/bom';

export const runtime = 'nodejs';

// GET — list BOM items with computed totals
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const project = getProject(params.id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  let items = getBomItems(params.id);

  // Auto-seed if empty
  if (items.length === 0) {
    const template = getBomTemplateWithPricing(project.category, project.sub_type ?? undefined);
    items = replaceBomItems(params.id, template);
  }

  const settings  = getProjectCostSettings(params.id);
  const breakdown = computeCostBreakdown(items, settings);

  return NextResponse.json({ bom: items, costBreakdown: breakdown });
}

// POST — add a single BOM item
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const project = getProject(params.id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const body = await req.json();
  const allItems = getBomItems(params.id);

  const item = upsertBomItem({
    id:            nanoid(),
    project_id:    params.id,
    category:      (body.category    ?? 'trim') as BomCategory,
    component:     String(body.component   ?? ''),
    material:      String(body.material    ?? ''),
    composition:   String(body.composition ?? ''),
    specification: body.specification != null ? String(body.specification) : null,
    notes:         body.notes         != null ? String(body.notes)         : null,
    unit_price:    Number(body.unit_price   ?? 0),
    unit:          String(body.unit         ?? 'piece'),
    consumption:   Number(body.consumption  ?? 1),
    wastage:       Number(body.wastage       ?? 0),
    price_source:  'user_added',
    sort_order:    allItems.length,
  });

  const updatedItems = getBomItems(params.id);
  const settings     = getProjectCostSettings(params.id);
  const breakdown    = computeCostBreakdown(updatedItems, settings);

  return NextResponse.json({ item, costBreakdown: breakdown }, { status: 201 });
}

// PUT — full replace
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const project = getProject(params.id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const body = await req.json() as { items?: unknown };
  if (!Array.isArray(body.items)) {
    return NextResponse.json({ error: '"items" must be an array' }, { status: 400 });
  }

  type BomInput = Record<string, unknown>;

  const sanitized = (body.items as BomInput[]).map((item, i) => ({
    category:      (String(item.category    ?? 'fabric')) as BomCategory,
    component:     String(item.component    ?? ''),
    material:      String(item.material     ?? ''),
    composition:   String(item.composition  ?? ''),
    specification: item.specification != null ? String(item.specification) : null,
    notes:         item.notes         != null ? String(item.notes)         : null,
    unit_price:    Number(item.unit_price    ?? 0),
    unit:          String(item.unit          ?? 'piece'),
    consumption:   Number(item.consumption   ?? 1),
    wastage:       Number(item.wastage        ?? 0),
    price_source:  String(item.price_source  ?? 'user_edited'),
    sort_order:    typeof item.sort_order === 'number' ? item.sort_order : i,
  }));

  const items     = replaceBomItems(params.id, sanitized);
  const settings  = getProjectCostSettings(params.id);
  const breakdown = computeCostBreakdown(items, settings);

  return NextResponse.json({ bom: items, costBreakdown: breakdown });
}
