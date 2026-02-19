import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getProject, getBomItems, replaceBomItems, upsertBomItem, getConstructionNotes, replaceConstructionNotes } from '@/lib/db';
import type { SubType } from '@/lib/db';
import { getBomTemplate, getConstructionTemplate } from '@/lib/templates/bom';

// GET /api/projects/[id]/bom
// Returns BOM items. If none exist yet, auto-seeds from template and returns those.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const project = getProject(params.id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  let items = getBomItems(params.id);

  // Auto-seed from template on first access
  if (items.length === 0) {
    const template = getBomTemplate(project.category, project.sub_type as SubType | undefined);
    items = replaceBomItems(
      params.id,
      template.map((t, i) => ({ ...t, sort_order: i })),
    );

    // Also seed construction notes if empty
    if (getConstructionNotes(params.id).length === 0) {
      const noteTemplates = getConstructionTemplate(project.category);
      replaceConstructionNotes(
        params.id,
        noteTemplates.map((n, i) => ({ ...n, sort_order: i })),
      );
    }
  }

  return NextResponse.json({ bom: items });
}

// PUT /api/projects/[id]/bom
// Full replace of BOM items for the project.
// Body: { items: Array<BomItemInput> }
//
// To add or update a single item, include all items in the array (it's a full replace).
// To seed from template, POST to /api/projects/[id]/bom/prefill (not a separate route —
// caller can GET first and the auto-seed logic handles it).
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const project = getProject(params.id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  let body: { items?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!Array.isArray(body.items)) {
    return NextResponse.json({ error: '"items" must be an array' }, { status: 400 });
  }

  type BomInput = {
    component?: unknown;
    material?: unknown;
    composition?: unknown;
    weight?: unknown;
    supplier?: unknown;
    color?: unknown;
    notes?: unknown;
    sort_order?: unknown;
  };

  const sanitized = (body.items as BomInput[]).map((item, i) => ({
    component:   String(item.component   ?? ''),
    material:    String(item.material    ?? ''),
    composition: String(item.composition ?? ''),
    weight:      String(item.weight      ?? ''),
    supplier:    item.supplier != null ? String(item.supplier) : null,
    color:       item.color    != null ? String(item.color)    : null,
    notes:       item.notes    != null ? String(item.notes)    : null,
    sort_order:  typeof item.sort_order === 'number' ? item.sort_order : i,
  }));

  const items = replaceBomItems(params.id, sanitized);
  return NextResponse.json({ bom: items });
}
