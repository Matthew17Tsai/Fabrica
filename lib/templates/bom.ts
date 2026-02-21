/**
 * Bill of Materials templates with pricing.
 *
 * Each template includes pricing defaults (unit_price, unit, consumption, wastage)
 * so that cost is calculated immediately on project creation.
 */

import type { SubType, BomCategory } from '@/lib/db';
import type { ConfirmedFeatures } from '@/lib/cost/features';

export interface BomTemplate {
  category:    BomCategory;
  component:   string;
  material:    string;
  composition: string;
  specification: string | null;
  notes:       string | null;
  unit_price:  number;
  unit:        string;
  consumption: number;
  wastage:     number;
  price_source: string;
}

// ── Fabric rows ───────────────────────────────────────────────────────────────

const BODY_FABRIC: BomTemplate = {
  category:    'fabric',
  component:   'Body Fabric',
  material:    'French Terry',
  composition: '80% Cotton / 20% Polyester',
  specification: '280 GSM',
  notes:       'Main body, sleeves, hood',
  unit_price:  4.20,
  unit:        'yard',
  consumption: 1.75,
  wastage:     12,
  price_source: 'default_asia',
};

const RIB_FABRIC: BomTemplate = {
  category:    'fabric',
  component:   'Rib Fabric',
  material:    '1x1 Rib',
  composition: '95% Cotton / 5% Spandex',
  specification: '240 GSM',
  notes:       'Cuffs and hem',
  unit_price:  3.50,
  unit:        'yard',
  consumption: 0.25,
  wastage:     15,
  price_source: 'default_asia',
};

// ── Trim rows ─────────────────────────────────────────────────────────────────

const DRAWCORD: BomTemplate = {
  category:    'trim',
  component:   'Drawcord',
  material:    'Flat Cotton Drawcord',
  composition: '100% Cotton',
  specification: '5mm flat',
  notes:       'Hood drawstring',
  unit_price:  0.35,
  unit:        'piece',
  consumption: 1,
  wastage:     0,
  price_source: 'default_asia',
};

const GROMMETS: BomTemplate = {
  category:    'trim',
  component:   'Grommets',
  material:    'Metal Grommets',
  composition: 'Metal',
  specification: '10mm ID',
  notes:       '2 pcs for drawcord',
  unit_price:  0.12,
  unit:        'piece',
  consumption: 2,
  wastage:     0,
  price_source: 'default_asia',
};

const ZIPPER_METAL: BomTemplate = {
  category:    'trim',
  component:   'Zipper',
  material:    'YKK Metal #5 Zipper',
  composition: 'Metal/Polyester',
  specification: '#5 gauge',
  notes:       'Full front zip',
  unit_price:  1.20,
  unit:        'piece',
  consumption: 1,
  wastage:     0,
  price_source: 'default_asia',
};

const ELASTIC_WAIST: BomTemplate = {
  category:    'trim',
  component:   'Elastic',
  material:    'Woven Elastic (35mm)',
  composition: 'Polyester/Rubber',
  specification: '35mm width',
  notes:       'Waistband',
  unit_price:  0.45,
  unit:        'piece',
  consumption: 1,
  wastage:     0,
  price_source: 'default_asia',
};

const DRAWCORD_WAIST: BomTemplate = {
  category:    'trim',
  component:   'Drawcord',
  material:    'Flat Cotton Drawcord',
  composition: '100% Cotton',
  specification: '5mm flat',
  notes:       'Waistband',
  unit_price:  0.35,
  unit:        'piece',
  consumption: 1,
  wastage:     0,
  price_source: 'default_asia',
};

const POCKET_BAG: BomTemplate = {
  category:    'trim',
  component:   'Pocket Bag',
  material:    'Pocket Lining',
  composition: '100% Cotton',
  specification: '150 GSM',
  notes:       'Side + back pockets',
  unit_price:  0.30,
  unit:        'piece',
  consumption: 1,
  wastage:     0,
  price_source: 'default_asia',
};

// ── Label rows ────────────────────────────────────────────────────────────────

const MAIN_LABEL: BomTemplate = {
  category:    'label',
  component:   'Main Label',
  material:    'Main Woven Label',
  composition: 'Polyester',
  specification: 'Standard',
  notes:       'Inside back neck',
  unit_price:  0.08,
  unit:        'piece',
  consumption: 1,
  wastage:     0,
  price_source: 'default_asia',
};

const SIZE_LABEL: BomTemplate = {
  category:    'label',
  component:   'Size Label',
  material:    'Size Label (Printed)',
  composition: 'Polyester Satin',
  specification: 'Standard',
  notes:       'Inside side seam',
  unit_price:  0.03,
  unit:        'piece',
  consumption: 1,
  wastage:     0,
  price_source: 'default_asia',
};

const CARE_LABEL: BomTemplate = {
  category:    'label',
  component:   'Care Label',
  material:    'Care Label (Printed)',
  composition: 'Polyester Satin',
  specification: 'Standard',
  notes:       'Inside side seam',
  unit_price:  0.04,
  unit:        'piece',
  consumption: 1,
  wastage:     0,
  price_source: 'default_asia',
};

// ── Thread + packaging rows ───────────────────────────────────────────────────

const THREAD: BomTemplate = {
  category:    'thread',
  component:   'Thread',
  material:    'Poly-Poly Thread',
  composition: '100% Polyester',
  specification: '40/2',
  notes:       'All construction',
  unit_price:  0.08,
  unit:        'piece',
  consumption: 1,
  wastage:     0,
  price_source: 'default_asia',
};

