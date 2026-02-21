/**
 * Feature-to-BOM and Feature-to-POM cascade maps.
 *
 * When a user toggles a feature ON in Step 1, these maps define which BOM
 * items to add and which POM groups to show in Step 3.
 * When a feature is toggled OFF, the corresponding items/groups are removed.
 */

import type { SubType, BomCategory } from '@/lib/db';
import { TRIM_DEFAULTS } from './materials';

export interface ConfirmedFeatures {
  hasHood:        boolean;
  hasDrawcord:    boolean;
  hasZipper:      boolean;
  hasPockets:     boolean;
  hasRibCuffs:    boolean;
  hasRibHem:      boolean;
  hasThumbHoles:  boolean;
  // Detail sub-types
  pocketType:   'single_kangaroo' | 'split_kangaroo' | 'side_seam' | 'none';
  zipperType:   'full_front_metal' | 'full_front_nylon' | 'none';
  hoodStyle:    'standard_2panel' | 'drawstring' | 'none';
  subType:      SubType;
}

export interface BomAddition {
  category:   BomCategory;
  component:  string;
  material:   string;
  composition: string;
  specification: string | null;
  notes:      string | null;
  unit_price: number;
  unit:       string;
  consumption: number;
  wastage:    number;
  price_source: string;
}

// ── POM group visibility ──────────────────────────────────────────────────────

/**
 * Returns which POM group names should be visible based on confirmed features.
 * 'body' and 'sleeve' are always present.
 */
export function getPomGroupsForFeatures(features: Partial<ConfirmedFeatures>): string[] {
  const groups = ['body', 'sleeve'];
  if (features.hasHood)     groups.push('hood');
  if (features.hasPockets)  groups.push('pocket');
  if (features.hasZipper)   groups.push('zipper');
  if (features.hasDrawcord) groups.push('drawcord');
  return groups;
}

// ── Feature BOM additions ─────────────────────────────────────────────────────

/**
 * Get the BOM items to ADD when a feature is enabled.
 * Returns empty array if no additions needed.
 */
export function getBomAdditionsForFeature(
  feature: keyof ConfirmedFeatures,
  features: Partial<ConfirmedFeatures>,
): BomAddition[] {
  if (feature === 'hasDrawcord') {
    const drawcordTrim = TRIM_DEFAULTS['Flat Cotton Drawcord'];
    const grommetTrim  = TRIM_DEFAULTS['Metal Grommets'];
    return [
      {
        category:    'trim',
        component:   'Drawcord',
        material:    'Flat Cotton Drawcord',
        composition: '100% Cotton',
        specification: '5mm flat',
        notes:       'Hood drawstring',
        unit_price:  drawcordTrim.unitPrice,
        unit:        drawcordTrim.unit,
        consumption: drawcordTrim.consumption,
        wastage:     drawcordTrim.wastage,
        price_source: 'default_asia',
      },
      {
        category:    'trim',
        component:   'Grommets',
        material:    'Metal Grommets',
        composition: 'Metal',
        specification: '10mm ID',
        notes:       '2 pcs for drawcord',
        unit_price:  grommetTrim.unitPrice,
        unit:        grommetTrim.unit,
        consumption: grommetTrim.consumption,
        wastage:     grommetTrim.wastage,
        price_source: 'default_asia',
      },
    ];
  }

  if (feature === 'hasZipper') {
    const isNylon = features.zipperType === 'full_front_nylon';
    const trimKey = isNylon ? 'YKK Nylon #5 Zipper' : 'YKK Metal #5 Zipper';
    const trim    = TRIM_DEFAULTS[trimKey];
    return [{
      category:    'trim',
      component:   'Zipper',
      material:    trimKey,
      composition: isNylon ? 'Nylon/Polyester' : 'Metal/Polyester',
      specification: '#5 gauge',
      notes:       'Full front zip',
      unit_price:  trim.unitPrice,
      unit:        trim.unit,
      consumption: trim.consumption,
      wastage:     trim.wastage,
      price_source: 'default_asia',
    }];
  }

  if (feature === 'hasPockets') {
    const isPocketBagNeeded =
      features.pocketType === 'side_seam' ||
      features.subType === 'sweatpants';
    if (isPocketBagNeeded) {
      const trim = TRIM_DEFAULTS['Pocket Lining'];
      return [{
        category:    'trim',
        component:   'Pocket Bag',
        material:    'Pocket Lining',
        composition: '100% Cotton',
        specification: '150 GSM',
        notes:       'Pocket bag lining',
        unit_price:  trim.unitPrice,
        unit:        trim.unit,
        consumption: trim.consumption,
        wastage:     trim.wastage,
        price_source: 'default_asia',
      }];
    }
  }

  return [];
}

/**
 * Get the BOM component names to REMOVE when a feature is disabled.
 */
export function getBomRemovalsForFeature(feature: keyof ConfirmedFeatures): string[] {
  const map: Partial<Record<keyof ConfirmedFeatures, string[]>> = {
    hasDrawcord: ['Drawcord', 'Grommets', 'Cord Lock'],
    hasZipper:   ['Zipper'],
    hasPockets:  ['Pocket Bag'],
  };
  return map[feature] ?? [];
}

// ── Default confirmed features from AI analysis ───────────────────────────────

/**
 * Build default ConfirmedFeatures from a garment SubType.
 * Used when no AI analysis is available.
 */
export function defaultFeaturesForSubType(subType: SubType): ConfirmedFeatures {
  const isHoodie  = subType !== 'crewneck' && subType !== 'sweatpants';
  const isZip     = subType === 'zip_hoodie';
  const isPants   = subType === 'sweatpants';

  return {
    hasHood:       isHoodie,
    hasDrawcord:   isHoodie,
    hasZipper:     isZip,
    hasPockets:    isHoodie || isPants,
    hasRibCuffs:   true,
    hasRibHem:     !isPants,
    hasThumbHoles: false,
    pocketType:    isZip ? 'split_kangaroo' : isPants ? 'side_seam' : 'single_kangaroo',
    zipperType:    isZip ? 'full_front_metal' : 'none',
    hoodStyle:     isHoodie ? 'standard_2panel' : 'none',
    subType,
  };
}

// ── Feature confidence display ────────────────────────────────────────────────

/** Map AI confidence score (0-1) to 1-5 dot rating for display. */
export function confidenceToDots(confidence: number): number {
  return Math.max(1, Math.min(5, Math.round(confidence * 5)));
}
