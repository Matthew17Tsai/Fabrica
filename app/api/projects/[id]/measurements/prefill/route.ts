import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getProject, deleteMeasurements, upsertMeasurement } from '@/lib/db';
import type { BaseSize, FitType, SubType } from '@/lib/db';
import { computeMeasurements } from '@/lib/templates/measurements';

// POST /api/projects/[id]/measurements/prefill
// Loads industry-standard template measurements into the project.
// Existing measurement rows are replaced.
//
// Body (all optional — falls back to values stored on the project):
// {
//   size?: BaseSize;       // 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL'
//   fit?:  FitType;        // 'oversized' | 'regular' | 'slim'
//   sub_type?: SubType;    // e.g. 'zip_hoodie'
// }

const VALID_SIZES = new Set(['XS', 'S', 'M', 'L', 'XL', 'XXL']);
const VALID_FITS  = new Set(['oversized', 'regular', 'slim']);

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const project = getProject(params.id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // body is optional — use project defaults
  }

  const size = (VALID_SIZES.has(body.size as string)
    ? body.size
    : project.base_size ?? 'M') as BaseSize;

  const fit = (VALID_FITS.has(body.fit as string)
    ? body.fit
    : project.fit ?? 'regular') as FitType;

  const subType = (body.sub_type ?? project.sub_type ?? undefined) as SubType | undefined;

  const computed = computeMeasurements(project.category, size, fit, subType);

  // Replace existing measurements with template values
  deleteMeasurements(params.id);

  for (const m of computed) {
    upsertMeasurement({
      id:             nanoid(),
      project_id:     params.id,
      measurement_id: m.measurement_id,
      label:          m.label,
      value_inches:   m.value_inches,
      tolerance:      m.tolerance,
      notes:          m.description,
      sort_order:     m.sort_order,
    });
  }

  return NextResponse.json({
    prefilled: computed.length,
    size,
    fit,
    measurements: computed,
  });
}
