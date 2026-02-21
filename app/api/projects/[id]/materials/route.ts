/**
 * PATCH /api/projects/[id]/materials
 *
 * Updates material selection for a specific BOM component (Step 2).
 * Cascades to:
 *   - BOM item pricing (unit_price, consumption, wastage, total_cost)
 *   - Updates step_materials_status to 'confirmed'
 *
 * Body: {
 *   component: string,       // e.g. 'Body Fabric'
 *   material:  string,       // e.g. 'Fleece'
 *   composition?: string,
 *   specification?: string,
 *   unit_price?: number,     // override (otherwise use material default)
 *   consumption?: number,
 *   wastage?: number,
 *   confirm?: boolean,       // true → set step_materials_status = confirmed
 * }
 *
 * Returns: { bomItems, costBreakdown }
 */

import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import {
  getProject,
  getBomItems,
  upsertBomItem,
  updateProjectWizardStatus,
  updateProjectMaterials,
  getProjectCostSettings,
} from '@/lib/db';
import { getMaterialDefault } from '@/lib/cost/materials';
import { computeCostBreakdown } from '@/lib/cost/calculator';

export const runtime = 'nodejs';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const project = getProject(params.id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const body = await req.json() as {
    component:      string;
    material:       string;
    composition?:   string;
    specification?: string;
    unit_price?:    number;
    consumption?:   number;
    wastage?:       number;
    confirm?:       boolean;
  };

  if (!body.component || !body.material) {
    return NextResponse.json({ error: 'component and material are required' }, { status: 400 });
  }

  // Find existing BOM item
  const allItems    = getBomItems(params.id);
  const existing    = allItems.find(i => i.component === body.component);
  const matDefaults = getMaterialDefault(body.material);

  const unitPrice  = body.unit_price  ?? matDefaults?.unitPrice  ?? existing?.unit_price  ?? 0;
  const unit       = (matDefaults as { unit?: string })?.unit       ?? existing?.unit       ?? 'piece';
  const consumption = body.consumption ?? matDefaults?.consumption ?? existing?.consumption ?? 1;
  const wastage     = body.wastage     ?? matDefaults?.wastage     ?? existing?.wastage     ?? 0;
  const composition = body.composition ?? (matDefaults as { defaultComposition?: string })?.defaultComposition ?? existing?.composition ?? '';
  const specification = body.specification ?? (matDefaults as { defaultWeight?: string })?.defaultWeight ?? existing?.specification ?? null;

  upsertBomItem({
    id:           existing?.id ?? nanoid(),
    project_id:   params.id,
    category:     existing?.category ?? 'fabric',
    component:    body.component,
    material:     body.material,
    composition,
    specification,
    notes:        existing?.notes ?? null,
    unit_price:   unitPrice,
    unit,
    consumption,
    wastage,
    price_source: 'user_selected',
    sort_order:   existing?.sort_order ?? allItems.length,
  });

  // Persist confirmed materials as JSON snapshot
  const updatedItems = getBomItems(params.id);
  const materials = updatedItems
    .filter(i => i.category === 'fabric')
    .reduce<Record<string, string>>((acc, i) => { acc[i.component] = i.material; return acc; }, {});
  updateProjectMaterials(params.id, JSON.stringify(materials));

  if (body.confirm) {
    updateProjectWizardStatus(params.id, 'materials', 'confirmed');
  }

  const settings  = getProjectCostSettings(params.id);
  const breakdown = computeCostBreakdown(updatedItems, settings);

  return NextResponse.json({ bomItems: updatedItems, costBreakdown: breakdown });
}
