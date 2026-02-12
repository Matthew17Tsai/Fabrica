import fs from 'fs';

/**
 * Normalize SVG: enforce consistent styling and group structure
 * @param inputPath - Path to raw SVG from potrace
 * @param outputPath - Path to save normalized SVG
 */
export function normalizeSVG(inputPath: string, outputPath: string): void {
  try {
    let svgContent = fs.readFileSync(inputPath, 'utf-8');

    // Extract viewBox and dimensions from original SVG
    const viewBoxMatch = svgContent.match(/viewBox="([^"]+)"/);
    const widthMatch = svgContent.match(/width="([^"]+)"/);
    const heightMatch = svgContent.match(/height="([^"]+)"/);

    const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 1000 1000';
    const width = widthMatch ? widthMatch[1] : '1000';
    const height = heightMatch ? heightMatch[1] : '1000';

    // Extract all path elements (handle both self-closing and regular closing tags)
    const pathMatches = svgContent.matchAll(/<path[^>]*d="([^"]+)"[^>]*(\/?>|><\/path>)/g);
    const paths = Array.from(pathMatches).map(match => match[1]);
    
    if (paths.length === 0) {
      throw new Error('No paths found in SVG - vectorization may have failed');
    }

    // Build normalized SVG with required group structure
    const normalizedSVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" 
     width="${width}" 
     height="${height}" 
     viewBox="${viewBox}">
  <defs>
    <style>
      .outline { stroke: black; fill: none; stroke-width: 2; }
      .detail { stroke: black; fill: none; stroke-width: 2; }
      .callout-dot { fill: black; }
      .callout-line { stroke: black; stroke-width: 1; fill: none; }
      .callout-text { font-family: Arial, sans-serif; font-size: 12px; fill: black; }
    </style>
  </defs>
  
  <!-- Outline group (empty for V1, can be populated later) -->
  <g id="Outline" class="outline">
  </g>
  
  <!-- Details group (all paths from vectorization) -->
  <g id="Details" class="detail">
${paths.map(d => `    <path d="${d}"/>`).join('\n')}
  </g>
  
  <!-- Callouts group (empty, user adds via editor) -->
  <g id="Callouts">
  </g>
</svg>`;

    fs.writeFileSync(outputPath, normalizedSVG);
    console.log(`✓ SVG normalized and saved to ${outputPath}`);
  } catch (error) {
    console.error('SVG normalization error:', error);
    throw new Error(`Failed to normalize SVG: ${error}`);
  }
}
