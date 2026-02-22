/**
 * POST /api/projects/[id]/generate-sketch
 *
 * Generates AI flat sketches (front + back) for a project using Gemini.
 * Called from the loading page after project creation.
 *
 * Requires GEMINI_API_KEY environment variable.
 * Gracefully returns { skipped: true } if the key is absent.
 *
 * Response:
 * { front: string; back: string }  — asset URLs on success
 * { skipped: true; reason: string } — if Gemini key missing or generation fails
 */

import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'node:fs';
import { nanoid } from 'nanoid';
import { getProject, createAsset } from '@/lib/db';
import { writeFile, readFile, fileExists, copyFile, FILES, getFilePath, originalFilename } from '@/lib/storage';
import { generateSketchPair, buildGarmentDescription } from '@/lib/gemini-sketch';

export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const project = getProject(params.id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Skip if no Gemini key
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ skipped: true, reason: 'GEMINI_API_KEY not configured' });
  }

  // Parse optional force flag from body
  let force = false;
  try {
    const body = await req.json().catch(() => ({}));
    force = !!body?.force;
  } catch {
    // ignore parse errors
  }

  // Skip if AI sketches already exist (unless forced regeneration)
  if (
    !force &&
    fileExists(params.id, FILES.AI_SKETCH_FRONT) &&
    fileExists(params.id, FILES.AI_SKETCH_BACK)
  ) {
    return NextResponse.json({
      front: `/api/projects/${params.id}/ai-sketch?view=front`,
      back:  `/api/projects/${params.id}/ai-sketch?view=back`,
    });
  }

  // Find the primary photo to pass to Gemini
  const photoPath = getFilePath(params.id, originalFilename(1));
  if (!existsSync(photoPath)) {
    return NextResponse.json({ skipped: true, reason: 'No photo found for project' });
  }

  const description = buildGarmentDescription(project.category, project.ai_analysis_json);

  try {
    // Generate front + back using chat history for visual consistency.
    // Pass ai_analysis_json so detected_features (pocket type, etc.) guide the prompt accurately.
    const { front: frontBuffer, back: backBuffer } = await generateSketchPair(
      photoPath,
      description,
      project.ai_analysis_json,
    );

    // Archive existing sketches before overwriting (only when force-regenerating),
    // but skip if the current active is already in version history (avoid duplicates).
    if (force) {
      const MARKER = 'active_sketch_version.txt';
      const alreadyVersioned =
        fileExists(params.id, MARKER) &&
        readFile(params.id, MARKER).toString('utf8').trim().length > 0;

      if (!alreadyVersioned) {
        const ts = Date.now();
        if (fileExists(params.id, FILES.AI_SKETCH_FRONT)) {
          copyFile(params.id, FILES.AI_SKETCH_FRONT, `ai_sketch_front_v${ts}.png`);
        }
        if (fileExists(params.id, FILES.AI_SKETCH_BACK)) {
          copyFile(params.id, FILES.AI_SKETCH_BACK, `ai_sketch_back_v${ts}.png`);
        }
      }
    }

    writeFile(params.id, FILES.AI_SKETCH_FRONT, frontBuffer);
    writeFile(params.id, FILES.AI_SKETCH_BACK, backBuffer);
    // Reset marker: new sketch is freshly generated and not yet in version history
    writeFile(params.id, 'active_sketch_version.txt', '');

    // Record assets in DB (upsert pattern — remove old then insert)
    createAsset({
      id:                nanoid(),
      project_id:        params.id,
      asset_type:        'ai_sketch_front',
      file_path:         FILES.AI_SKETCH_FRONT,
      original_filename: 'ai_sketch_front.png',
      mime_type:         'image/png',
    });
    createAsset({
      id:                nanoid(),
      project_id:        params.id,
      asset_type:        'ai_sketch_back',
      file_path:         FILES.AI_SKETCH_BACK,
      original_filename: 'ai_sketch_back.png',
      mime_type:         'image/png',
    });

    return NextResponse.json({
      front: `/api/projects/${params.id}/ai-sketch?view=front`,
      back:  `/api/projects/${params.id}/ai-sketch?view=back`,
    });
  } catch (err) {
    console.error('Sketch generation failed:', err);
    return NextResponse.json({
      skipped: true,
      reason: err instanceof Error ? err.message : 'Generation failed',
    });
  }
}
