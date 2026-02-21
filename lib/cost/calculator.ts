/**
 * Cost calculation engine.
 *
 * All functions are pure (no side effects) — they accept data and return results.
 * The API routes call these functions and then persist/return the results.
 */

import type { BomItem, CostSettings } from '@/lib/db';
import { getMOQMultiplier } from './materials';

// ── Per-item cost ─────────────────────────────────────────────────────────────

/** Recompute total_cost for a single BOM item. */
export function computeBomItemCost(item: Pick<BomItem, 'unit_price' | 'consumption' | 'wastage'>): number {
  return item.unit_price * item.consumption * (1 + item.wastage / 100);
}

/** Sum total_cost across all BOM items (materials cost). */
export function computeMaterialsTotal(items: BomItem[]): number {
  return items.reduce((acc, item) => acc + item.total_cost, 0);
}

// ── Full cost breakdown ───────────────────────────────────────────────────────

export interface CostBreakdown {
  materialsCost:  number;
  cmt:            number;
  overhead:       number;  // (materials + cmt) × overhead_pct / 100
  fobCost:        number;  // materials + cmt + overhead
  shipping:       number;
  duty:           number;  // fobCost × duty_pct / 100
  landedCost:     number;  // fobCost + shipping + duty
}

export function computeCostBreakdown(
  items: BomItem[],
  settings: CostSettings,
): CostBreakdown {
  const materialsCost = computeMaterialsTotal(items);
  const cmt           = settings.cmt;
  const overhead      = (materialsCost + cmt) * settings.overhead_pct / 100;
  const fobCost       = materialsCost + cmt + overhead;
  const shipping      = settings.shipping;
  const duty          = fobCost * settings.duty_pct / 100;
  const landedCost    = fobCost + shipping + duty;

  return {
    materialsCost: round2(materialsCost),
    cmt:           round2(cmt),
    overhead:      round2(overhead),
    fobCost:       round2(fobCost),
    shipping:      round2(shipping),
    duty:          round2(duty),
    landedCost:    round2(landedCost),
  };
}

// ── Pricing calculator ────────────────────────────────────────────────────────

export interface PricingTargets {
  wholesale:       number;
  retail:          number;
  wsMarginMultiple: number;  // wholesale / landedCost (the multiplier achieved)
}

export function computePricingTargets(
  landedCost: number,
  settings: CostSettings,
): PricingTargets {
  const wholesale = round2(landedCost * settings.markup_ws);
  const retail    = round2(wholesale * settings.markup_retail);
  return {
    wholesale,
    retail,
    wsMarginMultiple: settings.markup_ws,
  };
}

/** Work backwards from a target retail price to find the implied margin. */
export function computeMarginFromRetail(
  landedCost: number,
  targetRetail: number,
  markup_retail: number,
): { impliedWholesale: number; impliedWsMultiple: number; impliedRetail: number } {
  const impliedWholesale  = round2(targetRetail / markup_retail);
  const impliedWsMultiple = round2(impliedWholesale / landedCost);
  return { impliedWholesale, impliedWsMultiple, impliedRetail: targetRetail };
}

// ── MOQ comparison ────────────────────────────────────────────────────────────

export interface MoqRow {
  quantity:    number;
  fobPerUnit:  number;
  landedPerUnit: number;
  totalOrder:  number;
}

export function computeMoqComparison(
  baseItems: BomItem[],
  baseSettings: CostSettings,
  quantities: number[] = [100, 500, 1000],
): MoqRow[] {
  return quantities.map(qty => {
    const multiplier    = getMOQMultiplier(qty);
    // Scale materials and CMT by the MOQ multiplier (volume discounts)
    const scaledItems   = baseItems.map(item => ({
      ...item,
      unit_price: item.unit_price * multiplier,
      total_cost: computeBomItemCost({ ...item, unit_price: item.unit_price * multiplier }),
    }));
    const scaledSettings: CostSettings = { ...baseSettings, cmt: baseSettings.cmt * multiplier };
    const breakdown = computeCostBreakdown(scaledItems, scaledSettings);

    return {
      quantity:      qty,
      fobPerUnit:    breakdown.fobCost,
      landedPerUnit: breakdown.landedCost,
      totalOrder:    round2(breakdown.landedCost * qty),
    };
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
