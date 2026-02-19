/**
 * Bill of Materials (BOM) templates.
 *
 * Pre-filled templates per garment category and sub-type.
 * All items can be edited by the designer in the UI.
 */

import type { SubType } from '../db';

export interface BomTemplate {
  component: string;
  material: string;
  composition: string;
  weight: string;
  supplier: string | null;
  color: string | null;
  notes: string;
}

// ─── Hoodie BOM ───────────────────────────────────────────────────────────────

const HOODIE_BASE: BomTemplate[] = [
  {
    component:   'Body Fabric',
    material:    'French Terry',
    composition: '80% Cotton / 20% Polyester',
    weight:      '280 GSM',
    supplier:    null,
    color:       null,
    notes:       'Main body, sleeves, hood',
  },
  {
    component:   'Rib Fabric',
    material:    '1x1 Rib',
    composition: '95% Cotton / 5% Spandex',
    weight:      '240 GSM',
    supplier:    null,
    color:       null,
    notes:       'Cuffs and hem',
  },
  {
    component:   'Drawcord',
    material:    'Flat Drawcord',
    composition: '100% Cotton',
    weight:      '5mm width',
    supplier:    null,
    color:       null,
    notes:       'Hood drawstring',
  },
  {
    component:   'Grommets',
    material:    'Brass Grommets',
    composition: 'Metal',
    weight:      '10mm ID',
    supplier:    null,
    color:       null,
    notes:       '2 pcs for drawcord',
  },
  {
    component:   'Main Label',
    material:    'Woven Label',
    composition: 'Polyester',
    weight:      'Standard',
    supplier:    null,
    color:       null,
    notes:       'Inside back neck',
  },
  {
    component:   'Size Label',
    material:    'Printed Label',
    composition: 'Polyester Satin',
    weight:      'Standard',
    supplier:    null,
    color:       null,
    notes:       'Inside side seam',
  },
  {
    component:   'Care Label',
    material:    'Printed Label',
    composition: 'Polyester Satin',
    weight:      'Standard',
    supplier:    null,
    color:       null,
    notes:       'Inside side seam',
  },
  {
    component:   'Thread',
    material:    'Poly-Poly Thread',
    composition: '100% Polyester',
    weight:      '40/2',
    supplier:    null,
    color:       null,
    notes:       'All construction',
  },
];

const HOODIE_ZIPPER_EXTRA: BomTemplate = {
  component:   'Zipper',
  material:    'YKK Metal Zipper',
  composition: 'Metal/Polyester',
  weight:      '#5 gauge',
  supplier:    null,
  color:       null,
  notes:       'Full front zip',
};

// ─── Sweatshirt BOM ───────────────────────────────────────────────────────────

const SWEATSHIRT_BOM: BomTemplate[] = [
  {
    component:   'Body Fabric',
    material:    'French Terry',
    composition: '80% Cotton / 20% Polyester',
    weight:      '280 GSM',
    supplier:    null,
    color:       null,
    notes:       'Main body and sleeves',
  },
  {
    component:   'Rib Fabric',
    material:    '1x1 Rib',
    composition: '95% Cotton / 5% Spandex',
    weight:      '240 GSM',
    supplier:    null,
    color:       null,
    notes:       'Cuffs, hem, neckband',
  },
  {
    component:   'Main Label',
    material:    'Woven Label',
    composition: 'Polyester',
    weight:      'Standard',
    supplier:    null,
    color:       null,
    notes:       'Inside back neck',
  },
  {
    component:   'Size Label',
    material:    'Printed Label',
    composition: 'Polyester Satin',
    weight:      'Standard',
    supplier:    null,
    color:       null,
    notes:       'Inside side seam',
  },
  {
    component:   'Care Label',
    material:    'Printed Label',
    composition: 'Polyester Satin',
    weight:      'Standard',
    supplier:    null,
    color:       null,
    notes:       'Inside side seam',
  },
  {
    component:   'Thread',
    material:    'Poly-Poly Thread',
    composition: '100% Polyester',
    weight:      '40/2',
    supplier:    null,
    color:       null,
    notes:       'All construction',
  },
];

// ─── Sweatpants BOM ───────────────────────────────────────────────────────────

const SWEATPANTS_BOM: BomTemplate[] = [
  {
    component:   'Body Fabric',
    material:    'French Terry',
    composition: '80% Cotton / 20% Polyester',
    weight:      '280 GSM',
    supplier:    null,
    color:       null,
    notes:       'Main body, legs',
  },
  {
    component:   'Rib Fabric',
    material:    '1x1 Rib',
    composition: '95% Cotton / 5% Spandex',
    weight:      '240 GSM',
    supplier:    null,
    color:       null,
    notes:       'Leg cuffs',
  },
  {
    component:   'Elastic',
    material:    'Woven Elastic',
    composition: 'Polyester/Rubber',
    weight:      '35mm width',
    supplier:    null,
    color:       null,
    notes:       'Waistband',
  },
  {
    component:   'Drawcord',
    material:    'Flat Drawcord',
    composition: '100% Cotton',
    weight:      '5mm width',
    supplier:    null,
    color:       null,
    notes:       'Waistband',
  },
  {
    component:   'Pocket Bag',
    material:    'Pocket Lining',
    composition: '100% Cotton',
    weight:      '150 GSM',
    supplier:    null,
    color:       null,
    notes:       'Side + back pockets',
  },
  {
    component:   'Main Label',
    material:    'Woven Label',
    composition: 'Polyester',
    weight:      'Standard',
    supplier:    null,
    color:       null,
    notes:       'Inside back waist',
  },
  {
    component:   'Size Label',
    material:    'Printed Label',
    composition: 'Polyester Satin',
    weight:      'Standard',
    supplier:    null,
    color:       null,
    notes:       'Inside side seam',
  },
  {
    component:   'Thread',
    material:    'Poly-Poly Thread',
    composition: '100% Polyester',
    weight:      '40/2',
    supplier:    null,
    color:       null,
    notes:       'All construction',
  },
];

