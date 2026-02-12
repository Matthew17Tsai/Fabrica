import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'fabrica.db');
let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export interface Project {
  id: string;
  created_at: string;
  title: string;
  category: 'hoodie' | 'sweatshirt' | 'sweatpants';
  status: 'uploaded' | 'processing' | 'ready' | 'error';
  error_message: string | null;
}

export interface Asset {
  id: string;
  project_id: string;
  type: 'original' | 'preprocessed' | 'lineart' | 'svg' | 'techpack_json' | 'techpack_pdf' | 'techpack_xlsx';
  path: string;
  created_at: string;
}

export interface Job {
  id: string;
  project_id: string;
  status: 'queued' | 'running' | 'done' | 'error';
  step: string;
  progress: number;
  updated_at: string;
  error_message: string | null;
}

export interface TechPack {
  id: string;
  project_id: string;
  json_text: string;
  created_at: string;
}

// Project queries
export function createProject(data: Omit<Project, 'created_at' | 'error_message'>): Project {
  const db = getDb();
  const created_at = new Date().toISOString();
  
  db.prepare(`
    INSERT INTO projects (id, created_at, title, category, status)
    VALUES (?, ?, ?, ?, ?)
  `).run(data.id, created_at, data.title, data.category, data.status);
  
  return { ...data, created_at, error_message: null };
}

export function getProject(id: string): Project | null {
  const db = getDb();
  return db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project | undefined || null;
}

export function updateProjectStatus(id: string, status: Project['status'], error_message?: string): void {
  const db = getDb();
  db.prepare(`
    UPDATE projects 
    SET status = ?, error_message = ?
    WHERE id = ?
  `).run(status, error_message || null, id);
}

// Asset queries
export function createAsset(data: Omit<Asset, 'created_at'>): Asset {
  const db = getDb();
  const created_at = new Date().toISOString();
  
  db.prepare(`
    INSERT INTO assets (id, project_id, type, path, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(data.id, data.project_id, data.type, data.path, created_at);
  
  return { ...data, created_at };
}

export function getAssetsByProject(projectId: string): Asset[] {
  const db = getDb();
  return db.prepare('SELECT * FROM assets WHERE project_id = ? ORDER BY created_at').all(projectId) as Asset[];
}

export function getAssetByType(projectId: string, type: Asset['type']): Asset | null {
  const db = getDb();
  return db.prepare('SELECT * FROM assets WHERE project_id = ? AND type = ?').get(projectId, type) as Asset | undefined || null;
}

// Job queries
export function createJob(data: Omit<Job, 'updated_at' | 'error_message'>): Job {
  const db = getDb();
  const updated_at = new Date().toISOString();
  
  db.prepare(`
    INSERT INTO jobs (id, project_id, status, step, progress, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(data.id, data.project_id, data.status, data.step, data.progress, updated_at);
  
  return { ...data, updated_at, error_message: null };
}

export function getJobsByProject(projectId: string): Job[] {
  const db = getDb();
  return db.prepare('SELECT * FROM jobs WHERE project_id = ? ORDER BY updated_at DESC').all(projectId) as Job[];
}

export function getNextQueuedJob(): Job | null {
  const db = getDb();
  return db.prepare("SELECT * FROM jobs WHERE status = 'queued' ORDER BY updated_at LIMIT 1").get() as Job | undefined || null;
}

export function updateJob(id: string, updates: Partial<Pick<Job, 'status' | 'progress' | 'error_message'>>): void {
  const db = getDb();
  const updated_at = new Date().toISOString();
  
  const fields: string[] = ['updated_at = ?'];
  const values: any[] = [updated_at];
  
  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  if (updates.progress !== undefined) {
    fields.push('progress = ?');
    values.push(updates.progress);
  }
  if (updates.error_message !== undefined) {
    fields.push('error_message = ?');
    values.push(updates.error_message);
  }
  
  values.push(id);
  
  db.prepare(`UPDATE jobs SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

// TechPack queries
export function createTechPack(data: Omit<TechPack, 'created_at'>): TechPack {
  const db = getDb();
  const created_at = new Date().toISOString();
  
  db.prepare(`
    INSERT OR REPLACE INTO techpacks (id, project_id, json_text, created_at)
    VALUES (?, ?, ?, ?)
  `).run(data.id, data.project_id, data.json_text, created_at);
  
  return { ...data, created_at };
}

export function getTechPack(projectId: string): TechPack | null {
  const db = getDb();
  return db.prepare('SELECT * FROM techpacks WHERE project_id = ?').get(projectId) as TechPack | undefined || null;
}
