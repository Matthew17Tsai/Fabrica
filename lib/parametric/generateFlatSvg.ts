import { readFile } from "fs/promises";
import path from "path";
import type { GarmentCategory, GarmentParams, GarmentFeatures } from "../ai/types";

// ── Defaults per category ─────────────────────────────────────────

const DEFAULTS: Record<GarmentCategory, GarmentParams> = {
  hoodie: {
    bodyWidth: 0.6,
    bodyLength: 0.65,
    shoulderWidth: 0.55,
    sleeveLength: 0.55,
    sleeveWidth: 0.22,
    hoodWidth: 0.35,
    hoodHeight: 0.25,
    pocketTopY: 0.6,
  },
  sweatshirt: {
    bodyWidth: 0.6,
    bodyLength: 0.65,
    shoulderWidth: 0.55,
    sleeveLength: 0.55,
    sleeveWidth: 0.22,
  },
  sweatpants: {
    bodyWidth: 0.45,
    bodyLength: 0.95,
    shoulderWidth: 0,
    sleeveLength: 0,
    sleeveWidth: 0,
    legWidth: 0.25,
    inseam: 0.55,
    rise: 0.3,
  },
};

const DEFAULT_FEATURES: Record<GarmentCategory, GarmentFeatures> = {
  hoodie: { zip: false, kangarooPocket: true, drawcord: true, ribHem: true, ribCuff: true },
  sweatshirt: { zip: false, drawcord: false, ribHem: true, ribCuff: true },
  sweatpants: { drawcord: true },
};

// ── SVG canvas ────────────────────────────────────────────────────

const W = 400;
const H = 500;
const CX = W / 2;
const STROKE = "#1a1a1a";
const SW = 1.6;
const DASH = "4 3";

// ── Helpers ───────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Try loading a template SVG; return null if not found */
async function loadTemplate(category: GarmentCategory): Promise<string | null> {
  try {
    const p = path.join(process.cwd(), "public", "templates", "flats", `${category}.svg`);
    return await readFile(p, "utf-8");
  } catch {
    return null;
  }
}

// ── Procedural generators (fallback when no template) ─────────────

