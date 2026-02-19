/**
 * GET /api/projects/[id]/export/json
 * Returns all project data as a downloadable JSON file.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getProject, getMeasurements, getBomItems, getConstructionNotes } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const project = getProject(params.id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const measurements = getMeasurements(params.id);
  const bomItems     = getBomItems(params.id);
  const construction = getConstructionNotes(params.id);

  const exportData = {
    project: {
      ...project,
      ai_analysis_json: project.ai_analysis_json
        ? (() => { try { return JSON.parse(project.ai_analysis_json!); } catch { return null; } })()
        : null,
    },
    measurements: measurements.map((m) => ({
      ...m,
      value_cm: m.value_inches != null ? Math.round(m.value_inches * 2.54 * 10) / 10 : null,
    })),
    bom:          bomItems,
    construction: construction,
    exported_at:  new Date().toISOString(),
  };

  const slug = project.title.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 40);

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type':        'application/json',
      'Content-Disposition': `attachment; filename="techpack_${slug}.json"`,
    },
  });
}
