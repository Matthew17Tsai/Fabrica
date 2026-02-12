import sharp from 'sharp';

/**
 * Generate line art from preprocessed image
 * Uses high-contrast threshold to create black/white bitmap
 * @param inputPath - Path to preprocessed image
 * @param outputPath - Path to save line art
 */
export async function generateLineArt(inputPath: string, outputPath: string): Promise<void> {
  try {
    // Load image and get metadata
    const image = sharp(inputPath);
    const { width, height } = await image.metadata();

    if (!width || !height) {
      throw new Error('Could not read image dimensions');
    }

    // Apply aggressive contrast and threshold to create line art
    await image
      .linear(2.0, -(128 * 0.5)) // Increase contrast: a * input + b
      .threshold(128) // Convert to pure black and white
      .median(3) // Remove noise with median filter
      .toFile(outputPath);

    console.log(`✓ Line art generated at ${outputPath}`);
  } catch (error) {
    console.error('Line art generation error:', error);
    throw new Error(`Failed to generate line art: ${error}`);
  }
}
