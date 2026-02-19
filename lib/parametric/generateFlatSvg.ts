import { readFile } from "fs/promises";
import path from "path";
import type {
  GarmentCategory,
  GarmentParams,
  GarmentFeatures,
} from "../ai/types";

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
  hoodie: {
    zip: false,
    kangarooPocket: true,
    drawcord: true,
    ribHem: true,
    ribCuff: true,
  },
  sweatshirt: { zip: false, drawcord: false, ribHem: true, ribCuff: true },
  sweatpants: { drawcord: true },
};

// ── SVG canvas ────────────────────────────────────────────────────

const W = 600;
const H = 700;
const CX = W / 2;

// Professional stroke standards
const OUTLINE = { color: "#000000", width: 1.8 };
const DETAIL = { color: "#000000", width: 1.0 };
const STITCH = { color: "#000000", width: 0.6 };
const CONSTRUCTION = { color: "#666666", width: 0.4 };

const STITCH_DASH = "2 2";
const DETAIL_DASH = "4 3";

// ── Helpers ───────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function r(n: number): string {
  return n.toFixed(2);
}

function mx(x: number): number {
  return W - x;
}

async function loadTemplate(category: GarmentCategory): Promise<string | null> {
  try {
    const p = path.join(
      process.cwd(),
      "public",
      "templates",
      "flats",
      `${category}.svg`,
    );
    return await readFile(p, "utf-8");
  } catch {
    return null;
  }
}

// ── Professional Hoodie Generator ─────────────────────────────────

