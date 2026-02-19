// ── Garment Vision Types ──────────────────────────────────────────

export const GARMENT_CATEGORIES = ["hoodie", "sweatshirt", "sweatpants"] as const;
export type GarmentCategory = (typeof GARMENT_CATEGORIES)[number];

export interface GarmentParams {
  bodyWidth: number;
  bodyLength: number;
  shoulderWidth: number;
  sleeveLength: number;
  sleeveWidth: number;
  /** hoodie only */
  hoodWidth?: number;
  /** hoodie only */
  hoodHeight?: number;
  /** hoodie only */
  pocketTopY?: number;
  /** sweatpants only */
  legWidth?: number;
  /** sweatpants only */
  inseam?: number;
  /** sweatpants only */
  rise?: number;
}

export interface GarmentFeatures {
  zip?: boolean;
  kangarooPocket?: boolean;
  drawcord?: boolean;
  ribHem?: boolean;
  ribCuff?: boolean;
}

export interface GarmentParamsResult {
  category: GarmentCategory;
  view: "front";
  params: GarmentParams;
  features: GarmentFeatures;
  confidence: number;
}

export class VisionParsingError extends Error {
  constructor(
    message: string,
    public readonly rawOutput?: string
  ) {
    super(message);
    this.name = "VisionParsingError";
  }
}

export type ProcessingPath = "photo" | "sketch";

export interface ProcessingResult {
  path: ProcessingPath;
  svgText: string;
  confidence: number;
  params?: GarmentParamsResult;
}

// ── Expanded Analysis Types (Phase 2) ─────────────────────────────────────────

export type FitType = "oversized" | "regular" | "slim";

export type SubType =
  | "oversized_hoodie"
  | "pullover_hoodie"
  | "zip_hoodie"
  | "unisex_hoodie"
  | "crewneck"
  | "sweatpants";

export interface MaterialInfo {
  primary: string;            // e.g., "French Terry"
  weight_estimate: string;    // e.g., "280 GSM"
  composition_guess: string;  // e.g., "80% Cotton / 20% Polyester"
}

export interface ColorInfo {
  primary_hex: string;    // e.g., "#4B5D52"
  primary_name: string;   // e.g., "Forest Green"
  accent_hex?: string;
}

export interface ConstructionDetails {
  shoulder_type: "drop" | "set-in" | "raglan";
  sleeve_style: "regular" | "balloon" | "tapered";
  seam_type: "flatlock" | "overlock" | "coverstitch";
  hem_style: "rib" | "raw" | "folded" | "elastic";
  cuff_style: "rib" | "raw" | "elastic" | "open";
}

export interface BrandingInfo {
  position: string;     // e.g., "left chest"
  type: string;         // e.g., "embroidered logo"
  description: string;
}

export interface ExpandedAnalysis {
  // Shared with GarmentParamsResult
  category: GarmentCategory;
  params: GarmentParams;
  features: GarmentFeatures;
  confidence: number;

  // Extended fields
  sub_type: SubType;
  fit: FitType;
  material: MaterialInfo;
  color: ColorInfo;
  construction: ConstructionDetails;
  branding?: BrandingInfo;
}
