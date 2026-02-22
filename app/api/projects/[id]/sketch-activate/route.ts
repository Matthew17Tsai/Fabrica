/**
 * POST /api/projects/[id]/sketch-activate
 *
 * Activates an archived sketch VERSION PAIR, making both front and back the
 * current active sketches.
 *
 * Body: { timestamp: string }  — the numeric timestamp from sketch-history
 *
 * Copies ai_sketch_front_v{timestamp}.png → AI_SKETCH_FRONT
 *        ai_sketch_back_v{timestamp}.png  → AI_SKETCH_BACK  (if exists)
 */

import { NextRequest, NextResponse } from 'next/server';
import { copyFile, fileExists, readFile, writeFile, FILES } from '@/lib/storage';

export const runtime = 'nodejs';

const MARKER = 'active_sketch_version.txt';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const body = await req.json().catch(() => ({}));
  const { timestamp } = body as { timestamp?: string };

  if (!timestamp || !/^\d+$/.test(timestamp)) {
    return NextResponse.json({ error: 'timestamp (numeric string) required' }, { status: 400 });
  }

  const frontFilename = `ai_sketch_front_v${timestamp}.png`;
  const backFilename  = `ai_sketch_back_v${timestamp}.png`;

  if (!fileExists(params.id, frontFilename)) {
    return NextResponse.json({ error: 'Version not found' }, { status: 404 });
  }

  // Only archive if the current active sketch is NOT already in version history.
  // If it is, archiving would create a duplicate entry.
  const alreadyVersioned =
    fileExists(params.id, MARKER) &&
    readFile(params.id, MARKER).toString('utf8').trim().length > 0;

  if (!alreadyVersioned) {
    const archiveTs = Date.now();
    if (fileExists(params.id, FILES.AI_SKETCH_FRONT)) {
      copyFile(params.id, FILES.AI_SKETCH_FRONT, `ai_sketch_front_v${archiveTs}.png`);
    }
    if (fileExists(params.id, FILES.AI_SKETCH_BACK)) {
      copyFile(params.id, FILES.AI_SKETCH_BACK, `ai_sketch_back_v${archiveTs}.png`);
    }
  }

  // Activate front (required)
  copyFile(params.id, frontFilename, FILES.AI_SKETCH_FRONT);

  // Activate back if it exists for this version
  let activatedBack = false;
  if (fileExists(params.id, backFilename)) {
    copyFile(params.id, backFilename, FILES.AI_SKETCH_BACK);
    activatedBack = true;
  }

  // Mark that the active sketch is now a known version (no need to archive again)
  writeFile(params.id, MARKER, timestamp);

  return NextResponse.json({ ok: true, timestamp, activatedBack });
}
