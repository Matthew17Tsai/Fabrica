/**
 * GET  /api/projects/[id]/cost  — full cost breakdown
 * PATCH /api/projects/[id]/cost  — update cost settings (CMT, shipping, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getProject,
  getBomItems,
  getProjectCostSettings,
  updateProjectCostSettings,
} from '@/lib/db';
import type { CostSettings } from '@/lib/db';
import {
  computeCostBreakdown,
  computePricingTargets,
  computeMoqComparison,
} from '@/lib/cost/calculator';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const project = getProject(params.id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const items     = getBomItems(params.id);
  const settings  = getProjectCostSettings(params.id);
  const breakdown = computeCostBreakdown(items, settings);
  const pricing   = computePricingTargets(breakdown.landedCost, settings);
  const moq       = computeMoqComparison(items, settings);

  return NextResponse.json({ breakdown, pricing, moq, settings });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const project = getProject(params.id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const body = await req.json() as Partial<CostSettings>;

  // Merge with existing settings
  const existing = getProjectCostSettings(params.id);
  const updated: CostSettings = {
    cmt:           body.cmt           ?? existing.cmt,
    overhead_pct:  body.overhead_pct  ?? existing.overhead_pct,
    shipping:      body.shipping      ?? existing.shipping,
    duty_pct:      body.duty_pct      ?? existing.duty_pct,
    markup_ws:     body.markup_ws     ?? existing.markup_ws,
    markup_retail: body.markup_retail ?? existing.markup_retail,
  };

  updateProjectCostSettings(params.id, updated);

  const items     = getBomItems(params.id);
  const breakdown = computeCostBreakdown(items, updated);
  const pricing   = computePricingTargets(breakdown.landedCost, updated);
  const moq       = computeMoqComparison(items, updated);

  return NextResponse.json({ breakdown, pricing, moq, settings: updated });
}
