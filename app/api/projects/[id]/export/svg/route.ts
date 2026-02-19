/**
 * GET /api/projects/[id]/export/svg?view=front|back
 * Serves the flat sketch SVG as a downloadable file.
 * Full PDF/Excel export routes are built in Phase 6.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getProject } from '@/lib/db';
import { readFile, fileExists, FILES } from '@/lib/storage';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const project = getProject(params.id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const view    = new URL(req.url).searchParams.get('view') ?? 'front';
  const svgFile = view === 'back' ? FILES.FLAT_SVG_BACK : FILES.FLAT_SVG_FRONT;

  // Fall back to legacy SVG if phase-3 file not found
  const targetFile = fileExists(params.id, svgFile)
    ? svgFile
    : fileExists(params.id, FILES.SVG) ? FILES.SVG : null;

  if (!targetFile) {
    return NextResponse.json(
      { error: 'SVG not found. Generate flat sketch first.' },
      { status: 404 },
    );
  }

  const svg = readFile(params.id, targetFile).toString('utf-8');
  return new NextResponse(svg, {
    headers: {
      'Content-Type':        'image/svg+xml',
      'Content-Disposition': `attachment; filename="flatsketch_${view}.svg"`,
    },
  });
}
