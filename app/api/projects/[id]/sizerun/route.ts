/**
 * GET  /api/projects/[id]/sizerun          — retrieve size run table
 * POST /api/projects/[id]/sizerun          — generate size run from base measurements
 * PATCH /api/projects/[id]/sizerun         — update a single cell (user override)
 *
 * POST body: { category: 'menswear' | 'womenswear' | 'childrenswear', sizeRange?: string[] }
 * PATCH body: { measurement_id: string, size_label: string, value: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getProject,
  getMeasurements,
  getSizeRun,
  replaceSizeRun,
  updateSizeRunCell,
  updateProjectWizardStatus,
} from '@/lib/db';
import type { BaseSize } from '@/lib/db';
import { buildSizeRun } from '@/lib/cost/grades';
import type { GradeCategory } from '@/lib/cost/grades';

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
  const sizeRun      = getSizeRun(params.id);

  return NextResponse.json({ measurements, sizeRun });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const project = getProject(params.id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const body = await req.json() as {
    category?:  GradeCategory;
    sizeRange?: string[];
  };

  const category  = body.category  ?? 'menswear';
  const sizeRange = (body.sizeRange ?? ['XS', 'S', 'M', 'L', 'XL', 'XXL']) as BaseSize[];
  const baseSize  = (project.base_size ?? 'M') as BaseSize;

  const measurements = getMeasurements(params.id);
  if (measurements.length === 0) {
    return NextResponse.json({ error: 'No measurements found. Complete Step 3 first.' }, { status: 400 });
  }

  const rows    = buildSizeRun(measurements, baseSize, category, sizeRange);
  const sizeRun = replaceSizeRun(params.id, rows);

  updateProjectWizardStatus(params.id, 'sizerun', 'confirmed');

  return NextResponse.json({ sizeRun });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const project = getProject(params.id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const body = await req.json() as {
    measurement_id: string;
    size_label:     string;
    value:          number;
  };

  if (!body.measurement_id || !body.size_label || body.value === undefined) {
    return NextResponse.json({ error: 'measurement_id, size_label, and value are required' }, { status: 400 });
  }

  updateSizeRunCell(params.id, body.measurement_id, body.size_label, body.value);

  return NextResponse.json({ ok: true });
}
