import { NextRequest, NextResponse } from 'next/server';
import { getProject } from '@/lib/db';
import { readFile, FILES, fileExists } from '@/lib/storage';

// GET /api/projects/[id]/svg/download  → serves the raw SVG file
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const project = getProject(params.id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    if (!fileExists(params.id, FILES.SVG)) {
      return NextResponse.json({ error: 'SVG not ready' }, { status: 404 });
    }

    const svgBuffer = readFile(params.id, FILES.SVG);
    const filename = `${project.title.replace(/[^a-z0-9]/gi, '_')}_flatsketch.svg`;

    return new NextResponse(svgBuffer, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('SVG download error:', error);
    return NextResponse.json({ error: 'Download failed' }, { status: 500 });
  }
}
