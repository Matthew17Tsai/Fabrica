/**
 * Default material pricing database (China/Asia factory defaults).
 *
 * These are starting-point prices used when a project is first created.
 * All values are editable by the user in the wizard.
 */

import type { SubType } from '@/lib/db';

export interface FabricDefault {
  unitPrice: number;   // USD per yard
  unit: 'yard';
  consumption: number; // yards per garment
  wastage: number;     // percent (12 = 12%)
  defaultComposition: string;
  defaultWeight: string;
}

export interface TrimDefault {
  unitPrice: number;
  unit: 'piece' | 'gram';
  consumption: number;
  wastage: number;
  notes?: string;
}

// ── Body fabrics ──────────────────────────────────────────────────────────────

export const FABRIC_DEFAULTS: Record<string, FabricDefault> = {
  'French Terry':    { unitPrice: 4.20, unit: 'yard', consumption: 1.75, wastage: 12, defaultComposition: '80% Cotton / 20% Polyester', defaultWeight: '280 GSM' },
  'Fleece':          { unitPrice: 3.80, unit: 'yard', consumption: 1.80, wastage: 12, defaultComposition: '80% Cotton / 20% Polyester', defaultWeight: '300 GSM' },
  'Jersey':          { unitPrice: 3.20, unit: 'yard', consumption: 1.60, wastage: 12, defaultComposition: '100% Cotton',                defaultWeight: '180 GSM' },
  'Interlock':       { unitPrice: 3.60, unit: 'yard', consumption: 1.65, wastage: 12, defaultComposition: '100% Cotton',                defaultWeight: '220 GSM' },
  'Waffle Knit':     { unitPrice: 4.50, unit: 'yard', consumption: 1.70, wastage: 14, defaultComposition: '100% Cotton',                defaultWeight: '260 GSM' },
  'Thermal':         { unitPrice: 4.00, unit: 'yard', consumption: 1.75, wastage: 13, defaultComposition: '100% Cotton',                defaultWeight: '240 GSM' },
  'Loopback Terry':  { unitPrice: 4.80, unit: 'yard', consumption: 1.80, wastage: 12, defaultComposition: '80% Cotton / 20% Polyester', defaultWeight: '320 GSM' },
  'Brushed Fleece':  { unitPrice: 4.10, unit: 'yard', consumption: 1.80, wastage: 12, defaultComposition: '80% Cotton / 20% Polyester', defaultWeight: '290 GSM' },
};

// ── Rib fabrics ───────────────────────────────────────────────────────────────

export const RIB_DEFAULTS: Record<string, FabricDefault> = {
  '1x1 Rib':    { unitPrice: 3.50, unit: 'yard', consumption: 0.25, wastage: 15, defaultComposition: '95% Cotton / 5% Spandex', defaultWeight: '240 GSM' },
  '2x2 Rib':    { unitPrice: 3.70, unit: 'yard', consumption: 0.25, wastage: 15, defaultComposition: '95% Cotton / 5% Spandex', defaultWeight: '260 GSM' },
  'Flat Rib':   { unitPrice: 3.30, unit: 'yard', consumption: 0.20, wastage: 15, defaultComposition: '95% Cotton / 5% Spandex', defaultWeight: '220 GSM' },
  'Pointelle':  { unitPrice: 4.20, unit: 'yard', consumption: 0.22, wastage: 15, defaultComposition: '100% Cotton',             defaultWeight: '200 GSM' },
};

// ── Trims ─────────────────────────────────────────────────────────────────────

export const TRIM_DEFAULTS: Record<string, TrimDefault> = {
  'YKK Metal #5 Zipper':    { unitPrice: 1.20, unit: 'piece', consumption: 1, wastage: 0, notes: 'Full front zip' },
  'YKK Nylon #5 Zipper':    { unitPrice: 0.85, unit: 'piece', consumption: 1, wastage: 0, notes: 'Full front zip' },
  'Flat Cotton Drawcord':   { unitPrice: 0.35, unit: 'piece', consumption: 1, wastage: 0 },
  'Round Cotton Drawcord':  { unitPrice: 0.40, unit: 'piece', consumption: 1, wastage: 0 },
  'Metal Grommets':         { unitPrice: 0.12, unit: 'piece', consumption: 2, wastage: 0, notes: '2 pcs per garment' },
  'Cord Lock':              { unitPrice: 0.15, unit: 'piece', consumption: 1, wastage: 0 },
  'Pocket Lining':          { unitPrice: 0.30, unit: 'piece', consumption: 1, wastage: 0 },
  'Woven Elastic (35mm)':   { unitPrice: 0.45, unit: 'piece', consumption: 1, wastage: 0, notes: 'Waistband' },
};

// ── Labels ────────────────────────────────────────────────────────────────────

export const LABEL_DEFAULTS: Record<string, TrimDefault> = {
  'Main Woven Label':     { unitPrice: 0.08, unit: 'piece', consumption: 1, wastage: 0 },
  'Care Label (Printed)': { unitPrice: 0.04, unit: 'piece', consumption: 1, wastage: 0 },
  'Size Label (Printed)': { unitPrice: 0.03, unit: 'piece', consumption: 1, wastage: 0 },
  'Hang Tag':             { unitPrice: 0.06, unit: 'piece', consumption: 1, wastage: 0 },
};

// ── Packaging ─────────────────────────────────────────────────────────────────

export const PACKAGING_DEFAULTS: Record<string, TrimDefault> = {
  'Polybag':        { unitPrice: 0.03, unit: 'piece', consumption: 1, wastage: 0 },
  'Tissue Paper':   { unitPrice: 0.02, unit: 'piece', consumption: 1, wastage: 0 },
  'Sticker Label':  { unitPrice: 0.02, unit: 'piece', consumption: 1, wastage: 0 },
};