function generateHoodieSvg(p: GarmentParams, f: GarmentFeatures): string {
  const bw = lerp(140, 240, p.bodyWidth);
  const bl = lerp(180, 320, p.bodyLength);
  const sw = lerp(100, 200, p.shoulderWidth);
  const sl = lerp(80, 200, p.sleeveLength);
  const slw = lerp(40, 100, p.sleeveWidth);
  const hw = lerp(60, 140, p.hoodWidth ?? 0.35);
  const hh = lerp(40, 100, p.hoodHeight ?? 0.25);

  const bodyTop = 120;
  const bodyLeft = CX - bw / 2;
  const bodyRight = CX + bw / 2;
  const bodyBottom = bodyTop + bl;

  const shoulderLeft = CX - sw / 2;
  const shoulderRight = CX + sw / 2;

  // Outline
  const outlinePath = [
    `M ${shoulderLeft} ${bodyTop}`,
    `L ${bodyLeft} ${bodyTop + 20}`,
    `L ${bodyLeft} ${bodyBottom}`,
    `L ${bodyRight} ${bodyBottom}`,
    `L ${bodyRight} ${bodyTop + 20}`,
    `L ${shoulderRight} ${bodyTop}`,
    `Z`,
  ].join(" ");

  // Sleeves
  const sleeveYStart = bodyTop + 10;
  const leftSleeve = [
    `M ${bodyLeft} ${sleeveYStart}`,
    `L ${bodyLeft - sl} ${sleeveYStart + sl * 0.7}`,
    `L ${bodyLeft - sl + slw} ${sleeveYStart + sl * 0.7 + slw * 0.3}`,
    `L ${bodyLeft} ${sleeveYStart + slw + 20}`,
  ].join(" ");
  const rightSleeve = [
    `M ${bodyRight} ${sleeveYStart}`,
    `L ${bodyRight + sl} ${sleeveYStart + sl * 0.7}`,
    `L ${bodyRight + sl - slw} ${sleeveYStart + sl * 0.7 + slw * 0.3}`,
    `L ${bodyRight} ${sleeveYStart + slw + 20}`,
  ].join(" ");

  // Hood
  const hoodPath = [
    `M ${CX - hw / 2} ${bodyTop}`,
    `Q ${CX - hw / 2 - 10} ${bodyTop - hh} ${CX} ${bodyTop - hh - 10}`,
    `Q ${CX + hw / 2 + 10} ${bodyTop - hh} ${CX + hw / 2} ${bodyTop}`,
  ].join(" ");

  // Details
  const details: string[] = [];

  if (f.kangarooPocket) {
    const py = lerp(bodyTop + bl * 0.4, bodyTop + bl * 0.7, p.pocketTopY ?? 0.6);
    const pw = bw * 0.55;
    details.push(
      `<rect x="${CX - pw / 2}" y="${py}" width="${pw}" height="${bl * 0.18}" rx="4" fill="none" stroke="${STROKE}" stroke-width="${SW}" stroke-dasharray="${DASH}" />`
    );
  }

  if (f.zip) {
    details.push(
      `<line x1="${CX}" y1="${bodyTop}" x2="${CX}" y2="${bodyBottom}" stroke="${STROKE}" stroke-width="${SW}" stroke-dasharray="${DASH}" />`
    );
  }

  if (f.drawcord) {
    const dy = bodyTop + 8;
    details.push(
      `<path d="M ${CX - 12} ${dy} Q ${CX - 8} ${dy + 15} ${CX - 4} ${dy}" fill="none" stroke="${STROKE}" stroke-width="1" />`,
      `<path d="M ${CX + 4} ${dy} Q ${CX + 8} ${dy + 15} ${CX + 12} ${dy}" fill="none" stroke="${STROKE}" stroke-width="1" />`
    );
  }

  if (f.ribHem) {
    details.push(
      `<rect x="${bodyLeft}" y="${bodyBottom - 12}" width="${bw}" height="12" fill="none" stroke="${STROKE}" stroke-width="0.8" stroke-dasharray="2 2" />`
    );
  }

  if (f.ribCuff) {
    // Left cuff
    const lcx = bodyLeft - sl + slw * 0.5;
    const lcy = sleeveYStart + sl * 0.7 + slw * 0.15;
    details.push(
      `<rect x="${lcx - slw * 0.3}" y="${lcy - 5}" width="${slw * 0.6}" height="10" rx="2" fill="none" stroke="${STROKE}" stroke-width="0.8" stroke-dasharray="2 2" />`
    );
    // Right cuff (mirror)
    const rcx = bodyRight + sl - slw * 0.5;
    details.push(
      `<rect x="${rcx - slw * 0.3}" y="${lcy - 5}" width="${slw * 0.6}" height="10" rx="2" fill="none" stroke="${STROKE}" stroke-width="0.8" stroke-dasharray="2 2" />`
    );
  }

  return buildSvg([
    `<g id="Outline">`,
    `  <path d="${outlinePath}" fill="none" stroke="${STROKE}" stroke-width="${SW}" />`,
    `  <path d="${leftSleeve}" fill="none" stroke="${STROKE}" stroke-width="${SW}" />`,
    `  <path d="${rightSleeve}" fill="none" stroke="${STROKE}" stroke-width="${SW}" />`,
    `  <path d="${hoodPath}" fill="none" stroke="${STROKE}" stroke-width="${SW}" />`,
    `</g>`,
    `<g id="Details">`,
    ...details.map((d) => `  ${d}`),
    `</g>`,
    `<g id="Callouts"></g>`,
  ]);
}

