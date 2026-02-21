/**
 * Measurement POM (Points of Measure) templates.
 *
 * Architecture:
 *  - Each garment type has a list of POM definitions with a base M value and
 *    a per-size grade increment.
 *  - Size index: XS=0, S=1, M=2, L=3, XL=4, XXL=5
 *  - Final value = base_m + (sizeIndex - 2) * grade + fitAdjustment[key]
 *  - Fit adjustments are applied on top of the size-graded value.
 */

import type { FitType, BaseSize, SubType } from '../db';

export interface PomDefinition {
  measurement_id: string;
  label: string;
  description: string;
  tolerance: number;   // inches
  base_m: number;      // M size baseline, inches
  grade: number;       // increment per size step (can be 0 for no-grade)
  applicable?: SubType[]; // if set, only include for these sub-types
}

// ─── Size index mapping ────────────────────────────────────────────────────────

const SIZE_INDEX: Record<BaseSize, number> = {
  XS: 0,
  S:  1,
  M:  2,
  L:  3,
  XL: 4,
  XXL: 5,
};

// ─── Fit adjustments (delta inches on top of sized value) ────────────────────

const FIT_ADJUSTMENTS: Record<FitType, Partial<Record<string, number>>> = {
  regular: {},
  oversized: {
    chest_width:     2.5,
    body_length:     1.5,
    front_length:    1.5,
    shoulder_across: 1.0,
    sleeve_length:   0.5,
    upper_arm:       1.0,
    hem_width:       2.5,
    armhole_straight: 0.5,
    armhole_curved:  1.0,
    // pants
    hip_width:       2.0,
    thigh_width:     1.0,
  },
  slim: {
    chest_width:     -1.5,
    body_length:     -0.5,
    front_length:    -0.5,
    upper_arm:       -0.5,
    hem_width:       -1.5,
    armhole_straight: -0.25,
    // pants
    hip_width:       -1.0,
    thigh_width:     -0.5,
    knee_width:      -0.25,
    leg_opening:     -0.25,
  },
};

// ─── Hoodie POM definitions ───────────────────────────────────────────────────

const HOODIE_POMS: PomDefinition[] = [
  { measurement_id: 'body_length',      label: 'Body Length',         description: 'HPS to bottom hem',                     tolerance: 0.5,  base_m: 28.0,  grade: 0.5  },
  { measurement_id: 'chest_width',      label: 'Chest Width',         description: '1" below armhole, laid flat',           tolerance: 0.5,  base_m: 23.0,  grade: 1.0  },
  { measurement_id: 'shoulder_across',  label: 'Shoulder Across',     description: 'Shoulder seam to shoulder seam',        tolerance: 0.25, base_m: 21.0,  grade: 0.5  },
  { measurement_id: 'sleeve_length',    label: 'Sleeve Length',       description: 'Center back neck to cuff edge',         tolerance: 0.5,  base_m: 34.5,  grade: 0.5  },
  { measurement_id: 'upper_arm',        label: 'Upper Arm Width',     description: 'Bicep area, laid flat',                 tolerance: 0.25, base_m: 9.5,   grade: 0.5  },
  { measurement_id: 'cuff_width',       label: 'Cuff Width',          description: 'Rib cuff opening, laid flat',           tolerance: 0.25, base_m: 4.0,   grade: 0.125 },
  { measurement_id: 'hem_width',        label: 'Bottom Hem Width',    description: 'Rib hem, laid flat',                    tolerance: 0.5,  base_m: 22.0,  grade: 1.0  },
  { measurement_id: 'hood_height',      label: 'Hood Height',         description: 'Back neck to top of hood',              tolerance: 0.5,  base_m: 14.0,  grade: 0.25 },
  { measurement_id: 'hood_width',       label: 'Hood Width',          description: 'Hood opening width',                   tolerance: 0.5,  base_m: 12.0,  grade: 0.25 },
  { measurement_id: 'neck_opening',     label: 'Neck Opening',        description: 'Neckline circumference/width',          tolerance: 0.25, base_m: 9.0,   grade: 0.25 },
  { measurement_id: 'armhole_straight', label: 'Armhole Straight',    description: 'Straight measurement',                  tolerance: 0.25, base_m: 11.5,  grade: 0.25 },
  { measurement_id: 'armhole_curved',   label: 'Armhole Curved',      description: 'Along curve',                           tolerance: 0.5,  base_m: 22.0,  grade: 0.5  },
  { measurement_id: 'pocket_width',     label: 'Kangaroo Pocket Width', description: 'If applicable',                      tolerance: 0.25, base_m: 13.0,  grade: 0    },
  { measurement_id: 'pocket_height',    label: 'Kangaroo Pocket Height', description: 'If applicable',                     tolerance: 0.25, base_m: 8.0,   grade: 0    },
  { measurement_id: 'front_length',     label: 'Front Length',        description: 'CF neck to hem',                        tolerance: 0.5,  base_m: 26.5,  grade: 0.5  },
  { measurement_id: 'cuff_height',      label: 'Cuff Rib Height',     description: 'Height of rib band at cuff',            tolerance: 0.25, base_m: 3.0,   grade: 0    },
  { measurement_id: 'hem_rib_height',   label: 'Hem Rib Height',      description: 'Height of rib band at hem',             tolerance: 0.25, base_m: 3.0,   grade: 0    },
  {
    measurement_id: 'zipper_length',
    label: 'Zipper Length',
    description: 'If applicable (zip hoodie)',
    tolerance: 0.5,
    base_m: 25.0,
    grade: 0.5,
    applicable: ['zip_hoodie'],
  },
];