// ─── Default construction notes per category ─────────────────────────────────

export interface ConstructionNoteTemplate {
  section: string;
  content: string;
}

const HOODIE_CONSTRUCTION: ConstructionNoteTemplate[] = [
  { section: 'seams',      content: '5/8" seam allowance throughout. Side seams and sleeve seams: overlock (serger) stitch. Shoulder seams: double-needle flatlock.' },
  { section: 'finishing',  content: 'Bottom hem and cuffs: attach 1x1 rib band with overlock stitch, then topstitch with coverstitch for clean finish.' },
  { section: 'hood',       content: 'Hood: two-panel construction, top seam with overlock. Hood attachment to neckline with overlock, then topstitch. Thread drawcord through hood channel and secure with brass grommets at front.' },
  { section: 'pocket',     content: 'Kangaroo pocket: attach to front body, bar-tack at corners for reinforcement. Overlock raw edges before attachment.' },
  { section: 'labels',     content: 'Main woven label: sewn at center back neck. Size label + care label: sewn together at left side seam, 2" below armhole.' },
  { section: 'quality',    content: 'Inspect all seams for consistency. Check rib attachment tension. Verify drawcord passes freely through hood channel. Steam press finished garment.' },
];

const SWEATSHIRT_CONSTRUCTION: ConstructionNoteTemplate[] = [
  { section: 'seams',      content: '5/8" seam allowance. Side seams and sleeve seams: overlock stitch. Shoulder seams: double-needle flatlock.' },
  { section: 'finishing',  content: 'Bottom hem and cuffs: 1x1 rib band, overlock attach, coverstitch topstitch. Neckband: 1x1 rib, overlock attach, topstitch.' },
  { section: 'labels',     content: 'Main woven label: center back neck. Size + care label: left side seam, 2" below armhole.' },
  { section: 'quality',    content: 'Check all seam consistency. Inspect neckband attachment. Steam press finished garment.' },
];

const SWEATPANTS_CONSTRUCTION: ConstructionNoteTemplate[] = [
  { section: 'seams',      content: '5/8" seam allowance. Inseam and outseam: overlock stitch. Crotch seam: reinforced with double overlock pass.' },
  { section: 'waistband',  content: 'Elastic waistband: fold-over construction enclosing 35mm elastic. Stitch channel with two rows of coverstitch. Thread cotton drawcord through front channel with tunnel opening at center front.' },
  { section: 'pockets',    content: 'Side pockets: attach pocket bag to outseam before closing. Overlock pocket bag edges. Bar-tack pocket openings at top and bottom. Back patch pockets: fold and press edges, topstitch to back panel with bar-tacks at corners.' },
  { section: 'cuffs',      content: 'Leg cuffs: attach 1x1 rib with overlock, topstitch with coverstitch.' },
  { section: 'labels',     content: 'Main woven label: inside back waist, center. Size label: inside left side seam, below waistband.' },
  { section: 'quality',    content: 'Check elastic tension and drawcord passage. Verify pocket attachment. Inspect all seams. Steam press finished garment.' },
];

// ─── Public API ───────────────────────────────────────────────────────────────

const CONSTRUCTION_BY_CATEGORY: Record<string, ConstructionNoteTemplate[]> = {
  hoodie:     HOODIE_CONSTRUCTION,
  sweatshirt: SWEATSHIRT_CONSTRUCTION,
  sweatpants: SWEATPANTS_CONSTRUCTION,
};

/**
 * Get the BOM template rows for a garment category and sub-type.
 * Zip hoodie gets an extra zipper row; all hoodies share the base template.
 */
export function getBomTemplate(category: string, subType?: SubType): BomTemplate[] {
  if (category === 'hoodie') {
    const base = [...HOODIE_BASE];
    if (subType === 'zip_hoodie') {
      // Insert zipper after grommets (index 4)
      base.splice(4, 0, HOODIE_ZIPPER_EXTRA);
    }
    return base;
  }
  if (category === 'sweatshirt') return SWEATSHIRT_BOM;
  if (category === 'sweatpants') return SWEATPANTS_BOM;
  return [];
}

/**
 * Get default construction notes for a category.
 */
export function getConstructionTemplate(category: string): ConstructionNoteTemplate[] {
  return CONSTRUCTION_BY_CATEGORY[category] ?? [];
}
