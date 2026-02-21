/**
 * GET /api/projects/[id]/sketch-front
 * Serves the uploaded front flat sketch image.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProject } from '@/lib/db';
import { fileExists, readFile, FILES } from '@/lib/storage';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const project = getProject(params.id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  if (!fileExists(params.id, FILES.SKETCH_FRONT)) {
    return NextResponse.json({ error: 'No front sketch uploaded' }, { status: 404 });
  }

  const buffer = readFile(params.id, FILES.SKETCH_FRONT);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'private, max-age=86400',
    },
  });
}
