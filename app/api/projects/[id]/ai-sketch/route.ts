/**
 * GET /api/projects/[id]/ai-sketch?view=front|back
 *
 * Serves the AI-generated flat sketch image.
 * Falls back to user-uploaded sketch if AI sketch is not yet generated.
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile, fileExists, FILES } from '@/lib/storage';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const view = req.nextUrl.searchParams.get('view') === 'back' ? 'back' : 'front';
  const aiFile   = view === 'front' ? FILES.AI_SKETCH_FRONT : FILES.AI_SKETCH_BACK;
  const userFile = view === 'front' ? FILES.SKETCH_FRONT    : FILES.SKETCH_BACK;

  // User-uploaded sketch takes priority over AI-generated
  let file: string | null = null;
  if (fileExists(params.id, userFile)) file = userFile;
  else if (fileExists(params.id, aiFile)) file = aiFile;

  if (!file) {
    return NextResponse.json({ error: 'Sketch not found' }, { status: 404 });
  }

  const buffer = readFile(params.id, file);
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
