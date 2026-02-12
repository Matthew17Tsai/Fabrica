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
  ORIGINAL: 'original.png',
  PREPROCESSED: 'preprocessed.png',
  LINEART: 'lineart.png',
  SVG: 'flatsketch.svg',
  TECHPACK_JSON: 'techpack.json',
  TECHPACK_PDF: 'techpack.pdf',
  TECHPACK_XLSX: 'techpack.xlsx',
} as const;
