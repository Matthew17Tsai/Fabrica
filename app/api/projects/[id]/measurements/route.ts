/**
 * GET  /api/projects/[id]/measurements  — list all measurements
 * PUT  /api/projects/[id]/measurements  — batch update base values
 * POST /api/projects/[id]/measurements  — seed/prefill from template
 */

import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import {
  getProject,
  getMeasurements,
  upsertMeasurement,
  deleteMeasurements,
  updateProjectWizardStatus,
  getSizeRun,
  replaceSizeRun,
} from '@/lib/db';
import type { BaseSize } from '@/lib/db';
import { getPomGroupsForFeatures } from '@/lib/cost/features';
import type { ConfirmedFeatures } from '@/lib/cost/features';
import { buildSizeRun } from '@/lib/cost/grades';
import type { GradeCategory } from '@/lib/cost/grades';
import { getMeasurementTemplate } from '@/lib/templates/measurements';

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

  // Determine visible POM groups based on confirmed features
  let visibleGroups: string[] = ['body', 'sleeve'];
  if (project.confirmed_features_json) {
    try {
      const features = JSON.parse(project.confirmed_features_json) as Partial<ConfirmedFeatures>;
      visibleGroups = getPomGroupsForFeatures(features);
    } catch { /* use defaults */ }
  }

  return NextResponse.json({ measurements, visibleGroups });
}

// PUT — batch update base_value for existing measurements
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const project = getProject(params.id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const body = await req.json() as {
    updates:  Array<{ measurement_id: string; base_value: number | null; notes?: string }>;
    confirm?: boolean;
    gradeCategory?: GradeCategory;
    sizeRange?: string[];
  };

  if (!Array.isArray(body.updates)) {
    return NextResponse.json({ error: '"updates" must be an array' }, { status: 400 });
  }

  // Upsert each measurement
  const existingMap = new Map(getMeasurements(params.id).map(m => [m.measurement_id, m]));

  for (const item of body.updates) {
    if (typeof item.measurement_id !== 'string') continue;
    const existing = existingMap.get(item.measurement_id);
    if (!existing) continue;

    const value = item.base_value === null ? null : Number(item.base_value);
    upsertMeasurement({
      ...existing,
      base_value: value,
      notes:      item.notes ?? existing.notes,
    });
  }

  if (body.confirm) {
    updateProjectWizardStatus(params.id, 'pom', 'confirmed');
  }

  const measurements = getMeasurements(params.id);

  // If size run already exists, regenerate it with updated base values
  const existingSizeRun = getSizeRun(params.id);
  if (existingSizeRun.length > 0) {
    const category  = (body.gradeCategory ?? 'menswear') as GradeCategory;
    const sizeRange = (body.sizeRange ?? ['XS', 'S', 'M', 'L', 'XL', 'XXL']) as BaseSize[];
    const baseSize  = (project.base_size ?? 'M') as BaseSize;
    // Only update non-overridden cells
    const rows = buildSizeRun(measurements, baseSize, category, sizeRange);
    const existing = new Map(existingSizeRun.map(r => [`${r.measurement_id}_${r.size_label}`, r]));
    const merged = rows.map(r => {
      const prev = existing.get(`${r.measurement_id}_${r.size_label}`);
      return prev?.is_user_override ? prev : r;
    });
    replaceSizeRun(params.id, merged.map(r => ({
      measurement_id:   r.measurement_id,
      size_label:       r.size_label,
      value:            r.value,
      is_base_size:     r.is_base_size,
      is_user_override: r.is_user_override,
    })));
  }

  return NextResponse.json({ measurements });
}

// POST — seed measurements from template based on garment type + confirmed features
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const project = getProject(params.id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const body = await req.json() as { replace?: boolean };
  const existing = getMeasurements(params.id);

  if (existing.length > 0 && !body.replace) {
    return NextResponse.json({ measurements: existing, skipped: true });
  }

  // Determine which groups to seed based on confirmed features
  let visibleGroups: string[] = ['body', 'sleeve'];
  if (project.confirmed_features_json) {
    try {
      const features = JSON.parse(project.confirmed_features_json) as Partial<ConfirmedFeatures>;
      visibleGroups = getPomGroupsForFeatures(features);
    } catch { /* use defaults */ }
  }

  // Clear and re-seed
  deleteMeasurements(params.id);

  const template = getMeasurementTemplate(
    project.category,
    project.sub_type ?? 'pullover_hoodie',
    project.base_size ?? 'M',
    visibleGroups,
  );

  for (const m of template) {
    upsertMeasurement({
      id:                nanoid(),
      project_id:        params.id,
      measurement_id:    m.measurement_id,
      label:             m.label,
      measurement_point: m.measurement_point ?? null,
      group_name:        m.group_name,
      base_value:        m.base_value ?? null,
      tolerance:         m.tolerance ?? 0.5,
      unit:              m.unit ?? 'inches',
      notes:             m.notes ?? null,
      sort_order:        m.sort_order,
    });
  }

  const measurements = getMeasurements(params.id);
  return NextResponse.json({ measurements });
}