const POLYBAG: BomTemplate = {
  category:    'packaging',
  component:   'Polybag',
  material:    'Polybag',
  composition: 'LDPE',
  specification: 'Standard',
  notes:       null,
  unit_price:  0.03,
  unit:        'piece',
  consumption: 1,
  wastage:     0,
  price_source: 'default_asia',
};

// ── Template builders ─────────────────────────────────────────────────────────

/**
 * Build the complete BOM template for a garment, incorporating confirmed features.
 * Returns items in display order (fabric → trims → labels → thread → packaging).
 */
export function getBomTemplateWithPricing(
  category: string,
  subType?: SubType,
  features?: Partial<ConfirmedFeatures>,
): BomTemplate[] {
  const items: BomTemplate[] = [];

  if (category === 'sweatpants') {
    // Sweatpants fabric (more consumption for legs)
    items.push({
      ...BODY_FABRIC,
      consumption: 2.10,
      notes: 'Main body, legs',
    });
    items.push({ ...RIB_FABRIC, notes: 'Leg cuffs' });
    items.push(ELASTIC_WAIST);
    items.push(DRAWCORD_WAIST);
    items.push(POCKET_BAG);
  } else {
    // Tops (hoodie, sweatshirt, crewneck)
    const isHoodie = subType !== 'crewneck';
    items.push({
      ...BODY_FABRIC,
      notes: isHoodie ? 'Main body, sleeves, hood' : 'Main body and sleeves',
    });
    items.push({
      ...RIB_FABRIC,
      notes: category === 'sweatshirt' && subType === 'crewneck'
        ? 'Cuffs, hem, neckband'
        : 'Cuffs and hem',
    });

    // Conditional trims based on features
    const hasZipper  = features?.hasZipper  ?? subType === 'zip_hoodie';
    const hasDraw    = features?.hasDrawcord ?? (isHoodie);

    if (hasZipper) {
      items.push(ZIPPER_METAL);
    }
    if (hasDraw && isHoodie) {
      items.push(DRAWCORD);
      items.push(GROMMETS);
    }
  }

  // Labels and packaging (always)
  items.push(MAIN_LABEL, SIZE_LABEL, CARE_LABEL);
  items.push(THREAD);
  items.push(POLYBAG);

  return items;
}

// ─── Construction note templates (unchanged) ──────────────────────────────────

export interface ConstructionNoteTemplate {
  section: string;
  content: string;
}

const HOODIE_CONSTRUCTION: ConstructionNoteTemplate[] = [
  { section: 'seams',     content: '5/8" seam allowance throughout. Side seams and sleeve seams: overlock (serger) stitch. Shoulder seams: double-needle flatlock.' },
  { section: 'finishing', content: 'Bottom hem and cuffs: attach 1x1 rib band with overlock stitch, then topstitch with coverstitch for clean finish.' },
  { section: 'hood',      content: 'Hood: two-panel construction, top seam with overlock. Hood attachment to neckline with overlock, then topstitch. Thread drawcord through hood channel and secure with brass grommets at front.' },
  { section: 'pocket',    content: 'Kangaroo pocket: attach to front body, bar-tack at corners for reinforcement. Overlock raw edges before attachment.' },
  { section: 'labels',    content: 'Main woven label: sewn at center back neck. Size label + care label: sewn together at left side seam, 2" below armhole.' },
  { section: 'quality',   content: 'Inspect all seams for consistency. Check rib attachment tension. Verify drawcord passes freely through hood channel. Steam press finished garment.' },
];

const SWEATSHIRT_CONSTRUCTION: ConstructionNoteTemplate[] = [
  { section: 'seams',     content: '5/8" seam allowance. Side seams and sleeve seams: overlock stitch. Shoulder seams: double-needle flatlock.' },
  { section: 'finishing', content: 'Bottom hem and cuffs: 1x1 rib band, overlock attach, coverstitch topstitch. Neckband: 1x1 rib, overlock attach, topstitch.' },
  { section: 'labels',    content: 'Main woven label: center back neck. Size + care label: left side seam, 2" below armhole.' },
  { section: 'quality',   content: 'Check all seam consistency. Inspect neckband attachment. Steam press finished garment.' },
];

const SWEATPANTS_CONSTRUCTION: ConstructionNoteTemplate[] = [
  { section: 'seams',     content: '5/8" seam allowance. Inseam and outseam: overlock stitch. Crotch seam: reinforced with double overlock pass.' },
  { section: 'waistband', content: 'Elastic waistband: fold-over construction enclosing 35mm elastic. Stitch channel with two rows of coverstitch. Thread cotton drawcord through front channel.' },
  { section: 'pockets',   content: 'Side pockets: attach pocket bag to outseam before closing. Bar-tack pocket openings at top and bottom.' },
  { section: 'cuffs',     content: 'Leg cuffs: attach 1x1 rib with overlock, topstitch with coverstitch.' },
  { section: 'labels',    content: 'Main woven label: inside back waist, center. Size label: inside left side seam, below waistband.' },
  { section: 'quality',   content: 'Check elastic tension and drawcord passage. Verify pocket attachment. Steam press finished garment.' },
];

export function getConstructionTemplate(category: string): ConstructionNoteTemplate[] {
  if (category === 'hoodie')      return HOODIE_CONSTRUCTION;
  if (category === 'sweatshirt')  return SWEATSHIRT_CONSTRUCTION;
  if (category === 'sweatpants')  return SWEATPANTS_CONSTRUCTION;
  return HOODIE_CONSTRUCTION;
}
