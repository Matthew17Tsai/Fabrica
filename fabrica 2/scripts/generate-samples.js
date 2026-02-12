#!/usr/bin/env node

/**
 * Generate sample garment sketches for demo purposes
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const samplesDir = path.join(__dirname, '..', 'public', 'samples');

async function createHoodieSample() {
  const svg = `
    <svg width="600" height="800" xmlns="http://www.w3.org/2000/svg">
      <rect width="600" height="800" fill="white"/>
      
      <!-- Body -->
      <path d="M 150 200 Q 150 180 170 170 L 430 170 Q 450 180 450 200 L 450 600 Q 450 620 430 620 L 170 620 Q 150 620 150 600 Z" 
            fill="none" stroke="black" stroke-width="3"/>
      
      <!-- Hood -->
      <path d="M 200 170 Q 200 100 300 80 Q 400 100 400 170" 
            fill="none" stroke="black" stroke-width="3"/>
      
      <!-- Kangaroo pocket -->
      <rect x="220" y="380" width="160" height="120" rx="10" 
            fill="none" stroke="black" stroke-width="3"/>
      
      <!-- Drawstrings -->
      <line x1="270" y1="170" x2="270" y2="220" stroke="black" stroke-width="2"/>
      <line x1="330" y1="170" x2="330" y2="220" stroke="black" stroke-width="2"/>
      
      <!-- Ribbed cuffs -->
      <line x1="150" y1="580" x2="170" y2="580" stroke="black" stroke-width="2"/>
      <line x1="150" y1="590" x2="170" y2="590" stroke="black" stroke-width="2"/>
      <line x1="150" y1="600" x2="170" y2="600" stroke="black" stroke-width="2"/>
      
      <line x1="430" y1="580" x2="450" y2="580" stroke="black" stroke-width="2"/>
      <line x1="430" y1="590" x2="450" y2="590" stroke="black" stroke-width="2"/>
      <line x1="430" y1="600" x2="450" y2="600" stroke="black" stroke-width="2"/>
      
      <!-- Bottom ribbing -->
      <line x1="170" y1="610" x2="430" y2="610" stroke="black" stroke-width="2"/>
      <line x1="170" y1="615" x2="430" y2="615" stroke="black" stroke-width="2"/>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(path.join(samplesDir, 'hoodie.png'));
  
  console.log('✓ Hoodie sample created');
}

async function createSweatshirtSample() {
  const svg = `
    <svg width="600" height="800" xmlns="http://www.w3.org/2000/svg">
      <rect width="600" height="800" fill="white"/>
      
      <!-- Body -->
      <path d="M 150 250 L 450 250 L 450 600 Q 450 620 430 620 L 170 620 Q 150 620 150 600 Z" 
            fill="none" stroke="black" stroke-width="3"/>
      
      <!-- Crew neck -->
      <ellipse cx="300" cy="250" rx="50" ry="30" 
               fill="none" stroke="black" stroke-width="3"/>
      
      <!-- Sleeves -->
      <path d="M 150 250 L 100 300 L 100 480 Q 100 500 120 500 L 150 500" 
            fill="none" stroke="black" stroke-width="3"/>
      <path d="M 450 250 L 500 300 L 500 480 Q 500 500 480 500 L 450 500" 
            fill="none" stroke="black" stroke-width="3"/>
      
      <!-- Ribbed cuffs -->
      <line x1="100" y1="480" x2="120" y2="480" stroke="black" stroke-width="2"/>
      <line x1="100" y1="490" x2="120" y2="490" stroke="black" stroke-width="2"/>
      
      <line x1="480" y1="480" x2="500" y2="480" stroke="black" stroke-width="2"/>
      <line x1="480" y1="490" x2="500" y2="490" stroke="black" stroke-width="2"/>
      
      <!-- Bottom ribbing -->
      <line x1="170" y1="610" x2="430" y2="610" stroke="black" stroke-width="2"/>
      <line x1="170" y1="615" x2="430" y2="615" stroke="black" stroke-width="2"/>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(path.join(samplesDir, 'sweatshirt.png'));
  
  console.log('✓ Sweatshirt sample created');
}

async function createSweatpantsSample() {
  const svg = `
    <svg width="600" height="900" xmlns="http://www.w3.org/2000/svg">
      <rect width="600" height="900" fill="white"/>
      
      <!-- Waistband -->
      <rect x="150" y="100" width="300" height="40" 
            fill="none" stroke="black" stroke-width="3"/>
      
      <!-- Drawstring -->
      <line x1="270" y1="120" x2="250" y2="160" stroke="black" stroke-width="2"/>
      <line x1="330" y1="120" x2="350" y2="160" stroke="black" stroke-width="2"/>
      
      <!-- Left leg -->
      <path d="M 150 140 L 180 800 Q 180 820 200 820 L 280 820 Q 280 800 280 800 L 300 140" 
            fill="none" stroke="black" stroke-width="3"/>
      
      <!-- Right leg -->
      <path d="M 300 140 L 320 800 Q 320 820 340 820 L 400 820 Q 420 820 420 800 L 450 140" 
            fill="none" stroke="black" stroke-width="3"/>
      
      <!-- Ankle cuffs -->
      <line x1="200" y1="810" x2="280" y2="810" stroke="black" stroke-width="2"/>
      <line x1="200" y1="815" x2="280" y2="815" stroke="black" stroke-width="2"/>
      
      <line x1="340" y1="810" x2="400" y2="810" stroke="black" stroke-width="2"/>
      <line x1="340" y1="815" x2="400" y2="815" stroke="black" stroke-width="2"/>
      
      <!-- Pockets -->
      <path d="M 170 200 Q 190 220 170 240" fill="none" stroke="black" stroke-width="2"/>
      <path d="M 430 200 Q 410 220 430 240" fill="none" stroke="black" stroke-width="2"/>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(path.join(samplesDir, 'sweatpants.png'));
  
  console.log('✓ Sweatpants sample created');
}

async function generateSamples() {
  console.log('🎨 Generating sample garment images...\n');

  // Ensure samples directory exists
  if (!fs.existsSync(samplesDir)) {
    fs.mkdirSync(samplesDir, { recursive: true });
  }

  await createHoodieSample();
  await createSweatshirtSample();
  await createSweatpantsSample();

  console.log('\n✅ All sample images generated!');
  console.log('Location:', samplesDir);
}

generateSamples().catch(console.error);
