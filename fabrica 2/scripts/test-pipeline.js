#!/usr/bin/env node

/**
 * Test the image processing pipeline
 * Creates a simple test image and runs it through all steps
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function createTestImage() {
  const testDir = '/tmp/fabrica/test-pipeline';
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const originalPath = path.join(testDir, 'original.png');

  // Create a simple test image: white background with black rectangle (like a simplified hoodie)
  const width = 400;
  const height = 600;
  
  const svg = `
    <svg width="${width}" height="${height}">
      <rect width="${width}" height="${height}" fill="white"/>
      <rect x="100" y="150" width="200" height="300" fill="none" stroke="black" stroke-width="4"/>
      <circle cx="200" cy="250" r="30" fill="none" stroke="black" stroke-width="4"/>
      <line x1="150" y1="400" x2="250" y2="400" stroke="black" stroke-width="4"/>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(originalPath);

  console.log('✓ Test image created at:', originalPath);
  return originalPath;
}

async function testPipeline() {
  console.log('\n🧪 Testing Fabrica Processing Pipeline\n');

  try {
    // Create test image
    const originalPath = await createTestImage();

    // Import processing functions
    const { preprocessImage } = require('../lib/processing/preprocess');
    const { generateLineArt } = require('../lib/processing/lineart');
    const { vectorizeToSVG } = require('../lib/processing/vectorize');
    const { normalizeSVG } = require('../lib/processing/normalize');

    const testDir = '/tmp/fabrica/test-pipeline';

    // Step 1: Preprocess
    console.log('Step 1: Preprocessing...');
    const preprocessedPath = path.join(testDir, 'preprocessed.png');
    await preprocessImage(originalPath, preprocessedPath);
    console.log('✓ Preprocess complete\n');

    // Step 2: Line Art
    console.log('Step 2: Generating line art...');
    const lineartPath = path.join(testDir, 'lineart.png');
    await generateLineArt(preprocessedPath, lineartPath);
    console.log('✓ Line art complete\n');

    // Step 3: Vectorize
    console.log('Step 3: Vectorizing to SVG...');
    const rawSvgPath = path.join(testDir, 'raw.svg');
    await vectorizeToSVG(lineartPath, rawSvgPath);
    console.log('✓ Vectorization complete\n');

    // Step 4: Normalize
    console.log('Step 4: Normalizing SVG...');
    const finalSvgPath = path.join(testDir, 'flatsketch.svg');
    normalizeSVG(rawSvgPath, finalSvgPath);
    console.log('✓ Normalization complete\n');

    // Verify final output
    const svgContent = fs.readFileSync(finalSvgPath, 'utf-8');
    
    console.log('📊 Final SVG Analysis:');
    console.log('- Size:', svgContent.length, 'bytes');
    console.log('- Contains Outline group:', svgContent.includes('<g id="Outline"'));
    console.log('- Contains Details group:', svgContent.includes('<g id="Details"'));
    console.log('- Contains Callouts group:', svgContent.includes('<g id="Callouts"'));
    console.log('- Path count:', (svgContent.match(/<path/g) || []).length);

    console.log('\n✅ Pipeline test successful!');
    console.log('\nOutput files in:', testDir);
    console.log('- original.png');
    console.log('- preprocessed.png');
    console.log('- lineart.png');
    console.log('- raw.svg');
    console.log('- flatsketch.svg ← Final output');

  } catch (error) {
    console.error('\n❌ Pipeline test failed:', error);
    process.exit(1);
  }
}

testPipeline();