// ── Thread ────────────────────────────────────────────────────────────────────

export const THREAD_DEFAULTS: Record<string, TrimDefault> = {
  'Poly-Poly Thread': { unitPrice: 0.08, unit: 'piece', consumption: 1, wastage: 0, notes: 'All construction' },
};

// ── CMT labor defaults per garment type ───────────────────────────────────────

export const CMT_DEFAULTS: Record<SubType, number> = {
  oversized_hoodie: 4.20,
  pullover_hoodie:  4.00,
  zip_hoodie:       4.50,
  unisex_hoodie:    4.00,
  crewneck:         3.50,
  sweatpants:       3.80,
};

// ── Default cost settings ─────────────────────────────────────────────────────

export const COST_DEFAULTS = {
  overhead_pct:   12,    // 12% overhead on materials + CMT
  shipping:       0.80,  // per unit (sea freight)
  duty_pct:       16.5,  // import duty percent of FOB (HTS 6110.20 cotton)
  markup_ws:      2.5,   // wholesale multiplier
  markup_retail:  2.0,   // retail multiplier from wholesale
};

// ── CMT ranges for cost transparency ─────────────────────────────────────────

export const CMT_RANGES: Record<SubType, { min: number; max: number }> = {
  oversized_hoodie: { min: 3.80, max: 5.50 },
  pullover_hoodie:  { min: 3.50, max: 5.00 },
  zip_hoodie:       { min: 4.00, max: 5.50 },
  unisex_hoodie:    { min: 3.50, max: 5.00 },
  crewneck:         { min: 3.00, max: 4.50 },
  sweatpants:       { min: 3.20, max: 4.50 },
};

// ── HTS codes for duty transparency ──────────────────────────────────────────

export interface HtsInfo {
  code: string;
  description: string;
  dutyPct: number;
}

export const HTS_CODES: Record<string, HtsInfo> = {
  knit_cotton_tops:  { code: '6110.20', description: 'Jerseys, pullovers and similar articles, of cotton, knitted', dutyPct: 16.5 },
  knit_fleece_tops:  { code: '6110.30', description: 'Jerseys, pullovers and similar articles, of man-made fibres', dutyPct: 32.0 },
  woven_bottoms:     { code: '6203.42', description: "Men's or boys' trousers, of cotton", dutyPct: 16.6 },
  knit_bottoms:      { code: '6104.62', description: "Women's trousers of cotton, knitted", dutyPct: 28.2 },
};

// ── Shipping weight classes ───────────────────────────────────────────────────

export interface ShippingWeightInfo {
  weightKg: number;
  seaFreightPerUnit: number;
  explanation: string;
}

export const SHIPPING_WEIGHT_CLASS: Record<SubType, ShippingWeightInfo> = {
  oversized_hoodie: { weightKg: 0.55, seaFreightPerUnit: 0.90, explanation: 'Heavy-weight fleece, typically 0.50–0.60 kg per unit' },
  pullover_hoodie:  { weightKg: 0.42, seaFreightPerUnit: 0.80, explanation: 'Standard hoodie, typically 0.38–0.48 kg per unit' },
  zip_hoodie:       { weightKg: 0.46, seaFreightPerUnit: 0.85, explanation: 'Zip hoodie with hardware, typically 0.42–0.52 kg per unit' },
  unisex_hoodie:    { weightKg: 0.42, seaFreightPerUnit: 0.80, explanation: 'Standard hoodie, typically 0.38–0.48 kg per unit' },
  crewneck:         { weightKg: 0.38, seaFreightPerUnit: 0.75, explanation: 'Crewneck sweatshirt, typically 0.32–0.42 kg per unit' },
  sweatpants:       { weightKg: 0.35, seaFreightPerUnit: 0.70, explanation: 'Sweatpants, typically 0.30–0.40 kg per unit' },
};

// ── Overhead explanation ──────────────────────────────────────────────────────

export const OVERHEAD_EXPLANATION =
  'Factory overhead covers QC inspection, lab testing, sample costs, factory profit margin, and operational buffer. ' +
  'Industry standard is 10–15% applied to materials + CMT subtotal.';

// ── MOQ volume discount multipliers ──────────────────────────────────────────

export function getMOQMultiplier(quantity: number): number {
  if (quantity <= 100)  return 1.15;
  if (quantity <= 300)  return 1.08;
  if (quantity <= 500)  return 1.00;
  if (quantity <= 1000) return 0.92;
  if (quantity <= 3000) return 0.85;
  return 0.80;
}

// ── Fabric options grouped for UI dropdowns ───────────────────────────────────

export const BODY_FABRIC_OPTIONS = Object.keys(FABRIC_DEFAULTS);
export const RIB_FABRIC_OPTIONS  = Object.keys(RIB_DEFAULTS);
export const ZIPPER_OPTIONS      = ['YKK Metal #5 Zipper', 'YKK Nylon #5 Zipper'];
export const DRAWCORD_OPTIONS    = ['Flat Cotton Drawcord', 'Round Cotton Drawcord'];

/** Get default pricing for a named material (checks fabric, rib, trim, label, packaging, thread dbs). */
export function getMaterialDefault(name: string): (FabricDefault | TrimDefault) | null {
  return (
    FABRIC_DEFAULTS[name] ??
    RIB_DEFAULTS[name] ??
    TRIM_DEFAULTS[name] ??
    LABEL_DEFAULTS[name] ??
    PACKAGING_DEFAULTS[name] ??
    THREAD_DEFAULTS[name] ??
    null
  );
}
