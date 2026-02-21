/**
 * POST /api/projects/[id]/upload-sketch?view=front|back
 *
 * Accepts a PNG/JPG/WEBP file upload and saves it as the user's flat sketch,
 * overriding the AI-generated sketch for that view.
 *
 * The /api/projects/[id]/ai-sketch route serves user-uploaded sketches first,
 * so uploading here immediately replaces the AI sketch throughout the app.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProject } from '@/lib/db';
import { writeFile, FILES } from '@/lib/storage';

export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const project = getProject(params.id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const view = req.nextUrl.searchParams.get('view') === 'back' ? 'back' : 'front';
  const filename = view === 'front' ? FILES.SKETCH_FRONT : FILES.SKETCH_BACK;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.length === 0) {
    return NextResponse.json({ error: 'Empty file' }, { status: 400 });
  }

  writeFile(params.id, filename, buffer);

  return NextResponse.json({ ok: true, view });
}
