import { NextRequest, NextResponse } from 'next/server';
import { getProject, getJobsByProject, getAssetByType } from '@/lib/db';

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

    const jobs = getJobsByProject(params.id);
    const currentJob = jobs.find(j => j.status !== 'done' && j.status !== 'error') || jobs[0] || null;

    const svgAsset = getAssetByType(params.id, 'svg');
    const techpackAsset = getAssetByType(params.id, 'techpack_json');

    return NextResponse.json({
      project,
      job: currentJob,
      hasAssets: {
        svg: !!svgAsset,
        techpack_json: !!techpackAsset,
      },
      // New fields for vision integration
      processingPath: (project as any).processing_path ?? 'sketch',
      visionConfidence: (project as any).vision_confidence ?? 1,
      templateMode: (project as any).template_mode ?? false,
    });
  } catch (error) {
    console.error('Status error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch status' },
      { status: 500 }
    );
  }
}