function generateSweatshirtSvg(p: GarmentParams, f: GarmentFeatures): string {
  const bw = lerp(140, 240, p.bodyWidth);
  const bl = lerp(180, 320, p.bodyLength);
  const sw = lerp(100, 200, p.shoulderWidth);
  const sl = lerp(80, 200, p.sleeveLength);
  const slw = lerp(40, 100, p.sleeveWidth);

  const bodyTop = 80;
  const bodyLeft = CX - bw / 2;
  const bodyRight = CX + bw / 2;
  const bodyBottom = bodyTop + bl;
  const shoulderLeft = CX - sw / 2;
  const shoulderRight = CX + sw / 2;

  // Neckline
  const neckPath = `M ${shoulderLeft} ${bodyTop} Q ${CX} ${bodyTop - 15} ${shoulderRight} ${bodyTop}`;

  const outlinePath = [
    `M ${shoulderLeft} ${bodyTop}`,
    `L ${bodyLeft} ${bodyTop + 20}`,
    `L ${bodyLeft} ${bodyBottom}`,
    `L ${bodyRight} ${bodyBottom}`,
    `L ${bodyRight} ${bodyTop + 20}`,
    `L ${shoulderRight} ${bodyTop}`,
  ].join(" ");

  const sleeveYStart = bodyTop + 10;
  const leftSleeve = [
    `M ${bodyLeft} ${sleeveYStart}`,
    `L ${bodyLeft - sl} ${sleeveYStart + sl * 0.7}`,
    `L ${bodyLeft - sl + slw} ${sleeveYStart + sl * 0.7 + slw * 0.3}`,
    `L ${bodyLeft} ${sleeveYStart + slw + 20}`,
  ].join(" ");
  const rightSleeve = [
    `M ${bodyRight} ${sleeveYStart}`,
    `L ${bodyRight + sl} ${sleeveYStart + sl * 0.7}`,
    `L ${bodyRight + sl - slw} ${sleeveYStart + sl * 0.7 + slw * 0.3}`,
    `L ${bodyRight} ${sleeveYStart + slw + 20}`,
  ].join(" ");

  const details: string[] = [];
  if (f.ribHem) {
    details.push(
      `<rect x="${bodyLeft}" y="${bodyBottom - 12}" width="${bw}" height="12" fill="none" stroke="${STROKE}" stroke-width="0.8" stroke-dasharray="2 2" />`
    );
  }
  if (f.ribCuff) {
    const lcx = bodyLeft - sl + slw * 0.5;
    const lcy = sleeveYStart + sl * 0.7 + slw * 0.15;
    details.push(
      `<rect x="${lcx - slw * 0.3}" y="${lcy - 5}" width="${slw * 0.6}" height="10" rx="2" fill="none" stroke="${STROKE}" stroke-width="0.8" stroke-dasharray="2 2" />`
    );
    const rcx = bodyRight + sl - slw * 0.5;
    details.push(
      `<rect x="${rcx - slw * 0.3}" y="${lcy - 5}" width="${slw * 0.6}" height="10" rx="2" fill="none" stroke="${STROKE}" stroke-width="0.8" stroke-dasharray="2 2" />`
    );
  }

  return buildSvg([
    `<g id="Outline">`,
    `  <path d="${outlinePath}" fill="none" stroke="${STROKE}" stroke-width="${SW}" />`,
    `  <path d="${neckPath}" fill="none" stroke="${STROKE}" stroke-width="${SW}" />`,
    `  <path d="${leftSleeve}" fill="none" stroke="${STROKE}" stroke-width="${SW}" />`,
    `  <path d="${rightSleeve}" fill="none" stroke="${STROKE}" stroke-width="${SW}" />`,
    `</g>`,
    `<g id="Details">`,
    ...details.map((d) => `  ${d}`),
    `</g>`,
    `<g id="Callouts"></g>`,
  ]);
}