function generateHoodieSvg(p: GarmentParams, f: GarmentFeatures): string {
  const bodyW = lerp(180, 300, p.bodyWidth);
  const bodyH = lerp(220, 360, p.bodyLength);
  const shoulderW = lerp(bodyW * 0.8, bodyW * 1.05, p.shoulderWidth);
  const sleeveLen = lerp(120, 240, p.sleeveLength);
  const sleeveBicep = lerp(60, 130, p.sleeveWidth);
  const sleeveWrist = sleeveBicep * 0.65;
  const hoodW = lerp(shoulderW * 0.55, shoulderW * 0.85, p.hoodWidth ?? 0.35);
  const hoodH = lerp(70, 140, p.hoodHeight ?? 0.25);

  const neckY = 160;
  const shoulderY = neckY + 6;
  const bodyBot = neckY + bodyH;
  const ribH = f.ribHem ? 16 : 0;
  const cuffH = f.ribCuff ? 14 : 0;

  const bL = CX - bodyW / 2;
  const bR = CX + bodyW / 2;
  const sL = CX - shoulderW / 2;
  const sR = CX + shoulderW / 2;

  const armholeDepth = bodyH * 0.26;
  const armholeBotY = neckY + armholeDepth;

  const neckW = shoulderW * 0.28;
  const neckL = CX - neckW;
  const neckR = CX + neckW;
  const neckDrop = 12;

  const sleeveAngle = lerp(28, 38, p.sleeveLength) * (Math.PI / 180);
  const sleeveDx = sleeveLen * Math.cos(sleeveAngle);
  const sleeveDy = sleeveLen * Math.sin(sleeveAngle);

  const waistNipIn = bodyW * 0.02;
  const waistY = neckY + bodyH * 0.55;

  const slvTopL_x = sL - 2;
  const slvTopL_y = shoulderY + 2;
  const slvBotL_x = bL - 2;
  const slvBotL_y = armholeBotY + 4;
  const slvTopEnd_x = slvTopL_x - sleeveDx;
  const slvTopEnd_y = slvTopL_y + sleeveDy;
  const slvBotEnd_x =
    slvBotL_x - sleeveDx + sleeveWrist * Math.sin(sleeveAngle) * 0.3;
  const slvBotEnd_y =
    slvBotL_y + sleeveDy - sleeveWrist * Math.cos(sleeveAngle) * 0.1;

  const body = [
    `M ${r(neckL)} ${r(neckY)}`,
    `C ${r(neckL - 5)} ${r(neckY + neckDrop * 0.8)} ${r(CX - neckW * 0.4)} ${r(neckY + neckDrop)} ${r(CX)} ${r(neckY + neckDrop)}`,
    `C ${r(CX + neckW * 0.4)} ${r(neckY + neckDrop)} ${r(neckR + 5)} ${r(neckY + neckDrop * 0.8)} ${r(neckR)} ${r(neckY)}`,
    `L ${r(sR)} ${r(shoulderY)}`,
    `C ${r(bR + 6)} ${r(shoulderY + armholeDepth * 0.2)} ${r(bR + 4)} ${r(armholeBotY - armholeDepth * 0.3)} ${r(bR)} ${r(armholeBotY)}`,
    `C ${r(bR - waistNipIn)} ${r(waistY - bodyH * 0.1)} ${r(bR - waistNipIn)} ${r(waistY + bodyH * 0.1)} ${r(bR)} ${r(bodyBot - ribH)}`,
    `L ${r(bR)} ${r(bodyBot)}`,
    `L ${r(bL)} ${r(bodyBot)}`,
    `L ${r(bL)} ${r(bodyBot - ribH)}`,
    `C ${r(bL + waistNipIn)} ${r(waistY + bodyH * 0.1)} ${r(bL + waistNipIn)} ${r(waistY - bodyH * 0.1)} ${r(bL)} ${r(armholeBotY)}`,
    `C ${r(bL - 4)} ${r(armholeBotY - armholeDepth * 0.3)} ${r(bL - 6)} ${r(shoulderY + armholeDepth * 0.2)} ${r(sL)} ${r(shoulderY)}`,
    `L ${r(neckL)} ${r(neckY)}`,
    `Z`,
  ].join(" ");

  const leftSleeve = [
    `M ${r(slvTopL_x)} ${r(slvTopL_y)}`,
    `C ${r(slvTopL_x - sleeveDx * 0.3)} ${r(slvTopL_y + sleeveDy * 0.15)} ${r(slvTopEnd_x + sleeveDx * 0.15)} ${r(slvTopEnd_y - sleeveDy * 0.1)} ${r(slvTopEnd_x)} ${r(slvTopEnd_y)}`,
    `L ${r(slvBotEnd_x)} ${r(slvBotEnd_y)}`,
    `C ${r(slvBotEnd_x + sleeveDx * 0.15)} ${r(slvBotEnd_y - sleeveDy * 0.1)} ${r(slvBotL_x - sleeveDx * 0.3)} ${r(slvBotL_y + sleeveDy * 0.15)} ${r(slvBotL_x)} ${r(slvBotL_y)}`,
  ].join(" ");

  const rightSleeve = [
    `M ${r(mx(slvTopL_x))} ${r(slvTopL_y)}`,
    `C ${r(mx(slvTopL_x - sleeveDx * 0.3))} ${r(slvTopL_y + sleeveDy * 0.15)} ${r(mx(slvTopEnd_x + sleeveDx * 0.15))} ${r(slvTopEnd_y - sleeveDy * 0.1)} ${r(mx(slvTopEnd_x))} ${r(slvTopEnd_y)}`,
    `L ${r(mx(slvBotEnd_x))} ${r(slvBotEnd_y)}`,
    `C ${r(mx(slvBotEnd_x + sleeveDx * 0.15))} ${r(slvBotEnd_y - sleeveDy * 0.1)} ${r(mx(slvBotL_x - sleeveDx * 0.3))} ${r(slvBotL_y + sleeveDy * 0.15)} ${r(mx(slvBotL_x))} ${r(slvBotL_y)}`,
  ].join(" ");

  const hoodL = CX - hoodW / 2;
  const hoodR = CX + hoodW / 2;
  const hoodPeakY = neckY - hoodH;
  const hoodBase = neckY - 2;

  const hood = [
    `M ${r(neckL + 5)} ${r(hoodBase)}`,
    `C ${r(neckL)} ${r(hoodBase - hoodH * 0.3)} ${r(hoodL - 8)} ${r(hoodPeakY + hoodH * 0.3)} ${r(hoodL)} ${r(hoodPeakY + 5)}`,
    `C ${r(hoodL + hoodW * 0.15)} ${r(hoodPeakY - 12)} ${r(hoodR - hoodW * 0.15)} ${r(hoodPeakY - 12)} ${r(hoodR)} ${r(hoodPeakY + 5)}`,
    `C ${r(hoodR + 8)} ${r(hoodPeakY + hoodH * 0.3)} ${r(neckR)} ${r(hoodBase - hoodH * 0.3)} ${r(neckR - 5)} ${r(hoodBase)}`,
  ].join(" ");

  const hoodOpening = [
    `M ${r(neckL + 8)} ${r(hoodBase + 3)}`,
    `C ${r(CX - neckW * 0.5)} ${r(hoodBase - hoodH * 0.08)} ${r(CX - neckW * 0.2)} ${r(hoodBase - hoodH * 0.12)} ${r(CX)} ${r(hoodBase - hoodH * 0.14)}`,
    `C ${r(CX + neckW * 0.2)} ${r(hoodBase - hoodH * 0.12)} ${r(CX + neckW * 0.5)} ${r(hoodBase - hoodH * 0.08)} ${r(neckR - 8)} ${r(hoodBase + 3)}`,
  ].join(" ");

  const details: string[] = [];

  details.push(
    `<line x1="${r(neckL)}" y1="${r(neckY)}" x2="${r(sL)}" y2="${r(shoulderY)}" stroke="${STITCH.color}" stroke-width="${STITCH.width}" stroke-dasharray="${STITCH_DASH}" />`,
    `<line x1="${r(neckR)}" y1="${r(neckY)}" x2="${r(sR)}" y2="${r(shoulderY)}" stroke="${STITCH.color}" stroke-width="${STITCH.width}" stroke-dasharray="${STITCH_DASH}" />`,
  );

  if (f.kangarooPocket) {
    const pocketY = lerp(
      bodyBot - bodyH * 0.42,
      bodyBot - bodyH * 0.22,
      p.pocketTopY ?? 0.6,
    );
    const pocketW = bodyW * 0.56;
    const pocketH = bodyH * 0.14;
    const pL = CX - pocketW / 2;
    const pR = CX + pocketW / 2;
    const pRad = 12;

    const pocket = [
      `M ${r(pL)} ${r(pocketY + pocketH * 0.4)}`,
      `L ${r(pL)} ${r(pocketY + pocketH - pRad)}`,
      `Q ${r(pL)} ${r(pocketY + pocketH)} ${r(pL + pRad)} ${r(pocketY + pocketH)}`,
      `C ${r(CX - pocketW * 0.2)} ${r(pocketY + pocketH + 4)} ${r(CX + pocketW * 0.2)} ${r(pocketY + pocketH + 4)} ${r(pR - pRad)} ${r(pocketY + pocketH)}`,
      `Q ${r(pR)} ${r(pocketY + pocketH)} ${r(pR)} ${r(pocketY + pocketH - pRad)}`,
      `L ${r(pR)} ${r(pocketY + pocketH * 0.4)}`,
    ].join(" ");

    const pocketTop = [
      `M ${r(pL)} ${r(pocketY + pocketH * 0.4)}`,
      `C ${r(pL)} ${r(pocketY)} ${r(pL + pRad * 2)} ${r(pocketY)} ${r(CX - 4)} ${r(pocketY + 2)}`,
      `M ${r(CX + 4)} ${r(pocketY + 2)}`,
      `C ${r(pR - pRad * 2)} ${r(pocketY)} ${r(pR)} ${r(pocketY)} ${r(pR)} ${r(pocketY + pocketH * 0.4)}`,
    ].join(" ");

    details.push(
      `<path d="${pocket}" fill="none" stroke="${DETAIL.color}" stroke-width="${DETAIL.width}" />`,
      `<path d="${pocketTop}" fill="none" stroke="${DETAIL.color}" stroke-width="${DETAIL.width}" />`,
    );

    const pocketStitch = [
      `M ${r(pL + 3)} ${r(pocketY + pocketH * 0.45)}`,
      `L ${r(pL + 3)} ${r(pocketY + pocketH - pRad - 2)}`,
      `Q ${r(pL + 3)} ${r(pocketY + pocketH - 3)} ${r(pL + pRad + 3)} ${r(pocketY + pocketH - 3)}`,
      `L ${r(pR - pRad - 3)} ${r(pocketY + pocketH - 3)}`,
      `Q ${r(pR - 3)} ${r(pocketY + pocketH - 3)} ${r(pR - 3)} ${r(pocketY + pocketH - pRad - 2)}`,
      `L ${r(pR - 3)} ${r(pocketY + pocketH * 0.45)}`,
    ].join(" ");
    details.push(
      `<path d="${pocketStitch}" fill="none" stroke="${STITCH.color}" stroke-width="${STITCH.width}" stroke-dasharray="${STITCH_DASH}" />`,
    );
  }

  if (f.zip) {
    details.push(
      `<line x1="${r(CX)}" y1="${r(neckY + neckDrop)}" x2="${r(CX)}" y2="${r(bodyBot - ribH)}" stroke="${DETAIL.color}" stroke-width="${DETAIL.width}" />`,
    );
    for (let y = neckY + neckDrop + 15; y < bodyBot - ribH - 10; y += 8) {
      details.push(
        `<line x1="${r(CX - 1.5)}" y1="${r(y)}" x2="${r(CX + 1.5)}" y2="${r(y)}" stroke="${DETAIL.color}" stroke-width="0.6" />`,
      );
    }
    details.push(
      `<rect x="${r(CX - 3)}" y="${r(neckY + neckDrop + 4)}" width="6" height="10" rx="1.5" fill="none" stroke="${DETAIL.color}" stroke-width="0.8" />`,
    );
  }

  if (f.drawcord) {
    const dcY = neckY + neckDrop - 2;
    const cordLen = 28;
    details.push(
      `<path d="M ${r(CX - 5)} ${r(dcY)} C ${r(CX - 7)} ${r(dcY + cordLen * 0.3)} ${r(CX - 9)} ${r(dcY + cordLen * 0.6)} ${r(CX - 7)} ${r(dcY + cordLen)}" fill="none" stroke="${DETAIL.color}" stroke-width="0.8" />`,
      `<path d="M ${r(CX + 5)} ${r(dcY)} C ${r(CX + 7)} ${r(dcY + cordLen * 0.3)} ${r(CX + 9)} ${r(dcY + cordLen * 0.6)} ${r(CX + 7)} ${r(dcY + cordLen)}" fill="none" stroke="${DETAIL.color}" stroke-width="0.8" />`,
      `<line x1="${r(CX - 7)}" y1="${r(dcY + cordLen)}" x2="${r(CX - 6.5)}" y2="${r(dcY + cordLen + 5)}" stroke="${DETAIL.color}" stroke-width="1.4" stroke-linecap="round" />`,
      `<line x1="${r(CX + 7)}" y1="${r(dcY + cordLen)}" x2="${r(CX + 6.5)}" y2="${r(dcY + cordLen + 5)}" stroke="${DETAIL.color}" stroke-width="1.4" stroke-linecap="round" />`,
      `<circle cx="${r(CX - 5)}" cy="${r(dcY)}" r="1.5" fill="none" stroke="${DETAIL.color}" stroke-width="0.6" />`,
      `<circle cx="${r(CX + 5)}" cy="${r(dcY)}" r="1.5" fill="none" stroke="${DETAIL.color}" stroke-width="0.6" />`,
    );
  }

  if (f.ribHem) {
    details.push(
      `<rect x="${r(bL)}" y="${r(bodyBot - ribH)}" width="${r(bodyW)}" height="${r(ribH)}" fill="none" stroke="${DETAIL.color}" stroke-width="${DETAIL.width}" />`,
    );
    for (let i = 1; i <= 3; i++) {
      const lineY = bodyBot - ribH + (ribH * i) / 4;
      details.push(
        `<line x1="${r(bL + 2)}" y1="${r(lineY)}" x2="${r(bR - 2)}" y2="${r(lineY)}" stroke="${CONSTRUCTION.color}" stroke-width="${CONSTRUCTION.width}" />`,
      );
    }
  }

  if (f.ribCuff) {
    const cuffAngle = Math.atan2(
      slvBotEnd_y - slvTopEnd_y,
      slvBotEnd_x - slvTopEnd_x,
    );
    const cuffDx = cuffH * Math.cos(cuffAngle + Math.PI / 2);
    const cuffDy = cuffH * Math.sin(cuffAngle + Math.PI / 2);
    details.push(
      `<path d="M ${r(slvTopEnd_x)} ${r(slvTopEnd_y)} L ${r(slvTopEnd_x - cuffDx)} ${r(slvTopEnd_y - cuffDy)} L ${r(slvBotEnd_x - cuffDx)} ${r(slvBotEnd_y - cuffDy)} L ${r(slvBotEnd_x)} ${r(slvBotEnd_y)}" fill="none" stroke="${DETAIL.color}" stroke-width="${DETAIL.width}" />`,
      `<path d="M ${r(mx(slvTopEnd_x))} ${r(slvTopEnd_y)} L ${r(mx(slvTopEnd_x - cuffDx))} ${r(slvTopEnd_y - cuffDy)} L ${r(mx(slvBotEnd_x - cuffDx))} ${r(slvBotEnd_y - cuffDy)} L ${r(mx(slvBotEnd_x))} ${r(slvBotEnd_y)}" fill="none" stroke="${DETAIL.color}" stroke-width="${DETAIL.width}" />`,
    );
  }

  details.push(
    `<line x1="${r(bL)}" y1="${r(armholeBotY + 5)}" x2="${r(bL)}" y2="${r(bodyBot - ribH)}" stroke="${STITCH.color}" stroke-width="${STITCH.width}" stroke-dasharray="${STITCH_DASH}" />`,
    `<line x1="${r(bR)}" y1="${r(armholeBotY + 5)}" x2="${r(bR)}" y2="${r(bodyBot - ribH)}" stroke="${STITCH.color}" stroke-width="${STITCH.width}" stroke-dasharray="${STITCH_DASH}" />`,
  );

  if (!f.zip) {
    details.push(
      `<line x1="${r(CX)}" y1="${r(neckY + neckDrop + 25)}" x2="${r(CX)}" y2="${r(bodyBot - ribH - 5)}" stroke="${CONSTRUCTION.color}" stroke-width="${CONSTRUCTION.width}" stroke-dasharray="8 6" />`,
    );
  }

  return buildSvg([
    `<g id="Hood">`,
    `  <path d="${hood}" fill="none" stroke="${OUTLINE.color}" stroke-width="${OUTLINE.width}" />`,
    `  <path d="${hoodOpening}" fill="none" stroke="${DETAIL.color}" stroke-width="${DETAIL.width}" stroke-dasharray="${DETAIL_DASH}" />`,
    `</g>`,
    `<g id="Body">`,
    `  <path d="${body}" fill="none" stroke="${OUTLINE.color}" stroke-width="${OUTLINE.width}" />`,
    `</g>`,
    `<g id="Sleeves">`,
    `  <path d="${leftSleeve}" fill="none" stroke="${OUTLINE.color}" stroke-width="${OUTLINE.width}" />`,
    `  <path d="${rightSleeve}" fill="none" stroke="${OUTLINE.color}" stroke-width="${OUTLINE.width}" />`,
    `</g>`,
    `<g id="Details">`,
    ...details.map((d) => `  ${d}`),
    `</g>`,
    `<g id="Callouts"></g>`,
  ]);
}

