/**
 * DELETE /api/projects/[id]
 *
 * Permanently deletes a project and all associated data.
 * Foreign key cascades handle assets, BOM, measurements, size run, notes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProject, deleteProject } from '@/lib/db';
import { deleteProjectFiles } from '@/lib/storage';

export const runtime = 'nodejs';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const project = getProject(params.id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Delete DB rows (cascade handles related tables)
  deleteProject(params.id);

  // Delete storage files (best-effort — don't fail if dir is already gone)
  try {
    deleteProjectFiles(params.id);
  } catch { /* ignore */ }

  return NextResponse.json({ ok: true });
}
