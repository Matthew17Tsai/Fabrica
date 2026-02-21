/**
 * PATCH /api/projects/[id]/features
 *
 * Updates confirmed features for Step 1 of the wizard.
 * Cascades to:
 *   - BOM (add/remove items based on feature toggles)
 *   - Updates step_features_status to 'confirmed'
 *
 * Body: ConfirmedFeatures object
 *
 * Returns: { project, bomItems, costBreakdown }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getProject,
  updateProjectFeatures,
  getBomItems,
  replaceBomItems,
  getProjectCostSettings,
} from '@/lib/db';
import type { ConfirmedFeatures } from '@/lib/cost/features';
import {
  getBomAdditionsForFeature,
  getBomRemovalsForFeature,
} from '@/lib/cost/features';
import { getBomTemplateWithPricing } from '@/lib/templates/bom';
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

  let features: ConfirmedFeatures;
  try {
    features = await req.json() as ConfirmedFeatures;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Persist confirmed features
  updateProjectFeatures(params.id, JSON.stringify(features));

  // Rebuild BOM from template + feature additions/removals
  const base = getBomTemplateWithPricing(project.category, features.subType, features);

  // Remove any items that should not be present based on features
  const removalComponents = new Set<string>();
  if (!features.hasDrawcord) getBomRemovalsForFeature('hasDrawcord').forEach(c => removalComponents.add(c));
  if (!features.hasZipper)   getBomRemovalsForFeature('hasZipper').forEach(c => removalComponents.add(c));
  if (!features.hasPockets)  getBomRemovalsForFeature('hasPockets').forEach(c => removalComponents.add(c));

  const filtered = base.filter(item => !removalComponents.has(item.component));

  // Add any extra items for enabled features not already in base
  const baseComponents = new Set(filtered.map(i => i.component));
  const extras: typeof filtered = [];

  if (features.hasDrawcord && !baseComponents.has('Drawcord')) {
    extras.push(...getBomAdditionsForFeature('hasDrawcord', features) as typeof filtered);
  }
  if (features.hasZipper && !baseComponents.has('Zipper')) {
    extras.push(...getBomAdditionsForFeature('hasZipper', features) as typeof filtered);
  }
  if (features.hasPockets && !baseComponents.has('Pocket Bag')) {
    extras.push(...getBomAdditionsForFeature('hasPockets', features) as typeof filtered);
  }

  const finalBom = [...filtered, ...extras];
  const bomItems = replaceBomItems(params.id, finalBom);

  // Return updated cost breakdown
  const settings  = getProjectCostSettings(params.id);
  const breakdown = computeCostBreakdown(bomItems, settings);

  return NextResponse.json({ bomItems, costBreakdown: breakdown });
}