// ── Professional Sweatshirt Generator ─────────────────────────────

function generateSweatshirtSvg(p: GarmentParams, f: GarmentFeatures): string {
  const bodyW = lerp(180, 300, p.bodyWidth);
  const bodyH = lerp(220, 360, p.bodyLength);
  const shoulderW = lerp(bodyW * 0.8, bodyW * 1.05, p.shoulderWidth);
  const sleeveLen = lerp(120, 240, p.sleeveLength);
  const sleeveBicep = lerp(60, 130, p.sleeveWidth);
  const sleeveWrist = sleeveBicep * 0.65;

  const neckY = 110;
  const shoulderY = neckY + 6;
  const bodyBot = neckY + bodyH;
  const ribH = f.ribHem ? 16 : 0;

  const bL = CX - bodyW / 2;
  const bR = CX + bodyW / 2;
  const sL = CX - shoulderW / 2;
  const sR = CX + shoulderW / 2;

  const armholeDepth = bodyH * 0.26;
  const armholeBotY = neckY + armholeDepth;

  const neckW = shoulderW * 0.26;
  const neckL = CX - neckW;
  const neckR = CX + neckW;
  const neckDrop = 16;
  const neckRibW = 5;

  const waistNipIn = bodyW * 0.02;
  const waistY = neckY + bodyH * 0.55;

  const sleeveAngle = lerp(28, 38, p.sleeveLength) * (Math.PI / 180);
  const sleeveDx = sleeveLen * Math.cos(sleeveAngle);
  const sleeveDy = sleeveLen * Math.sin(sleeveAngle);

  const slvTopL_x = sL - 2;
  const slvTopL_y = shoulderY + 2;
  const slvBotL_x = bL - 2;
  const slvBotL_y = armholeBotY + 4;
  const slvTopEnd_x = slvTopL_x - sleeveDx;
  const slvTopEnd_y = slvTopL_y + sleeveDy;
  const slvBotEnd_x =
    slvBotL_x - sleeveDx + sleeveWrist * Math.sin(sleeveAngle) * 0.3;
  const slvBotEnd_y =
    slvBotL_y + sleeveDy - sleeveWrist * Math.cos(sleeveAngle) * 0.1;

  const neckOuter = [
    `M ${r(neckL)} ${r(neckY)}`,
    `C ${r(neckL - 3)} ${r(neckY + neckDrop * 0.7)} ${r(CX - neckW * 0.4)} ${r(neckY + neckDrop)} ${r(CX)} ${r(neckY + neckDrop)}`,
    `C ${r(CX + neckW * 0.4)} ${r(neckY + neckDrop)} ${r(neckR + 3)} ${r(neckY + neckDrop * 0.7)} ${r(neckR)} ${r(neckY)}`,
  ].join(" ");

  const neckInner = [
    `M ${r(neckL + neckRibW)} ${r(neckY + 2)}`,
    `C ${r(neckL + neckRibW - 2)} ${r(neckY + neckDrop * 0.6)} ${r(CX - neckW * 0.35)} ${r(neckY + neckDrop - neckRibW)} ${r(CX)} ${r(neckY + neckDrop - neckRibW)}`,
    `C ${r(CX + neckW * 0.35)} ${r(neckY + neckDrop - neckRibW)} ${r(neckR - neckRibW + 2)} ${r(neckY + neckDrop * 0.6)} ${r(neckR - neckRibW)} ${r(neckY + 2)}`,
  ].join(" ");

  const body = [
    `M ${r(neckL)} ${r(neckY)}`,
    `L ${r(sL)} ${r(shoulderY)}`,
    `C ${r(bL - 6)} ${r(shoulderY + armholeDepth * 0.2)} ${r(bL - 4)} ${r(armholeBotY - armholeDepth * 0.3)} ${r(bL)} ${r(armholeBotY)}`,
    `C ${r(bL + waistNipIn)} ${r(waistY - bodyH * 0.1)} ${r(bL + waistNipIn)} ${r(waistY + bodyH * 0.1)} ${r(bL)} ${r(bodyBot - ribH)}`,
    `L ${r(bL)} ${r(bodyBot)} L ${r(bR)} ${r(bodyBot)} L ${r(bR)} ${r(bodyBot - ribH)}`,
    `C ${r(bR - waistNipIn)} ${r(waistY + bodyH * 0.1)} ${r(bR - waistNipIn)} ${r(waistY - bodyH * 0.1)} ${r(bR)} ${r(armholeBotY)}`,
    `C ${r(bR + 4)} ${r(armholeBotY - armholeDepth * 0.3)} ${r(bR + 6)} ${r(shoulderY + armholeDepth * 0.2)} ${r(sR)} ${r(shoulderY)}`,
    `L ${r(neckR)} ${r(neckY)}`,
  ].join(" ");

  const leftSleeve = [
    `M ${r(slvTopL_x)} ${r(slvTopL_y)}`,
    `C ${r(slvTopL_x - sleeveDx * 0.3)} ${r(slvTopL_y + sleeveDy * 0.15)} ${r(slvTopEnd_x + sleeveDx * 0.15)} ${r(slvTopEnd_y - sleeveDy * 0.1)} ${r(slvTopEnd_x)} ${r(slvTopEnd_y)}`,
    `L ${r(slvBotEnd_x)} ${r(slvBotEnd_y)}`,
    `C ${r(slvBotEnd_x + sleeveDx * 0.15)} ${r(slvBotEnd_y - sleeveDy * 0.1)} ${r(slvBotL_x - sleeveDx * 0.3)} ${r(slvBotL_y + sleeveDy * 0.15)} ${r(slvBotL_x)} ${r(slvBotL_y)}`,
  ].join(" ");

  const rightSleeve = [
    `M ${r(mx(slvTopL_x))} ${r(slvTopL_y)}`,
    `C ${r(mx(slvTopL_x - sleeveDx * 0.3))} ${r(slvTopL_y + sleeveDy * 0.15)} ${r(mx(slvTopEnd_x + sleeveDx * 0.15))} ${r(slvTopEnd_y - sleeveDy * 0.1)} ${r(mx(slvTopEnd_x))} ${r(slvTopEnd_y)}`,
    `L ${r(mx(slvBotEnd_x))} ${r(slvBotEnd_y)}`,
    `C ${r(mx(slvBotEnd_x + sleeveDx * 0.15))} ${r(slvBotEnd_y - sleeveDy * 0.1)} ${r(mx(slvBotL_x - sleeveDx * 0.3))} ${r(slvBotL_y + sleeveDy * 0.15)} ${r(mx(slvBotL_x))} ${r(slvBotL_y)}`,
  ].join(" ");

  const details: string[] = [];

  details.push(
    `<line x1="${r(neckL)}" y1="${r(neckY)}" x2="${r(sL)}" y2="${r(shoulderY)}" stroke="${STITCH.color}" stroke-width="${STITCH.width}" stroke-dasharray="${STITCH_DASH}" />`,
    `<line x1="${r(neckR)}" y1="${r(neckY)}" x2="${r(sR)}" y2="${r(shoulderY)}" stroke="${STITCH.color}" stroke-width="${STITCH.width}" stroke-dasharray="${STITCH_DASH}" />`,
  );

  if (f.ribHem) {
    details.push(
      `<rect x="${r(bL)}" y="${r(bodyBot - ribH)}" width="${r(bodyW)}" height="${r(ribH)}" fill="none" stroke="${DETAIL.color}" stroke-width="${DETAIL.width}" />`,
    );
    for (let i = 1; i <= 3; i++) {
      details.push(
        `<line x1="${r(bL + 2)}" y1="${r(bodyBot - ribH + (ribH * i) / 4)}" x2="${r(bR - 2)}" y2="${r(bodyBot - ribH + (ribH * i) / 4)}" stroke="${CONSTRUCTION.color}" stroke-width="${CONSTRUCTION.width}" />`,
      );
    }
  }

  if (f.ribCuff) {
    const cuffAngle = Math.atan2(
      slvBotEnd_y - slvTopEnd_y,
      slvBotEnd_x - slvTopEnd_x,
    );
    const cuffH = 14;
    const cuffDx = cuffH * Math.cos(cuffAngle + Math.PI / 2);
    const cuffDy = cuffH * Math.sin(cuffAngle + Math.PI / 2);
    details.push(
      `<path d="M ${r(slvTopEnd_x)} ${r(slvTopEnd_y)} L ${r(slvTopEnd_x - cuffDx)} ${r(slvTopEnd_y - cuffDy)} L ${r(slvBotEnd_x - cuffDx)} ${r(slvBotEnd_y - cuffDy)} L ${r(slvBotEnd_x)} ${r(slvBotEnd_y)}" fill="none" stroke="${DETAIL.color}" stroke-width="${DETAIL.width}" />`,
      `<path d="M ${r(mx(slvTopEnd_x))} ${r(slvTopEnd_y)} L ${r(mx(slvTopEnd_x - cuffDx))} ${r(slvTopEnd_y - cuffDy)} L ${r(mx(slvBotEnd_x - cuffDx))} ${r(slvBotEnd_y - cuffDy)} L ${r(mx(slvBotEnd_x))} ${r(slvBotEnd_y)}" fill="none" stroke="${DETAIL.color}" stroke-width="${DETAIL.width}" />`,
    );
  }

  details.push(
    `<line x1="${r(bL)}" y1="${r(armholeBotY + 5)}" x2="${r(bL)}" y2="${r(bodyBot - ribH)}" stroke="${STITCH.color}" stroke-width="${STITCH.width}" stroke-dasharray="${STITCH_DASH}" />`,
    `<line x1="${r(bR)}" y1="${r(armholeBotY + 5)}" x2="${r(bR)}" y2="${r(bodyBot - ribH)}" stroke="${STITCH.color}" stroke-width="${STITCH.width}" stroke-dasharray="${STITCH_DASH}" />`,
  );

  return buildSvg([
    `<g id="Body">`,
    `  <path d="${body}" fill="none" stroke="${OUTLINE.color}" stroke-width="${OUTLINE.width}" />`,
    `  <path d="${neckOuter}" fill="none" stroke="${OUTLINE.color}" stroke-width="${OUTLINE.width}" />`,
    `  <path d="${neckInner}" fill="none" stroke="${DETAIL.color}" stroke-width="${DETAIL.width}" stroke-dasharray="${DETAIL_DASH}" />`,
    `</g>`,
    `<g id="Sleeves">`,
    `  <path d="${leftSleeve}" fill="none" stroke="${OUTLINE.color}" stroke-width="${OUTLINE.width}" />`,
    `  <path d="${rightSleeve}" fill="none" stroke="${OUTLINE.color}" stroke-width="${OUTLINE.width}" />`,
    `</g>`,
    `<g id="Details">`,
    ...details.map((d) => `  ${d}`),
    `</g>`,
    `<g id="Callouts"></g>`,
  ]);
}

