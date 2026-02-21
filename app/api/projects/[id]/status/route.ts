import { NextRequest, NextResponse } from 'next/server';
import { getProject, getAssetsByProject, getMeasurements, updateProjectWizardStatus } from '@/lib/db';
import type { WizardStepStatus } from '@/lib/db';

export const runtime = 'nodejs';

/** PATCH /api/projects/[id]/status — update one wizard step status */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const project = getProject(params.id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const body = await req.json() as Record<string, string>;

  const STEP_MAP: Record<string, 'features' | 'materials' | 'pom' | 'sizerun' | 'bom'> = {
    step_features_status:  'features',
    step_materials_status: 'materials',
    step_pom_status:       'pom',
    step_sizerun_status:   'sizerun',
    step_bom_status:       'bom',
  };

  for (const [key, value] of Object.entries(body)) {
    const step = STEP_MAP[key];
    if (step) {
      updateProjectWizardStatus(params.id, step, value as WizardStepStatus);
    }
  }

  return NextResponse.json({ ok: true });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const project = getProject(params.id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const assets = getAssetsByProject(params.id);
    const measurements = getMeasurements(params.id);

    const hasSketchFront    = assets.some(a => a.asset_type === 'sketch_front');
    const hasSketchBack     = assets.some(a => a.asset_type === 'sketch_back');
    const hasAiSketchFront  = assets.some(a => a.asset_type === 'ai_sketch_front');
    const hasAiSketchBack   = assets.some(a => a.asset_type === 'ai_sketch_back');
    const hasPhotoFront     = assets.some(a => a.asset_type === 'photo_front');

    return NextResponse.json({
      project,
      hasAssets: {
        photo_front:      hasPhotoFront,
        sketch_front:     hasSketchFront,
        sketch_back:      hasSketchBack,
        ai_sketch_front:  hasAiSketchFront,
        ai_sketch_back:   hasAiSketchBack,
      },
      measurementCount:   measurements.length,
      wizardStepStatuses: {
        features:  project.step_features_status,
        materials: project.step_materials_status,
        pom:       project.step_pom_status,
        sizerun:   project.step_sizerun_status,
        bom:       project.step_bom_status,
      },
    });
  } catch (error) {
    console.error('Status error:', error);
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
  }
}