function generateSweatpantsSvg(p: GarmentParams, f: GarmentFeatures): string {
  const bw = lerp(100, 200, p.bodyWidth);
  const bl = lerp(300, 450, p.bodyLength);
  const lw = lerp(50, 120, p.legWidth ?? 0.25);
  const inseam = lerp(0.4, 0.7, p.inseam ?? 0.55);
  const rise = lerp(0.15, 0.35, p.rise ?? 0.3);

  const top = 40;
  const waistLeft = CX - bw / 2;
  const waistRight = CX + bw / 2;
  const bottom = top + bl;
  const crotchY = top + bl * rise;
  const inseamY = top + bl * inseam;

  const outlinePath = [
    `M ${waistLeft} ${top}`,
    `L ${waistLeft - 10} ${crotchY}`,
    `L ${CX - lw / 2 - 15} ${inseamY}`,
    `L ${CX - lw / 2} ${bottom}`,
    `L ${CX - lw / 2 + lw} ${bottom}`,
    `L ${CX - 2} ${inseamY}`,
    `L ${CX + 2} ${inseamY}`,
    `L ${CX + lw / 2 - lw} ${bottom}`,
    `L ${CX + lw / 2} ${bottom}`,
    `L ${CX + lw / 2 + 15} ${inseamY}`,
    `L ${waistRight + 10} ${crotchY}`,
    `L ${waistRight} ${top}`,
    `Z`,
  ].join(" ");

  const details: string[] = [];
  if (f.drawcord) {
    details.push(
      `<path d="M ${CX - 12} ${top + 10} Q ${CX - 8} ${top + 25} ${CX - 4} ${top + 10}" fill="none" stroke="${STROKE}" stroke-width="1" />`,
      `<path d="M ${CX + 4} ${top + 10} Q ${CX + 8} ${top + 25} ${CX + 12} ${top + 10}" fill="none" stroke="${STROKE}" stroke-width="1" />`
    );
  }

  // Waistband
  details.push(
    `<rect x="${waistLeft}" y="${top}" width="${bw}" height="16" fill="none" stroke="${STROKE}" stroke-width="0.8" stroke-dasharray="2 2" />`
  );

  return buildSvg([
    `<g id="Outline">`,
    `  <path d="${outlinePath}" fill="none" stroke="${STROKE}" stroke-width="${SW}" />`,
    `</g>`,
    `<g id="Details">`,
    ...details.map((d) => `  ${d}`),
    `</g>`,
    `<g id="Callouts"></g>`,
  ]);
}

function buildSvg(inner: string[]): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`,
    ...inner,
    `</svg>`,
  ].join("\n");
}

// ── Template-based transform (if template exists) ─────────────────

function applyParamsToTemplate(
  templateSvg: string,
  category: GarmentCategory,
  params: GarmentParams,
  _features: GarmentFeatures
): string {
  const defaults = DEFAULTS[category];

  // Apply scale transforms to known group IDs
  const groupScales: Record<string, { sx: number; sy: number }> = {};

  if (category === "hoodie" || category === "sweatshirt") {
    groupScales["Body"] = {
      sx: (params.bodyWidth || defaults.bodyWidth) / defaults.bodyWidth,
      sy: (params.bodyLength || defaults.bodyLength) / defaults.bodyLength,
    };
    groupScales["Sleeves"] = {
      sx: (params.sleeveLength || defaults.sleeveLength) / defaults.sleeveLength,
      sy: (params.sleeveWidth || defaults.sleeveWidth) / defaults.sleeveWidth,
    };
  }
  if (category === "hoodie") {
    groupScales["Hood"] = {
      sx: (params.hoodWidth || defaults.hoodWidth!) / defaults.hoodWidth!,
      sy: (params.hoodHeight || defaults.hoodHeight!) / defaults.hoodHeight!,
    };
  }

  let svg = templateSvg;
  for (const [groupId, { sx, sy }] of Object.entries(groupScales)) {
    const regex = new RegExp(`(<g[^>]*id=["']${groupId}["'])`, "g");
    svg = svg.replace(regex, `$1 transform="scale(${sx.toFixed(3)} ${sy.toFixed(3)})"`);
  }

  return svg;
}

// ── Public API ────────────────────────────────────────────────────

export async function generateFlatSvg(
  category: GarmentCategory,
  params?: GarmentParams,
  features?: GarmentFeatures
): Promise<string> {
  const p = { ...DEFAULTS[category], ...params };
  const f = { ...DEFAULT_FEATURES[category], ...features };

  // Try template first
  const template = await loadTemplate(category);
  if (template) {
    return applyParamsToTemplate(template, category, p, f);
  }

  // Procedural fallback
  switch (category) {
    case "hoodie":
      return generateHoodieSvg(p, f);
    case "sweatshirt":
      return generateSweatshirtSvg(p, f);
    case "sweatpants":
      return generateSweatpantsSvg(p, f);
  }
}
