import type { GarmentCategory, GarmentParamsResult } from "@/lib/ai/types";

export async function fetchGarmentParams(
  imageBase64: string,
  mimeType: string,
  category?: GarmentCategory
): Promise<GarmentParamsResult> {
  const res = await fetch("/api/vision/garment-params", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64, mimeType, category }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Vision API failed (${res.status})`);
  }

  return res.json();
}
