import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { createProject, createAsset } from '@/lib/db';
import type { FitType, BaseSize } from '@/lib/db';
import { ensureProjectDir, writeFile, FILES } from '@/lib/storage';

const VALID_SIZES = new Set<BaseSize>(['XS', 'S', 'M', 'L', 'XL', 'XXL']);
const VALID_FITS  = new Set<FitType>(['oversized', 'regular', 'slim']);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const title     = formData.get('title')     as string;
    const category  = formData.get('category')  as string;
    const file      = formData.get('file')      as File;
    const baseSize  = (formData.get('base_size') as string | null) ?? 'M';
    const fit       = (formData.get('fit')       as string | null) ?? 'regular';

    const resolvedSize: BaseSize = VALID_SIZES.has(baseSize as BaseSize) ? (baseSize as BaseSize) : 'M';
    const resolvedFit: FitType   = VALID_FITS.has(fit as FitType)        ? (fit as FitType)        : 'regular';

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
      id:        projectId,
      title,
      category:  category as 'hoodie' | 'sweatshirt' | 'sweatpants',
      status:    'uploaded',
      base_size: resolvedSize,
      fit:       resolvedFit,
    });

    // Create asset record for original
    createAsset({
      id: nanoid(),
      project_id: projectId,
      type: 'original',
      path: FILES.ORIGINAL,
    });

    // Project stays in 'uploaded' state. AI analysis and flat sketch
    // generation are triggered manually from the Overview tab.
    return NextResponse.json({ projectId });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}