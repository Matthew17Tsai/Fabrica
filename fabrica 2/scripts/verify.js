#!/usr/bin/env node

console.log('🔍 Verifying Fabrica scaffold...\n');

const fs = require('fs');
const path = require('path');

const checks = [
  { name: 'package.json', path: './package.json' },
  { name: 'tsconfig.json', path: './tsconfig.json' },
  { name: 'tailwind.config.ts', path: './tailwind.config.ts' },
  { name: 'next.config.js', path: './next.config.js' },
  { name: 'Migration script', path: './scripts/migrate.js' },
  { name: 'Database schema', path: './migrations/001_initial.sql' },
  { name: 'Database lib', path: './lib/db.ts' },
  { name: 'Storage lib', path: './lib/storage.ts' },
  { name: 'Root layout', path: './app/layout.tsx' },
  { name: 'Landing page', path: './app/page.tsx' },
  { name: 'Global CSS', path: './app/globals.css' },
  { name: 'README', path: './README.md' },
];

let allGood = true;

for (const check of checks) {
  const exists = fs.existsSync(path.join(__dirname, '..', check.path));
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${check.name}`);
  if (!exists) allGood = false;
}

console.log('\n' + (allGood ? '✅ Scaffold complete!' : '❌ Some files missing'));
console.log('\nNext steps:');
console.log('1. npm install');
console.log('2. npm run migrate');
console.log('3. npm run dev');
