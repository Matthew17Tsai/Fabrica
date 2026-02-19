import { NextRequest, NextResponse } from 'next/server';
import { getProject, getMeasurements, updateMeasurementValue } from '@/lib/db';

// GET /api/projects/[id]/measurements
// Returns all measurements for a project, ordered by sort_order.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const project = getProject(params.id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const measurements = getMeasurements(params.id);
  return NextResponse.json({ measurements });
}

// PUT /api/projects/[id]/measurements
// Batch-update measurement values.
// Body: { updates: Array<{ measurement_id: string; value_inches: number | null; notes?: string }> }
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const project = getProject(params.id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  let body: { updates?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!Array.isArray(body.updates)) {
    return NextResponse.json({ error: '"updates" must be an array' }, { status: 400 });
  }

  for (const item of body.updates as Array<{ measurement_id?: string; value_inches?: unknown; notes?: unknown }>) {
    if (typeof item.measurement_id !== 'string') continue;
    const value = item.value_inches === null ? null : Number(item.value_inches);
    if (item.value_inches !== null && isNaN(value as number)) continue;
    const notes = typeof item.notes === 'string' ? item.notes : undefined;
    updateMeasurementValue(params.id, item.measurement_id, value as number | null, notes);
  }

  const measurements = getMeasurements(params.id);
  return NextResponse.json({ measurements });
}
