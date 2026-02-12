import { nanoid } from 'nanoid';
import { Job, updateJob, updateProjectStatus, createAsset } from '@/lib/db';
import { getFilePath, FILES } from '@/lib/storage';
import { preprocessImage } from '@/lib/processing/preprocess';
import { generateLineArt } from '@/lib/processing/lineart';
import { vectorizeToSVG } from '@/lib/processing/vectorize';
import { normalizeSVG } from '@/lib/processing/normalize';

/**
 * Process a single job through the full pipeline
 */
export async function processJob(job: Job): Promise<void> {
  const { project_id } = job;

  try {
    // Step 1: Preprocess (0-25%)
    if (job.step === 'preprocess') {
      updateJob(job.id, { progress: 0 });
      
      const originalPath = getFilePath(project_id, FILES.ORIGINAL);
      const preprocessedPath = getFilePath(project_id, FILES.PREPROCESSED);
      
      await preprocessImage(originalPath, preprocessedPath);
      
      createAsset({
        id: nanoid(),
        project_id,
        type: 'preprocessed',
        path: FILES.PREPROCESSED,
      });
      
      updateJob(job.id, { progress: 25, status: 'done' });
      
      // Create next job
      return; // Job runner will pick up next queued job
    }

    // Step 2: Generate Line Art (25-50%)
    if (job.step === 'lineart') {
      updateJob(job.id, { progress: 25 });
      
      const preprocessedPath = getFilePath(project_id, FILES.PREPROCESSED);
      const lineartPath = getFilePath(project_id, FILES.LINEART);
      
      await generateLineArt(preprocessedPath, lineartPath);
      
      createAsset({
        id: nanoid(),
        project_id,
        type: 'lineart',
        path: FILES.LINEART,
      });
      
      updateJob(job.id, { progress: 50, status: 'done' });
      return;
    }

    // Step 3: Vectorize (50-75%)
    if (job.step === 'vectorize') {
      updateJob(job.id, { progress: 50 });
      
      const lineartPath = getFilePath(project_id, FILES.LINEART);
      const svgRawPath = getFilePath(project_id, 'raw.svg');
      
      await vectorizeToSVG(lineartPath, svgRawPath);
      
      updateJob(job.id, { progress: 75, status: 'done' });
      return;
    }

    // Step 4: Normalize SVG (75-100%)
    if (job.step === 'normalize') {
      updateJob(job.id, { progress: 75 });
      
      const svgRawPath = getFilePath(project_id, 'raw.svg');
      const svgPath = getFilePath(project_id, FILES.SVG);
      
      normalizeSVG(svgRawPath, svgPath);
      
      createAsset({
        id: nanoid(),
        project_id,
        type: 'svg',
        path: FILES.SVG,
      });
      
      updateJob(job.id, { progress: 100, status: 'done' });
      
      // Mark project as ready
      updateProjectStatus(project_id, 'ready');
      
      console.log(`✓ Project ${project_id} processing complete!`);
      return;
    }

  } catch (error) {
    console.error(`Job ${job.id} failed:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    updateJob(job.id, {
      status: 'error',
      error_message: errorMessage,
    });
    
    updateProjectStatus(project_id, 'error', errorMessage);
    
    throw error;
  }
}
