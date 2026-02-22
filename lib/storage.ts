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

/** Copy a file within a project directory. */
export function copyFile(projectId: string, src: string, dst: string): void {
  const dir = getProjectDir(projectId);
  fs.copyFileSync(path.join(dir, src), path.join(dir, dst));
}

/** List filenames in a project directory that start with the given prefix. */
export function listFiles(projectId: string, prefix: string): string[] {
  const dir = getProjectDir(projectId);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.startsWith(prefix))
    .sort();
}

export function deleteProjectFiles(projectId: string): void {
  const dir = getProjectDir(projectId);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** Standard filenames for project assets */
export const FILES = {
  // Uploaded photos
  PHOTO_FRONT:       'photo_front.png',
  PHOTO_BACK:        'photo_back.png',
  PHOTO_DETAIL:      'photo_detail.png',
  PHOTO_OTHER:       'photo_other.png',
  // Legacy photo name (used by Vision analysis route)
  ORIGINAL:          'original.png',
  // Uploaded flat sketches (user-provided)
  SKETCH_FRONT:      'sketch_front.png',
  SKETCH_BACK:       'sketch_back.png',
  // AI-generated flat sketches (Gemini)
  AI_SKETCH_FRONT:   'ai_sketch_front.png',
  AI_SKETCH_BACK:    'ai_sketch_back.png',
  // Tech pack exports
  TECHPACK_PDF:      'techpack.pdf',
  TECHPACK_XLSX:     'techpack.xlsx',
  TECHPACK_JSON:     'techpack.json',
} as const;

/** Filename for inspiration images by index (1 = primary photo). */
export function originalFilename(index: number): string {
  return index <= 1 ? 'original.png' : `original_${index}.png`;
}

/** Max number of inspiration images per project. */
export const MAX_INSPIRATION_IMAGES = 5;