// ── Professional Sweatpants Generator ─────────────────────────────

function generateSweatpantsSvg(p: GarmentParams, f: GarmentFeatures): string {
  const waistW = lerp(130, 220, p.bodyWidth);
  const totalH = lerp(360, 520, p.bodyLength);
  const legW = lerp(60, 140, p.legWidth ?? 0.25);
  const riseRatio = lerp(0.22, 0.38, p.rise ?? 0.3);

  const top = 50;
  const bot = top + totalH;
  const wL = CX - waistW / 2;
  const wR = CX + waistW / 2;
  const waistbandH = 20;
  const crotchY = top + totalH * riseRatio;

  const hipW = waistW * 1.12;
  const hipY = top + totalH * 0.15;
  const hL = CX - hipW / 2;
  const hR = CX + hipW / 2;

  const kneeY = crotchY + (bot - crotchY) * 0.48;
  const kneeW = legW * 0.92;
  const gap = 4;

  const llKneeOuter_x = CX - gap - kneeW;
  const llOuterBot_x = CX - gap - legW;
  const rlOuterBot_x = CX + gap + legW;

  const leftLeg = [
    `M ${r(wL)} ${r(top + waistbandH)}`,
    `C ${r(hL - 5)} ${r(hipY)} ${r(hL - 3)} ${r(crotchY * 0.7)} ${r(hL)} ${r(crotchY)}`,
    `C ${r(hL + 5)} ${r(kneeY - (kneeY - crotchY) * 0.3)} ${r(llKneeOuter_x - 3)} ${r(kneeY)} ${r(llKneeOuter_x)} ${r(kneeY)}`,
    `L ${r(llOuterBot_x)} ${r(bot)}`,
    `L ${r(CX - gap)} ${r(bot)}`,
    `L ${r(CX - gap)} ${r(kneeY)}`,
    `C ${r(CX - gap + 2)} ${r(kneeY - (kneeY - crotchY) * 0.2)} ${r(CX - gap + 5)} ${r(crotchY + 10)} ${r(CX - gap)} ${r(crotchY)}`,
  ].join(" ");

  const rightLeg = [
    `M ${r(wR)} ${r(top + waistbandH)}`,
    `C ${r(hR + 5)} ${r(hipY)} ${r(hR + 3)} ${r(crotchY * 0.7)} ${r(hR)} ${r(crotchY)}`,
    `C ${r(hR - 5)} ${r(kneeY - (kneeY - crotchY) * 0.3)} ${r(CX + gap + kneeW + 3)} ${r(kneeY)} ${r(CX + gap + kneeW)} ${r(kneeY)}`,
    `L ${r(rlOuterBot_x)} ${r(bot)}`,
    `L ${r(CX + gap)} ${r(bot)}`,
    `L ${r(CX + gap)} ${r(kneeY)}`,
    `C ${r(CX + gap - 2)} ${r(kneeY - (kneeY - crotchY) * 0.2)} ${r(CX + gap - 5)} ${r(crotchY + 10)} ${r(CX + gap)} ${r(crotchY)}`,
  ].join(" ");

  const crotchCurve = `M ${r(CX - gap)} ${r(crotchY)} Q ${r(CX)} ${r(crotchY + 18)} ${r(CX + gap)} ${r(crotchY)}`;
  const waistband = `M ${r(wL)} ${r(top)} L ${r(wR)} ${r(top)} L ${r(wR)} ${r(top + waistbandH)} L ${r(wL)} ${r(top + waistbandH)} Z`;

  const details: string[] = [];

  details.push(
    `<line x1="${r(wL + 2)}" y1="${r(top + waistbandH * 0.4)}" x2="${r(wR - 2)}" y2="${r(top + waistbandH * 0.4)}" stroke="${CONSTRUCTION.color}" stroke-width="${CONSTRUCTION.width}" />`,
    `<line x1="${r(wL + 2)}" y1="${r(top + waistbandH * 0.7)}" x2="${r(wR - 2)}" y2="${r(top + waistbandH * 0.7)}" stroke="${CONSTRUCTION.color}" stroke-width="${CONSTRUCTION.width}" />`,
  );

  if (f.drawcord) {
    const dcY = top + waistbandH * 0.5;
    details.push(
      `<path d="M ${r(CX - 4)} ${r(dcY)} C ${r(CX - 6)} ${r(dcY + 8)} ${r(CX - 8)} ${r(dcY + 16)} ${r(CX - 6)} ${r(dcY + 22)}" fill="none" stroke="${DETAIL.color}" stroke-width="0.8" />`,
      `<path d="M ${r(CX + 4)} ${r(dcY)} C ${r(CX + 6)} ${r(dcY + 8)} ${r(CX + 8)} ${r(dcY + 16)} ${r(CX + 6)} ${r(dcY + 22)}" fill="none" stroke="${DETAIL.color}" stroke-width="0.8" />`,
      `<line x1="${r(CX - 6)}" y1="${r(dcY + 22)}" x2="${r(CX - 5.5)}" y2="${r(dcY + 27)}" stroke="${DETAIL.color}" stroke-width="1.4" stroke-linecap="round" />`,
      `<line x1="${r(CX + 6)}" y1="${r(dcY + 22)}" x2="${r(CX + 5.5)}" y2="${r(dcY + 27)}" stroke="${DETAIL.color}" stroke-width="1.4" stroke-linecap="round" />`,
    );
  }

  details.push(
    `<line x1="${r(llOuterBot_x)}" y1="${r(kneeY + 10)}" x2="${r(llOuterBot_x)}" y2="${r(bot)}" stroke="${STITCH.color}" stroke-width="${STITCH.width}" stroke-dasharray="${STITCH_DASH}" />`,
    `<line x1="${r(rlOuterBot_x)}" y1="${r(kneeY + 10)}" x2="${r(rlOuterBot_x)}" y2="${r(bot)}" stroke="${STITCH.color}" stroke-width="${STITCH.width}" stroke-dasharray="${STITCH_DASH}" />`,
    `<line x1="${r(CX)}" y1="${r(top + waistbandH + 5)}" x2="${r(CX)}" y2="${r(crotchY - 5)}" stroke="${CONSTRUCTION.color}" stroke-width="${CONSTRUCTION.width}" stroke-dasharray="8 6" />`,
  );

  return buildSvg([
    `<g id="Waistband">`,
    `  <path d="${waistband}" fill="none" stroke="${OUTLINE.color}" stroke-width="${OUTLINE.width}" />`,
    `</g>`,
    `<g id="Legs">`,
    `  <path d="${leftLeg}" fill="none" stroke="${OUTLINE.color}" stroke-width="${OUTLINE.width}" />`,
    `  <path d="${rightLeg}" fill="none" stroke="${OUTLINE.color}" stroke-width="${OUTLINE.width}" />`,
    `  <path d="${crotchCurve}" fill="none" stroke="${DETAIL.color}" stroke-width="${DETAIL.width}" />`,
    `</g>`,
    `<g id="Details">`,
    ...details.map((d) => `  ${d}`),
    `</g>`,
    `<g id="Callouts"></g>`,
  ]);
}

