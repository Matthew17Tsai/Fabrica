import fs from 'fs';
import path from 'path';

const STORAGE_ROOT = '/tmp/fabrica';

export function getProjectDir(projectId: string): string {
  return path.join(STORAGE_ROOT, projectId);
}

export function ensureProjectDir(projectId: string): void {
  const dir = getProjectDir(projectId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function getFilePath(projectId: string, filename: string): string {
  return path.join(getProjectDir(projectId), filename);
}

export function fileExists(projectId: string, filename: string): boolean {
  return fs.existsSync(getFilePath(projectId, filename));
}

export function readFile(projectId: string, filename: string): Buffer {
  return fs.readFileSync(getFilePath(projectId, filename));
}

export function writeFile(projectId: string, filename: string, data: Buffer | string): void {
  ensureProjectDir(projectId);
  fs.writeFileSync(getFilePath(projectId, filename), data);
}

export function deleteProjectFiles(projectId: string): void {
  const dir = getProjectDir(projectId);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// Standard filenames
export const FILES = {
  ORIGINAL:       'original.png',
  PREPROCESSED:   'preprocessed.png',
  LINEART:        'lineart.png',
  SVG:            'flatsketch.svg',          // legacy / single-view SVG
  // Phase 3 — Recraft-generated flat sketches (front + back)
  FLAT_SVG_FRONT: 'flatsketch_front.svg',
  FLAT_SVG_BACK:  'flatsketch_back.svg',
  FLAT_PNG_FRONT: 'flatsketch_front.png',
  FLAT_PNG_BACK:  'flatsketch_back.png',
  // Tech pack exports
  TECHPACK_JSON:  'techpack.json',
  TECHPACK_PDF:   'techpack.pdf',
  TECHPACK_XLSX:  'techpack.xlsx',
} as const;
