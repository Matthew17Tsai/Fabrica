import { NextRequest, NextResponse } from 'next/server';
import { getProject, getJobsByProject, getAssetByType } from '@/lib/db';
import { fileExists, readFile } from '@/lib/storage';

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

    // Read processing metadata from file
    let processingPath = 'sketch';
    let visionConfidence = 1;
    let templateMode = false;

    if (fileExists(params.id, 'processing_meta.json')) {
      try {
        const meta = JSON.parse(readFile(params.id, 'processing_meta.json').toString());
        processingPath = meta.processing_path ?? 'sketch';
        visionConfidence = meta.vision_confidence ?? 1;
        templateMode = meta.template_mode ?? false;
      } catch {}
    }

    return NextResponse.json({
      project,
      job: currentJob,
      hasAssets: {
        svg: !!svgAsset,
        techpack_json: !!techpackAsset,
      },
      processingPath,
      visionConfidence,
      templateMode,
    });
  } catch (error) {
    console.error('Status error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch status' },
      { status: 500 }
    );
  }
}
