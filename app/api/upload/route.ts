import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { createProject, createAsset, createJob, updateProjectStatus } from '@/lib/db';
import { ensureProjectDir, writeFile, FILES } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const title = formData.get('title') as string;
    const category = formData.get('category') as string;
    const file = formData.get('file') as File;

    if (!title || !category || !file) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['hoodie', 'sweatshirt', 'sweatpants'].includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      );
    }

    // Generate project ID
    const projectId = nanoid(12);

    // Save uploaded file
    const buffer = Buffer.from(await file.arrayBuffer());
    ensureProjectDir(projectId);
    writeFile(projectId, FILES.ORIGINAL, buffer);

    // Create project record
    createProject({
      id: projectId,
      title,
      category: category as 'hoodie' | 'sweatshirt' | 'sweatpants',
      status: 'uploaded',
    });

    // Create asset record for original
    createAsset({
      id: nanoid(),
      project_id: projectId,
      type: 'original',
      path: FILES.ORIGINAL,
    });

    // Detect if photo (JPEG or large file) to determine job steps
    const isPhoto = file.type !== 'image/svg+xml';

    const jobSteps = isPhoto
      ? ['preprocess']
      : ['preprocess', 'lineart', 'vectorize', 'normalize'];

    for (const step of jobSteps) {
      createJob({
        id: nanoid(),
        project_id: projectId,
        status: 'queued',
        step,
        progress: 0,
      });
    }

    // Update project status to processing
    updateProjectStatus(projectId, 'processing');

    return NextResponse.json({ projectId });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}