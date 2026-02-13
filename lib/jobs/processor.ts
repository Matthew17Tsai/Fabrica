import { getFilePath, FILES, writeFile as storageWriteFile } from '@/lib/storage';
import { preprocessImage } from '@/lib/processing/preprocess';
import { generateLineArt } from '@/lib/processing/lineart';
import { vectorizeToSVG } from '@/lib/processing/vectorize';
import { normalizeSVG } from '@/lib/processing/normalize';
import { extractGarmentParamsFromImage } from '@/lib/ai/openaiVision';
import { generateFlatSvg } from '@/lib/parametric/generateFlatSvg';
import { VisionParsingError } from '@/lib/ai/types';
import type { GarmentCategory, GarmentParamsResult } from '@/lib/ai/types';
import fs from 'fs';

// ── Input type detection ──────────────────────────────────────────

/**
 * Simple heuristic: if the image is a photo (JPEG, HEIC, or large PNG),
 * route to the vision pipeline. Line-art sketches are typically small PNGs or SVGs.
 * The caller can also store an explicit hint on the project row.
 */
function detectProcessingPath(originalPath: string, mimeType?: string): 'photo' | 'sketch' {
  if (mimeType === 'image/svg+xml') return 'sketch';
  if (mimeType === 'image/jpeg' || mimeType === 'image/heic') return 'photo';

  // Fallback: check file size. Photos are typically > 100 KB
  try {
    const stats = fs.statSync(originalPath);
    if (stats.size > 100_000) return 'photo';
  } catch {}

  return 'sketch';
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

  // Step 1: Vision extraction (0 → 50%)
  onProgress(10);
  let visionResult: GarmentParamsResult | null = null;
  let confidence = 0;

  try {
    visionResult = await extractGarmentParamsFromImage({
      imageBuffer,
      mimeType: 'image/png',
      categoryHint: category,
    });
    confidence = visionResult.confidence;
  } catch (err) {
    if (err instanceof VisionParsingError) {
      console.warn(`[photo-pipeline] Vision parsing failed for ${projectId}:`, err.message);
    } else {
      console.warn(`[photo-pipeline] Vision call failed for ${projectId}:`, err);
    }
    // Continue with template defaults
  }

  onProgress(50);

  // Step 2: Parametric SVG generation (50 → 90%)
  const resolvedCategory = visionResult?.category ?? category;
  const svgText = await generateFlatSvg(
    resolvedCategory,
    visionResult?.params,
    visionResult?.features,
  );

  const svgPath = getFilePath(projectId, FILES.SVG);
  fs.writeFileSync(svgPath, svgText, 'utf-8');

  onProgress(90);

  // Save vision result as metadata
  if (visionResult) {
    storageWriteFile(projectId, 'vision_params.json', JSON.stringify(visionResult, null, 2));
  }

  return { confidence, visionResult };
}

// ── Main job processor ────────────────────────────────────────────

/**
 * Process a single job through the full pipeline.
 *
 * Path A (sketch): preprocess → lineart → vectorize → normalize  (unchanged)
 * Path B (photo):  vision extraction → parametric SVG generation  (new)
 */
export async function processJob(job: Job): Promise<void> {
  const { project_id } = job;

  try {
    // ── PATH DETECTION (runs on 'preprocess' step) ────────────
    if (job.step === 'preprocess') {
      updateJob(job.id, { progress: 0 });

      const originalPath = getFilePath(project_id, FILES.ORIGINAL);
      const project = getProject?.(project_id);
      const category = (project?.category ?? 'hoodie') as GarmentCategory;
      const mimeType = project?.mime_type as string | undefined;
      const processingPath = detectProcessingPath(originalPath, mimeType);

      // Store which path we chose on the project (for UI)
      updateProjectMeta?.(project_id, {
        processing_path: processingPath,
      });

      if (processingPath === 'photo') {
        // ── PHOTO PIPELINE (runs entirely in this one step) ────
        console.log(`[processor] Project ${project_id}: using PHOTO pipeline`);

        const { confidence, visionResult } = await runPhotoPipeline(
          project_id,
          category,
          (p) => updateJob(job.id, { progress: p }),
        );

        createAsset({
          id: nanoid(),
          project_id,
          type: 'svg',
          path: FILES.SVG,
        });

        // Store confidence + path for status API
        updateProjectMeta?.(project_id, {
          processing_path: 'photo',
          vision_confidence: confidence,
          template_mode: confidence < LOW_CONFIDENCE_THRESHOLD,
        });

        updateJob(job.id, { progress: 100, status: 'done' });
        updateProjectStatus(project_id, 'ready');

        console.log(
          `✓ Project ${project_id} photo pipeline complete (confidence: ${confidence.toFixed(2)})`,
        );
        return;
      }

      // ── SKETCH PIPELINE (Path A) continues as before ─────────
      console.log(`[processor] Project ${project_id}: using SKETCH pipeline`);

      updateProjectMeta?.(project_id, {
        processing_path: 'sketch',
        vision_confidence: 1,
        template_mode: false,
      });

      const preprocessedPath = getFilePath(project_id, FILES.PREPROCESSED);
      await preprocessImage(originalPath, preprocessedPath);

      createAsset({
        id: nanoid(),
        project_id,
        type: 'preprocessed',
        path: FILES.PREPROCESSED,
      });

      updateJob(job.id, { progress: 25, status: 'done' });
      return;
    }

    // Step 2: Generate Line Art (25-50%) — sketch only
    if (job.step === 'lineart') {
      updateJob(job.id, { progress: 25 });

      const preprocessedPath = getFilePath(project_id, FILES.PREPROCESSED);
      const lineartPath = getFilePath(project_id, FILES.LINEART);

      await generateLineArt(preprocessedPath, lineartPath);

      createAsset({
        id: nanoid(),
        project_id,
        type: 'lineart',
        path: FILES.LINEART,
      });

      updateJob(job.id, { progress: 50, status: 'done' });
      return;
    }

    // Step 3: Vectorize (50-75%) — sketch only
    if (job.step === 'vectorize') {
      updateJob(job.id, { progress: 50 });

      const lineartPath = getFilePath(project_id, FILES.LINEART);
      const svgRawPath = getFilePath(project_id, 'raw.svg');

      await vectorizeToSVG(lineartPath, svgRawPath);

      updateJob(job.id, { progress: 75, status: 'done' });
      return;
    }

    // Step 4: Normalize SVG (75-100%) — sketch only
    if (job.step === 'normalize') {
      updateJob(job.id, { progress: 75 });

      const svgRawPath = getFilePath(project_id, 'raw.svg');
      const svgPath = getFilePath(project_id, FILES.SVG);

      normalizeSVG(svgRawPath, svgPath);

      createAsset({
        id: nanoid(),
        project_id,
        type: 'svg',
        path: FILES.SVG,
      });

      updateJob(job.id, { progress: 100, status: 'done' });
      updateProjectStatus(project_id, 'ready');

      console.log(`✓ Project ${project_id} sketch pipeline complete!`);
      return;
    }
  } catch (error) {
    console.error(`Job ${job.id} failed:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    updateJob(job.id, {
      status: 'error',
      error_message: errorMessage,
    });

    updateProjectStatus(project_id, 'error', errorMessage);

    throw error;
  }
}
