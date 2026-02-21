/**
 * Garment grading rules for size run calculation.
 *
 * Grade rules define how much each measurement grows/shrinks per size step
 * from the base size. SIZE_OFFSETS maps size labels to their offset from M (0).
 */

import type { BaseSize, SizeRunRow } from '@/lib/db';
import type { Measurement } from '@/lib/db';

export interface GradeRule {
  increment: number;  // value change per size step
  tolerance: number;  // tolerance in same unit
}

export type GradeCategory = 'menswear' | 'womenswear' | 'childrenswear';

// ── Size offsets from base size ───────────────────────────────────────────────
// XS = -2 from M, S = -1, M = 0, L = +1, XL = +2, XXL = +3

export const SIZE_OFFSETS: Record<BaseSize, number> = {
  XS:  -2,
  S:   -1,
  M:    0,
  L:    1,
  XL:   2,
  XXL:  3,
};

export const ALL_SIZES: BaseSize[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

// ── Menswear grade rules ──────────────────────────────────────────────────────

export const MENSWEAR_GRADES: Record<string, GradeRule> = {
  'body_length':      { increment: 0.75, tolerance: 0.5 },
  'chest_width':      { increment: 1.00, tolerance: 0.5 },
  'hem_width':        { increment: 1.00, tolerance: 0.5 },
  'shoulder_width':   { increment: 1.00, tolerance: 0.5 },
  'sleeve_length':    { increment: 0.50, tolerance: 0.5 },
  'bicep_width':      { increment: 0.50, tolerance: 0.25 },
  'cuff_opening':     { increment: 0.25, tolerance: 0.25 },
  'hood_height':      { increment: 0.75, tolerance: 0.5 },
  'hood_width':       { increment: 0.50, tolerance: 0.5 },
  'pocket_width':     { increment: 0.50, tolerance: 0.25 },
  'pocket_height':    { increment: 0.50, tolerance: 0.25 },
  'zipper_length':    { increment: 1.00, tolerance: 0.5 },
  'drawcord_length':  { increment: 0.25, tolerance: 0.25 },
  // Sweatpants
  'waist_width':      { increment: 1.00, tolerance: 0.5 },
  'hip_width':        { increment: 1.00, tolerance: 0.5 },
  'inseam_length':    { increment: 0.50, tolerance: 0.5 },
  'thigh_width':      { increment: 0.50, tolerance: 0.25 },
  'leg_opening':      { increment: 0.25, tolerance: 0.25 },
  'front_rise':       { increment: 0.25, tolerance: 0.25 },
  'back_rise':        { increment: 0.25, tolerance: 0.25 },
};

export const WOMENSWEAR_GRADES: Record<string, GradeRule> = {
  'body_length':      { increment: 0.50, tolerance: 0.5 },
  'chest_width':      { increment: 0.75, tolerance: 0.5 },
  'hem_width':        { increment: 0.75, tolerance: 0.5 },
  'shoulder_width':   { increment: 0.75, tolerance: 0.5 },
  'sleeve_length':    { increment: 0.375, tolerance: 0.5 },
  'bicep_width':      { increment: 0.375, tolerance: 0.25 },
  'cuff_opening':     { increment: 0.25,  tolerance: 0.25 },
  'hood_height':      { increment: 0.50,  tolerance: 0.5 },
  'hood_width':       { increment: 0.375, tolerance: 0.5 },
  'pocket_width':     { increment: 0.375, tolerance: 0.25 },
  'pocket_height':    { increment: 0.375, tolerance: 0.25 },
  'zipper_length':    { increment: 0.75,  tolerance: 0.5 },
  'drawcord_length':  { increment: 0.25,  tolerance: 0.25 },
  'waist_width':      { increment: 0.75,  tolerance: 0.5 },
  'hip_width':        { increment: 0.75,  tolerance: 0.5 },
  'inseam_length':    { increment: 0.375, tolerance: 0.5 },
  'thigh_width':      { increment: 0.375, tolerance: 0.25 },
  'leg_opening':      { increment: 0.25,  tolerance: 0.25 },
  'front_rise':       { increment: 0.25,  tolerance: 0.25 },
  'back_rise':        { increment: 0.25,  tolerance: 0.25 },
};

export const CHILDRENSWEAR_GRADES: Record<string, GradeRule> = {
  'body_length':      { increment: 1.00, tolerance: 0.5 },
  'chest_width':      { increment: 0.75, tolerance: 0.5 },
  'hem_width':        { increment: 0.75, tolerance: 0.5 },
  'shoulder_width':   { increment: 0.75, tolerance: 0.5 },
  'sleeve_length':    { increment: 0.75, tolerance: 0.5 },
  'bicep_width':      { increment: 0.50, tolerance: 0.25 },
  'cuff_opening':     { increment: 0.25, tolerance: 0.25 },
  'hood_height':      { increment: 0.75, tolerance: 0.5 },
  'hood_width':       { increment: 0.50, tolerance: 0.5 },
  'pocket_width':     { increment: 0.375, tolerance: 0.25 },
  'pocket_height':    { increment: 0.375, tolerance: 0.25 },
  'zipper_length':    { increment: 0.75, tolerance: 0.5 },
  'drawcord_length':  { increment: 0.25, tolerance: 0.25 },
  'waist_width':      { increment: 0.75, tolerance: 0.5 },
  'hip_width':        { increment: 0.75, tolerance: 0.5 },
  'inseam_length':    { increment: 0.75, tolerance: 0.5 },
  'thigh_width':      { increment: 0.50, tolerance: 0.25 },
  'leg_opening':      { increment: 0.25, tolerance: 0.25 },
  'front_rise':       { increment: 0.375, tolerance: 0.25 },
  'back_rise':        { increment: 0.375, tolerance: 0.25 },
};

const GRADE_MAP: Record<GradeCategory, Record<string, GradeRule>> = {
  menswear:      MENSWEAR_GRADES,
  womenswear:    WOMENSWEAR_GRADES,
  childrenswear: CHILDRENSWEAR_GRADES,
};

function getDefaultGradeRule(): GradeRule {
  return { increment: 0.5, tolerance: 0.5 };
}

/**
 * Calculate the graded value for a single POM at a given size.
 *
 * @param baseValue      The base size measurement
 * @param baseSize       The base size label (e.g. 'M')
 * @param targetSize     The target size label (e.g. 'L')
 * @param measurementId  The POM key (e.g. 'body_length')
 * @param category       The grade category
 */
export function gradeValue(
  baseValue: number,
  baseSize: BaseSize,
  targetSize: BaseSize,
  measurementId: string,
  category: GradeCategory,
): number {
  const rules    = GRADE_MAP[category];
  const rule     = rules[measurementId] ?? getDefaultGradeRule();
  const baseOffset   = SIZE_OFFSETS[baseSize];
  const targetOffset = SIZE_OFFSETS[targetSize];
  const steps    = targetOffset - baseOffset;
  const result   = baseValue + steps * rule.increment;
  return Math.round(result * 100) / 100;
}

/**
 * Build the complete size run table from a set of base measurements.
 *
 * Returns SizeRunRow objects (without id/project_id) ready for replaceSizeRun().
 */
export function buildSizeRun(
  measurements: Measurement[],
  baseSize: BaseSize,
  category: GradeCategory,
  sizeRange: BaseSize[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
): Omit<SizeRunRow, 'id' | 'project_id'>[] {
  const rows: Omit<SizeRunRow, 'id' | 'project_id'>[] = [];

  for (const m of measurements) {
    if (m.base_value === null || m.base_value === undefined) continue;

    for (const size of sizeRange) {
      const graded = gradeValue(m.base_value, baseSize, size, m.measurement_id, category);
      rows.push({
        measurement_id:   m.measurement_id,
        size_label:       size,
        value:            graded,
        is_base_size:     size === baseSize ? 1 : 0,
        is_user_override: 0,
      });
    }
  }

  return rows;
}

/** Get the GradeRule tolerance for a given measurement and category. */
export function getTolerance(measurementId: string, category: GradeCategory): number {
  const rules = GRADE_MAP[category];
  return (rules[measurementId] ?? getDefaultGradeRule()).tolerance;
}
