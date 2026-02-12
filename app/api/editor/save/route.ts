import { NextRequest, NextResponse } from 'next/server';
import { getProject } from '@/lib/db';
import { writeFile, FILES } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const { projectId, svg } = await request.json();

    if (!projectId || !svg) {
      return NextResponse.json(
        { error: 'Missing projectId or svg' },
        { status: 400 }
      );
    }

    const project = getProject(projectId);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Save updated SVG
    writeFile(projectId, FILES.SVG, svg);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('SVG save error:', error);
    return NextResponse.json(
      { error: 'Failed to save SVG' },
      { status: 500 }
    );
  }
}
