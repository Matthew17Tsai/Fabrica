import {
  getFilePath,
  FILES,
  writeFile as storageWriteFile,
} from "@/lib/storage";
import { preprocessImage } from "@/lib/processing/preprocess";
import { generateLineArt } from "@/lib/processing/lineart";
import { vectorizeToSVG } from "@/lib/processing/vectorize";
import { normalizeSVG } from "@/lib/processing/normalize";
import { extractGarmentParamsFromImage } from "@/lib/ai/openaiVision";
import { generateFlatSvg } from "@/lib/parametric/generateFlatSvg";
import { VisionParsingError } from "@/lib/ai/types";
import type { GarmentCategory, GarmentParamsResult } from "@/lib/ai/types";
import fs from "fs";
import {
  getProject,
  updateJob,
  updateProjectStatus,
  createAsset,
  type Job,
} from "@/lib/db";
import { nanoid } from "nanoid";

// ── Input type detection ──────────────────────────────────────────

function detectProcessingPath(
  originalPath: string,
  mimeType?: string,
): "photo" | "sketch" {
  if (mimeType === "image/svg+xml") return "sketch";
  if (mimeType === "image/jpeg" || mimeType === "image/heic") return "photo";
  try {
    const stats = fs.statSync(originalPath);
    if (stats.size > 100_000) return "photo";
  } catch {}
  return "sketch";
}

// ── Photo pipeline (Path B) ───────────────────────────────────────

const LOW_CONFIDENCE_THRESHOLD = 0.6;

async function runPhotoPipeline(
  projectId: string,
  category: GarmentCategory,
  onProgress: (p: number) => void,
): Promise<{ confidence: number; visionResult: GarmentParamsResult | null }> {
  const originalPath = getFilePath(projectId, FILES.ORIGINAL);
  const imageBuffer = fs.readFileSync(originalPath);

  onProgress(10);
  let visionResult: GarmentParamsResult | null = null;
  let confidence = 0;

  try {
    visionResult = await extractGarmentParamsFromImage({
      imageBuffer,
      mimeType: "image/png",
      categoryHint: category,
    });
    confidence = visionResult.confidence;
  } catch (err) {
    if (err instanceof VisionParsingError) {
      console.warn(
        `[photo-pipeline] Vision parsing failed for ${projectId}:`,
        err.message,
      );
    } else {
      console.warn(
        `[photo-pipeline] Vision call failed for ${projectId}:`,
        err,
      );
    }
  }

  onProgress(50);

  const resolvedCategory = visionResult?.category ?? category;
  const svgText = await generateFlatSvg(
    resolvedCategory,
    visionResult?.params,
    visionResult?.features,
  );

  const svgPath = getFilePath(projectId, FILES.SVG);
  fs.writeFileSync(svgPath, svgText, "utf-8");

  onProgress(90);

  if (visionResult) {
    storageWriteFile(
      projectId,
      "vision_params.json",
      JSON.stringify(visionResult, null, 2),
    );
  }

  return { confidence, visionResult };
}

// ── Main job processor ────────────────────────────────────────────

export async function processJob(job: Job): Promise<void> {
  const { project_id } = job;

  try {
    if (job.step === "preprocess") {
      updateJob(job.id, { progress: 0 });

      const originalPath = getFilePath(project_id, FILES.ORIGINAL);
      const project = getProject(project_id);
      const category = (project?.category ?? "hoodie") as GarmentCategory;
      const mimeType = (project as any)?.mime_type as string | undefined;
      const processingPath = detectProcessingPath(originalPath, mimeType);

      // Store which path we chose (as JSON metadata file)
      storageWriteFile(
        project_id,
        "processing_meta.json",
        JSON.stringify({
          processing_path: processingPath,
          vision_confidence: 0,
          template_mode: false,
        }),
      );

      if (processingPath === "photo") {
        console.log(`[processor] Project ${project_id}: using PHOTO pipeline`);

        const { confidence } = await runPhotoPipeline(
          project_id,
          category,
          (p) => updateJob(job.id, { progress: p }),
        );

        createAsset({
          id: nanoid(),
          project_id,
          type: "svg",
          path: FILES.SVG,
        });

        storageWriteFile(
          project_id,
          "processing_meta.json",
          JSON.stringify({
            processing_path: "photo",
            vision_confidence: confidence,
            template_mode: confidence < LOW_CONFIDENCE_THRESHOLD,
          }),
        );

        updateJob(job.id, { progress: 100, status: "done" });
        updateProjectStatus(project_id, "ready");

        console.log(
          `✓ Project ${project_id} photo pipeline complete (confidence: ${confidence.toFixed(2)})`,
        );
        return;
      }

      console.log(`[processor] Project ${project_id}: using SKETCH pipeline`);

      storageWriteFile(
        project_id,
        "processing_meta.json",
        JSON.stringify({
          processing_path: "sketch",
          vision_confidence: 1,
          template_mode: false,
        }),
      );

      const preprocessedPath = getFilePath(project_id, FILES.PREPROCESSED);
      await preprocessImage(originalPath, preprocessedPath);

      createAsset({
        id: nanoid(),
        project_id,
        type: "preprocessed",
        path: FILES.PREPROCESSED,
      });

      updateJob(job.id, { progress: 25, status: "done" });
      return;
    }

    if (job.step === "lineart") {
      updateJob(job.id, { progress: 25 });
      const preprocessedPath = getFilePath(project_id, FILES.PREPROCESSED);
      const lineartPath = getFilePath(project_id, FILES.LINEART);
      await generateLineArt(preprocessedPath, lineartPath);
      createAsset({
        id: nanoid(),
        project_id,
        type: "lineart",
        path: FILES.LINEART,
      });
      updateJob(job.id, { progress: 50, status: "done" });
      return;
    }

    if (job.step === "vectorize") {
      updateJob(job.id, { progress: 50 });
      const lineartPath = getFilePath(project_id, FILES.LINEART);
      const svgRawPath = getFilePath(project_id, "raw.svg");
      await vectorizeToSVG(lineartPath, svgRawPath);
      updateJob(job.id, { progress: 75, status: "done" });
      return;
    }

    if (job.step === "normalize") {
      updateJob(job.id, { progress: 75 });
      const svgRawPath = getFilePath(project_id, "raw.svg");
      const svgPath = getFilePath(project_id, FILES.SVG);
      normalizeSVG(svgRawPath, svgPath);
      createAsset({ id: nanoid(), project_id, type: "svg", path: FILES.SVG });
      updateJob(job.id, { progress: 100, status: "done" });
      updateProjectStatus(project_id, "ready");
      console.log(`✓ Project ${project_id} sketch pipeline complete!`);
      return;
    }
  } catch (error) {
    console.error(`Job ${job.id} failed:`, error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    updateJob(job.id, { status: "error", error_message: errorMessage });
    updateProjectStatus(project_id, "error", errorMessage);
    throw error;
  }
}
