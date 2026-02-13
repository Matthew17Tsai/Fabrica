import { NextRequest, NextResponse } from "next/server";
import { extractGarmentParamsFromImage } from "@/lib/ai/openaiVision";
import { type GarmentCategory, GARMENT_CATEGORIES, VisionParsingError } from "@/lib/ai/types";

export const runtime = "nodejs";

interface RequestBody {
  imageBase64: string;
  mimeType: string;
  category?: GarmentCategory;
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
    }

    const body = (await req.json()) as RequestBody;

    if (!body.imageBase64 || !body.mimeType) {
      return NextResponse.json(
        { error: "imageBase64 and mimeType are required" },
        { status: 400 }
      );
    }

    if (body.category && !GARMENT_CATEGORIES.includes(body.category)) {
      return NextResponse.json(
        { error: `Invalid category. Allowed: ${GARMENT_CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }

    const imageBuffer = Buffer.from(body.imageBase64, "base64");

    const result = await extractGarmentParamsFromImage({
      imageBuffer,
      mimeType: body.mimeType,
      categoryHint: body.category,
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof VisionParsingError) {
      return NextResponse.json(
        { error: "Failed to parse garment from image", detail: err.message },
        { status: 422 }
      );
    }
    console.error("[vision/garment-params] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
