/**
 * GET /api/projects/[id]/sketch-history
 *
 * Returns a list of archived sketch version PAIRS for a project.
 * Each entry: { timestamp, date, frontUrl, backUrl (or null if no back exists) }
 *
 * GET /api/projects/[id]/sketch-history?view=front|back&file=ai_sketch_front_v123.png
 * Serves the raw image bytes of that specific archived version file.
 */

import { NextRequest, NextResponse } from 'next/server';
import { listFiles, fileExists, readFile } from '@/lib/storage';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const view   = req.nextUrl.searchParams.get('view') === 'back' ? 'back' : 'front';
  const file   = req.nextUrl.searchParams.get('file');
  const prefix = view === 'front' ? 'ai_sketch_front_v' : 'ai_sketch_back_v';

  // Serve a specific archived version file
  if (file) {
    if (!file.startsWith(prefix) || !file.endsWith('.png')) {
      return NextResponse.json({ error: 'Invalid file' }, { status: 400 });
    }
    if (!fileExists(params.id, file)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const buf = readFile(params.id, file);
    const isJpeg = buf[0] === 0xFF && buf[1] === 0xD8;
    return new Response(new Uint8Array(buf), {
      headers: {
        'Content-Type':  isJpeg ? 'image/jpeg' : 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  // List front versions; each front file is the primary key for a front+back pair.
  const frontFiles = listFiles(params.id, 'ai_sketch_front_v')
    .filter(f => f.endsWith('.png'))
    .reverse();  // newest first

  const versions = frontFiles.map(frontFilename => {
    const match = frontFilename.match(/_v(\d+)\.png$/);
    const ts = match ? match[1] : '0';
    const backFilename = `ai_sketch_back_v${ts}.png`;
    const hasBack = fileExists(params.id, backFilename);
    return {
      timestamp: ts,
      date:     ts !== '0' ? new Date(Number(ts)).toLocaleString() : frontFilename,
      frontUrl: `/api/projects/${params.id}/sketch-history?view=front&file=${frontFilename}`,
      backUrl:  hasBack
        ? `/api/projects/${params.id}/sketch-history?view=back&file=${backFilename}`
        : null,
    };
  });

  return NextResponse.json({ versions });
}
