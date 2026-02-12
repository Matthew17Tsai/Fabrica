import { NextRequest, NextResponse } from 'next/server';
import { getProject } from '@/lib/db';
import { readFile, FILES, fileExists } from '@/lib/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const project = getProject(params.id);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (!fileExists(params.id, FILES.SVG)) {
      return NextResponse.json(
        { error: 'SVG not ready yet' },
        { status: 404 }
      );
    }

    const svgBuffer = readFile(params.id, FILES.SVG);
    const svg = svgBuffer.toString('utf-8');

    return NextResponse.json({ svg });
  } catch (error) {
    console.error('SVG fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SVG' },
      { status: 500 }
    );
  }
}
