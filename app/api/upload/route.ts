import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { createProject, createAsset } from '@/lib/db';
import type { FitType, BaseSize } from '@/lib/db';
import { ensureProjectDir, writeFile, originalFilename, MAX_INSPIRATION_IMAGES } from '@/lib/storage';
import { getBomTemplateWithPricing } from '@/lib/templates/bom';
import { replaceBomItems } from '@/lib/db';
import { getConstructionTemplate } from '@/lib/templates/bom';
import { replaceConstructionNotes } from '@/lib/db';

const VALID_SIZES = new Set<BaseSize>(['XS', 'S', 'M', 'L', 'XL', 'XXL']);
const VALID_FITS  = new Set<FitType>(['oversized', 'regular', 'slim']);

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const styleName    = (formData.get('style_name')   as string | null) ?? '';
    const styleNumber  = formData.get('style_number')  as string | null;
    const season       = formData.get('season')        as string | null;
    const category     = formData.get('category')      as string;
    const baseSize     = (formData.get('base_size')    as string | null) ?? 'M';
    const fit          = (formData.get('fit')          as string | null) ?? 'regular';

    const resolvedSize: BaseSize = VALID_SIZES.has(baseSize as BaseSize) ? (baseSize as BaseSize) : 'M';
    const resolvedFit: FitType   = VALID_FITS.has(fit as FitType)        ? (fit as FitType)        : 'regular';

    // Accept multiple 'photo' fields (front, back, detail, other)
    const photoFiles = (formData.getAll('photo') as File[])
      .filter(f => f && f.size > 0)
      .slice(0, MAX_INSPIRATION_IMAGES);

    // Optional flat sketch uploads
    const sketchFront = formData.get('sketch_front') as File | null;
    const sketchBack  = formData.get('sketch_back')  as File | null;

    if (!styleName || !category || photoFiles.length === 0) {
      return NextResponse.json({ error: 'Missing required fields: style_name, category, and at least one photo' }, { status: 400 });
    }

    if (!['hoodie', 'sweatshirt', 'sweatpants'].includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    const projectId = nanoid(12);
    ensureProjectDir(projectId);

    // Create project record
    const project = createProject({
      id:           projectId,
      style_name:   styleName,
      style_number: styleNumber ?? undefined,
      season:       season ?? undefined,
      category:     category as 'hoodie' | 'sweatshirt' | 'sweatpants',
      fit:          resolvedFit,
      base_size:    resolvedSize,
    });

    // Save photos — first → original.png (for Vision analysis compat), rest → original_2.png …
    const assetTypeLabels: Array<'photo_front' | 'photo_back' | 'photo_detail' | 'photo_other'> =
      ['photo_front', 'photo_back', 'photo_detail', 'photo_other'];

    for (let i = 0; i < photoFiles.length; i++) {
      const buffer   = Buffer.from(await photoFiles[i].arrayBuffer());
      const filename = originalFilename(i + 1);
      writeFile(projectId, filename, buffer);

      createAsset({
        id:                nanoid(),
        project_id:        projectId,
        asset_type:        assetTypeLabels[i] ?? 'photo_other',
        file_path:         filename,
        original_filename: photoFiles[i].name,
        mime_type:         photoFiles[i].type,
      });
    }

    // Save optional flat sketches
    if (sketchFront && sketchFront.size > 0) {
      const buffer = Buffer.from(await sketchFront.arrayBuffer());
      writeFile(projectId, 'sketch_front.png', buffer);
      createAsset({
        id:                nanoid(),
        project_id:        projectId,
        asset_type:        'sketch_front',
        file_path:         'sketch_front.png',
        original_filename: sketchFront.name,
        mime_type:         sketchFront.type,
      });
    }
    if (sketchBack && sketchBack.size > 0) {
      const buffer = Buffer.from(await sketchBack.arrayBuffer());
      writeFile(projectId, 'sketch_back.png', buffer);
      createAsset({
        id:                nanoid(),
        project_id:        projectId,
        asset_type:        'sketch_back',
        file_path:         'sketch_back.png',
        original_filename: sketchBack.name,
        mime_type:         sketchBack.type,
      });
    }

    // Seed BOM from template with pricing (user can confirm/adjust in Step 2)
    const bomTemplate = getBomTemplateWithPricing(category, project.sub_type ?? undefined);
    replaceBomItems(projectId, bomTemplate);

    // Seed construction notes
    const constructionTemplate = getConstructionTemplate(category);
    replaceConstructionNotes(projectId, constructionTemplate);

    return NextResponse.json({ projectId });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