// ── Build SVG wrapper ─────────────────────────────────────────────

function buildSvg(inner: string[]): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`,
    ...inner,
    `</svg>`,
  ].join("\n");
}

// ── Template-based transform ──────────────────────────────────────

function applyParamsToTemplate(
  templateSvg: string,
  category: GarmentCategory,
  params: GarmentParams,
  _features: GarmentFeatures,
): string {
  const defaults = DEFAULTS[category];
  const groupScales: Record<string, { sx: number; sy: number }> = {};

  if (category === "hoodie" || category === "sweatshirt") {
    groupScales["Body"] = {
      sx: (params.bodyWidth || defaults.bodyWidth) / defaults.bodyWidth,
      sy: (params.bodyLength || defaults.bodyLength) / defaults.bodyLength,
    };
    groupScales["Sleeves"] = {
      sx:
        (params.sleeveLength || defaults.sleeveLength) / defaults.sleeveLength,
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
    svg = svg.replace(
      regex,
      `$1 transform="scale(${sx.toFixed(3)} ${sy.toFixed(3)})"`,
    );
  }

  return svg;
}

// ── Public API ────────────────────────────────────────────────────

export async function generateFlatSvg(
  category: GarmentCategory,
  params?: GarmentParams,
  features?: GarmentFeatures,
): Promise<string> {
  const p = { ...DEFAULTS[category], ...params };
  const f = { ...DEFAULT_FEATURES[category], ...features };

  const template = await loadTemplate(category);
  if (template) {
    return applyParamsToTemplate(template, category, p, f);
  }

  switch (category) {
    case "hoodie":
      return generateHoodieSvg(p, f);
    case "sweatshirt":
      return generateSweatshirtSvg(p, f);
    case "sweatpants":
      return generateSweatpantsSvg(p, f);
  }
}
