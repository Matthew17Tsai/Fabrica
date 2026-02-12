import { trace } from 'potrace';
import fs from 'fs';

/**
 * Vectorize bitmap to SVG using Potrace
 * @param inputPath - Path to line art PNG
 * @param outputPath - Path to save raw SVG
 */
export async function vectorizeToSVG(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const params = {
      threshold: 128,
      optTolerance: 0.2,
      turdSize: 2,
      turnPolicy: 'black' as const,
      alphaMax: 1.0,
      color: 'black',
    };

    trace(inputPath, params, (err, svg) => {
      if (err) {
        console.error('Potrace error:', err);
        reject(new Error(`Failed to vectorize: ${err}`));
        return;
      }

      try {
        fs.writeFileSync(outputPath, svg);
        console.log(`✓ SVG vectorized at ${outputPath}`);
        resolve();
      } catch (writeErr) {
        reject(new Error(`Failed to write SVG: ${writeErr}`));
      }
    });
  });
}
