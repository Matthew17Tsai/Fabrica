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