// ─── Sweatshirt POM definitions ───────────────────────────────────────────────
// Same as hoodie minus hood measurements, plus neckband

const SWEATSHIRT_POMS: PomDefinition[] = [
  { measurement_id: 'body_length',      label: 'Body Length',         description: 'HPS to bottom hem',                     tolerance: 0.5,  base_m: 27.0,  grade: 0.5  },
  { measurement_id: 'chest_width',      label: 'Chest Width',         description: '1" below armhole, laid flat',           tolerance: 0.5,  base_m: 22.0,  grade: 1.0  },
  { measurement_id: 'shoulder_across',  label: 'Shoulder Across',     description: 'Shoulder seam to shoulder seam',        tolerance: 0.25, base_m: 20.5,  grade: 0.5  },
  { measurement_id: 'sleeve_length',    label: 'Sleeve Length',       description: 'Center back neck to cuff edge',         tolerance: 0.5,  base_m: 34.0,  grade: 0.5  },
  { measurement_id: 'upper_arm',        label: 'Upper Arm Width',     description: 'Bicep area, laid flat',                 tolerance: 0.25, base_m: 9.0,   grade: 0.5  },
  { measurement_id: 'cuff_width',       label: 'Cuff Width',          description: 'Rib cuff opening, laid flat',           tolerance: 0.25, base_m: 3.75,  grade: 0.125 },
  { measurement_id: 'hem_width',        label: 'Bottom Hem Width',    description: 'Rib hem, laid flat',                    tolerance: 0.5,  base_m: 21.0,  grade: 1.0  },
  { measurement_id: 'neck_opening',     label: 'Neck Opening',        description: 'Neckline circumference/width',          tolerance: 0.25, base_m: 8.5,   grade: 0.25 },
  { measurement_id: 'neckband_width',   label: 'Neckband Width',      description: 'Crew neck rib width',                   tolerance: 0.25, base_m: 7.5,   grade: 0.25 },
  { measurement_id: 'neckband_height',  label: 'Neckband Height',     description: 'Crew neck rib height',                  tolerance: 0.25, base_m: 1.0,   grade: 0    },
  { measurement_id: 'armhole_straight', label: 'Armhole Straight',    description: 'Straight measurement',                  tolerance: 0.25, base_m: 11.0,  grade: 0.25 },
  { measurement_id: 'armhole_curved',   label: 'Armhole Curved',      description: 'Along curve',                           tolerance: 0.5,  base_m: 21.0,  grade: 0.5  },
  { measurement_id: 'front_length',     label: 'Front Length',        description: 'CF neck to hem',                        tolerance: 0.5,  base_m: 25.5,  grade: 0.5  },
  { measurement_id: 'cuff_height',      label: 'Cuff Rib Height',     description: 'Height of rib band at cuff',            tolerance: 0.25, base_m: 3.0,   grade: 0    },
  { measurement_id: 'hem_rib_height',   label: 'Hem Rib Height',      description: 'Height of rib band at hem',             tolerance: 0.25, base_m: 3.0,   grade: 0    },
];

