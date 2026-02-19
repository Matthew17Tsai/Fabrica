import { NextRequest, NextResponse } from 'next/server';
import { getProject, getJobsByProject, getAssetByType, getMeasurements } from '@/lib/db';
import { fileExists, readFile, FILES } from '@/lib/storage';

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

    const svgAsset      = getAssetByType(params.id, 'svg');
    const techpackAsset = getAssetByType(params.id, 'techpack_json');

    let processingPath   = 'sketch';
    let visionConfidence = 1;
    let templateMode     = false;

    if (fileExists(params.id, 'processing_meta.json')) {
      try {
        const meta       = JSON.parse(readFile(params.id, 'processing_meta.json').toString());
        processingPath   = meta.processing_path   ?? 'sketch';
        visionConfidence = meta.vision_confidence ?? 1;
        templateMode     = meta.template_mode     ?? false;
      } catch {}
    }

    const hasFlatFront     = fileExists(params.id, FILES.FLAT_SVG_FRONT);
    const hasFlatBack      = fileExists(params.id, FILES.FLAT_SVG_BACK);
    const measurementCount = getMeasurements(params.id).length;

    return NextResponse.json({
      project,
      job: currentJob,
      hasAssets: {
        svg:           !!svgAsset,
        techpack_json: !!techpackAsset,
        flat_front:    hasFlatFront,
        flat_back:     hasFlatBack,
      },
      measurementCount,
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
