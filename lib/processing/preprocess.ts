import sharp from 'sharp';

/**
 * Preprocess image: resize, grayscale, normalize, sharpen
 * @param inputPath - Path to original image
 * @param outputPath - Path to save preprocessed image
 */
export async function preprocessImage(inputPath: string, outputPath: string): Promise<void> {
  try {
    await sharp(inputPath)
      .resize(2000, 2000, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .grayscale()
      .normalize()
      .sharpen({ sigma: 0.5 })
      .toFile(outputPath);
      
    console.log(`✓ Preprocessed image saved to ${outputPath}`);
  } catch (error) {
    console.error('Preprocessing error:', error);
    throw new Error(`Failed to preprocess image: ${error}`);
  }
}