// ─── Sweatpants POM definitions ───────────────────────────────────────────────

const SWEATPANTS_POMS: PomDefinition[] = [
  { measurement_id: 'waist_relaxed',     label: 'Waist Relaxed',       description: 'Waistband laid flat, relaxed',          tolerance: 0.5,  base_m: 16.0,  grade: 1.0  },
  { measurement_id: 'waist_stretched',   label: 'Waist Stretched',     description: 'Waistband fully stretched',             tolerance: 0.5,  base_m: 22.0,  grade: 1.0  },
  { measurement_id: 'hip_width',         label: 'Hip Width',           description: 'Widest point, laid flat',               tolerance: 0.5,  base_m: 24.0,  grade: 1.0  },
  { measurement_id: 'front_rise',        label: 'Front Rise',          description: 'Waistband to crotch seam (front)',      tolerance: 0.25, base_m: 12.5,  grade: 0.25 },
  { measurement_id: 'back_rise',         label: 'Back Rise',           description: 'Waistband to crotch seam (back)',       tolerance: 0.25, base_m: 15.0,  grade: 0.25 },
  { measurement_id: 'inseam',            label: 'Inseam',              description: 'Crotch to hem',                         tolerance: 0.5,  base_m: 30.0,  grade: 0.5  },
  { measurement_id: 'outseam',           label: 'Outseam',             description: 'Waist to hem (side)',                   tolerance: 0.5,  base_m: 41.0,  grade: 0.5  },
  { measurement_id: 'thigh_width',       label: 'Thigh Width',         description: '1" below crotch, laid flat',            tolerance: 0.25, base_m: 13.5,  grade: 0.5  },
  { measurement_id: 'knee_width',        label: 'Knee Width',          description: 'At knee, laid flat',                    tolerance: 0.25, base_m: 9.5,   grade: 0.25 },
  { measurement_id: 'leg_opening',       label: 'Leg Opening',         description: 'Hem circumference/width',               tolerance: 0.25, base_m: 6.5,   grade: 0.125 },
  { measurement_id: 'waistband_height',  label: 'Waistband Height',    description: 'Height of elastic waistband',           tolerance: 0.25, base_m: 2.5,   grade: 0    },
  { measurement_id: 'drawcord_length',   label: 'Drawcord Length',     description: 'Total exposed length',                  tolerance: 0.5,  base_m: 24.0,  grade: 0    },
  { measurement_id: 'side_pocket_depth', label: 'Side Pocket Depth',   description: 'Opening to bottom',                    tolerance: 0.25, base_m: 7.5,   grade: 0    },
  { measurement_id: 'back_pocket_width', label: 'Back Pocket Width',   description: 'Patch pocket width',                   tolerance: 0.25, base_m: 6.5,   grade: 0    },
];

// ─── POM map by category ──────────────────────────────────────────────────────

