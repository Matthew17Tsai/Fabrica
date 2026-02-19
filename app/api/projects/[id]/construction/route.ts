import { NextRequest, NextResponse } from 'next/server';
import { getProject, getConstructionNotes, replaceConstructionNotes } from '@/lib/db';
import { getConstructionTemplate } from '@/lib/templates/bom';

// GET /api/projects/[id]/construction
// Returns construction notes. Auto-seeds from template on first access.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const project = getProject(params.id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  let notes = getConstructionNotes(params.id);

  if (notes.length === 0) {
    const templates = getConstructionTemplate(project.category);
    notes = replaceConstructionNotes(
      params.id,
      templates.map((t, i) => ({ ...t, sort_order: i })),
    );
  }

  return NextResponse.json({ construction: notes });
}

// PUT /api/projects/[id]/construction
// Full replace of construction notes.
// Body: { notes: Array<{ section: string; content: string; sort_order?: number }> }
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const project = getProject(params.id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  let body: { notes?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!Array.isArray(body.notes)) {
    return NextResponse.json({ error: '"notes" must be an array' }, { status: 400 });
  }

  type NoteInput = { section?: unknown; content?: unknown; sort_order?: unknown };

  const sanitized = (body.notes as NoteInput[]).map((n, i) => ({
    section:    String(n.section  ?? ''),
    content:    String(n.content  ?? ''),
    sort_order: typeof n.sort_order === 'number' ? n.sort_order : i,
  }));

  const notes = replaceConstructionNotes(params.id, sanitized);
  return NextResponse.json({ construction: notes });
}