const POMS_BY_CATEGORY: Record<string, PomDefinition[]> = {
  hoodie:     HOODIE_POMS,
  sweatshirt: SWEATSHIRT_POMS,
  sweatpants: SWEATPANTS_POMS,
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Get the POM definitions for a garment category, filtered by sub-type.
 * E.g. zip_hoodie includes zipper_length; pullover_hoodie does not.
 */
export function getPomDefinitions(
  category: string,
  subType?: SubType,
): PomDefinition[] {
  const defs = POMS_BY_CATEGORY[category] ?? [];
  return defs.filter(
    (d) => !d.applicable || (subType && d.applicable.includes(subType))
  );
}

/**
 * Compute pre-filled measurement values for a given category, size, and fit.
 * Returns an array of { measurement_id, label, description, value_inches, tolerance }
 * sorted by definition order.
 */
export function computeMeasurements(
  category: string,
  size: BaseSize,
  fit: FitType,
  subType?: SubType,
): Array<{
  measurement_id: string;
  label: string;
  description: string;
  value_inches: number;
  tolerance: number;
  sort_order: number;
}> {
  const defs = getPomDefinitions(category, subType);
  const sizeIdx = SIZE_INDEX[size] ?? SIZE_INDEX['M'];
  const fitAdj = FIT_ADJUSTMENTS[fit] ?? {};

  return defs.map((def, i) => {
    const sized = def.base_m + (sizeIdx - 2) * def.grade;
    const adj = fitAdj[def.measurement_id] ?? 0;
    const raw = sized + adj;
    // Round to nearest 0.125" (1/8 inch, industry standard precision)
    const value_inches = Math.round(raw * 8) / 8;

    return {
      measurement_id: def.measurement_id,
      label: def.label,
      description: def.description,
      value_inches,
      tolerance: def.tolerance,
      sort_order: i,
    };
  });
}

/**
 * Convert inches to centimeters (UI display helper).
 */
export function inchesToCm(inches: number): number {
  return Math.round(inches * 2.54 * 10) / 10;
}

// ── Group mapping ─────────────────────────────────────────────────────────────

export const POM_GROUP_MAP: Record<string, string> = {
  // body
  body_length:      'body',
  chest_width:      'body',
  shoulder_across:  'body',
  hem_width:        'body',
  front_length:     'body',
  neck_opening:     'body',
  armhole_straight: 'body',
  armhole_curved:   'body',
  neckband_width:   'body',
  neckband_height:  'body',
  // sleeve
  sleeve_length:    'sleeve',
  upper_arm:        'sleeve',
  cuff_width:       'sleeve',
  cuff_height:      'sleeve',
  hem_rib_height:   'sleeve',
  // hood
  hood_height:      'hood',
  hood_width:       'hood',
  // pocket
  pocket_width:     'pocket',
  pocket_height:    'pocket',
  side_pocket_depth:'pocket',
  back_pocket_width:'pocket',
  // zipper
  zipper_length:    'zipper',
  // drawcord
  drawcord_length:  'drawcord',
  // pants-specific
  waist_relaxed:    'body',
  waist_stretched:  'body',
  hip_width:        'body',
  front_rise:       'body',
  back_rise:        'body',
  inseam:           'body',
  outseam:          'body',
  thigh_width:      'body',
  knee_width:       'body',
  leg_opening:      'body',
  waistband_height: 'body',
};

export interface MeasurementTemplateRow {
  measurement_id:    string;
  label:             string;
  measurement_point: string | null;
  group_name:        string;
  base_value:        number | null;
  tolerance:         number;
  unit:              string;
  notes:             string | null;
  sort_order:        number;
}

/**
 * Get measurement template rows in the new wizard schema format.
 * Filters to only include groups that are visible based on confirmed features.
 */
export function getMeasurementTemplate(
  category: string,
  subType: SubType,
  size: BaseSize,
  visibleGroups: string[] = ['body', 'sleeve'],
): MeasurementTemplateRow[] {
  const defs  = getPomDefinitions(category, subType);
  const sizeIdx = SIZE_INDEX[size] ?? SIZE_INDEX['M'];

  return defs
    .map((def, i) => {
      const group = POM_GROUP_MAP[def.measurement_id] ?? 'body';
      const sized = def.base_m + (sizeIdx - 2) * def.grade;
      const base_value = Math.round(sized * 8) / 8;
      return {
        measurement_id:    def.measurement_id,
        label:             def.label,
        measurement_point: def.description,
        group_name:        group,
        base_value,
        tolerance:         def.tolerance,
        unit:              'inches',
        notes:             null,
        sort_order:        i,
      };
    })
    .filter(row => visibleGroups.includes(row.group_name));
}
