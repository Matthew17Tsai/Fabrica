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

// ─── Projects ────────────────────────────────────────────────────────────────

export type SubType =
  | 'oversized_hoodie'
  | 'pullover_hoodie'
  | 'zip_hoodie'
  | 'unisex_hoodie'
  | 'crewneck'
  | 'sweatpants';

export type FitType = 'oversized' | 'regular' | 'slim';
export type BaseSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';

export interface Project {
  id: string;
  created_at: string;
  title: string;
  category: 'hoodie' | 'sweatshirt' | 'sweatpants';
  status: 'uploaded' | 'processing' | 'ready' | 'error';
  error_message: string | null;
  // Phase 1 additions
  sub_type: SubType | null;
  fit: FitType | null;
  base_size: BaseSize | null;
  detected_color: string | null;
  detected_material: string | null;
  ai_analysis_json: string | null;
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

// ─── Measurements ─────────────────────────────────────────────────────────────

export interface Measurement {
  id: string;
  project_id: string;
  measurement_id: string;
  label: string;
  value_inches: number | null;
  tolerance: number;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ─── BOM ──────────────────────────────────────────────────────────────────────

export interface BomItem {
  id: string;
  project_id: string;
  component: string;
  material: string;
  composition: string;
  weight: string;
  supplier: string | null;
  color: string | null;
  notes: string | null;
  sort_order: number;
}

// ─── Construction Notes ───────────────────────────────────────────────────────

export interface ConstructionNote {
  id: string;
  project_id: string;
  section: string;
  content: string;
  sort_order: number;
}

// ─── Project queries ──────────────────────────────────────────────────────────

export function createProject(
  data: Omit<Project, 'created_at' | 'error_message' | 'sub_type' | 'fit' | 'base_size' | 'detected_color' | 'detected_material' | 'ai_analysis_json'> & {
    sub_type?: SubType;
    fit?: FitType;
    base_size?: BaseSize;
  }
): Project {
  const db = getDb();
  const created_at = new Date().toISOString();

  db.prepare(`
    INSERT INTO projects (id, created_at, title, category, status, sub_type, fit, base_size)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.id,
    created_at,
    data.title,
    data.category,
    data.status,
    data.sub_type ?? null,
    data.fit ?? 'regular',
    data.base_size ?? 'M',
  );

  return {
    ...data,
    created_at,
    error_message: null,
    sub_type: data.sub_type ?? null,
    fit: data.fit ?? 'regular',
    base_size: data.base_size ?? 'M',
    detected_color: null,
    detected_material: null,
    ai_analysis_json: null,
  };
}

export function getProject(id: string): Project | null {
  const db = getDb();
  return db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project | undefined ?? null;
}

export function updateProjectStatus(id: string, status: Project['status'], error_message?: string): void {
  const db = getDb();
  db.prepare(`
    UPDATE projects
    SET status = ?, error_message = ?
    WHERE id = ?
  `).run(status, error_message ?? null, id);
}

export function updateProjectAnalysis(id: string, fields: {
  sub_type?: SubType;
  fit?: FitType;
  detected_color?: string;
  detected_material?: string;
  ai_analysis_json?: string;
}): void {
  const db = getDb();
  const parts: string[] = [];
  const values: unknown[] = [];

  if (fields.sub_type !== undefined)        { parts.push('sub_type = ?');          values.push(fields.sub_type); }
  if (fields.fit !== undefined)             { parts.push('fit = ?');               values.push(fields.fit); }
  if (fields.detected_color !== undefined)  { parts.push('detected_color = ?');    values.push(fields.detected_color); }
  if (fields.detected_material !== undefined){ parts.push('detected_material = ?'); values.push(fields.detected_material); }
  if (fields.ai_analysis_json !== undefined){ parts.push('ai_analysis_json = ?'); values.push(fields.ai_analysis_json); }

  if (parts.length === 0) return;
  values.push(id);
  db.prepare(`UPDATE projects SET ${parts.join(', ')} WHERE id = ?`).run(...values);
}

// ─── Asset queries ────────────────────────────────────────────────────────────

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
  return db.prepare('SELECT * FROM assets WHERE project_id = ? AND type = ?').get(projectId, type) as Asset | undefined ?? null;
}

// ─── Job queries ──────────────────────────────────────────────────────────────

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
  return db.prepare("SELECT * FROM jobs WHERE status = 'queued' ORDER BY updated_at LIMIT 1").get() as Job | undefined ?? null;
}

export function updateJob(id: string, updates: Partial<Pick<Job, 'status' | 'progress' | 'error_message'>>): void {
  const db = getDb();
  const updated_at = new Date().toISOString();

  const fields: string[] = ['updated_at = ?'];
  const values: unknown[] = [updated_at];

  if (updates.status !== undefined)        { fields.push('status = ?');        values.push(updates.status); }
  if (updates.progress !== undefined)      { fields.push('progress = ?');      values.push(updates.progress); }
  if (updates.error_message !== undefined) { fields.push('error_message = ?'); values.push(updates.error_message); }

  values.push(id);
  db.prepare(`UPDATE jobs SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

// ─── TechPack queries ─────────────────────────────────────────────────────────

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
  return db.prepare('SELECT * FROM techpacks WHERE project_id = ?').get(projectId) as TechPack | undefined ?? null;
}

// ─── Measurement queries ──────────────────────────────────────────────────────

export function getMeasurements(projectId: string): Measurement[] {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM measurements WHERE project_id = ? ORDER BY sort_order'
  ).all(projectId) as Measurement[];
}

export function upsertMeasurement(data: Omit<Measurement, 'created_at' | 'updated_at'>): void {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO measurements
      (id, project_id, measurement_id, label, value_inches, tolerance, notes, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(project_id, measurement_id) DO UPDATE SET
      label        = excluded.label,
      value_inches = excluded.value_inches,
      tolerance    = excluded.tolerance,
      notes        = excluded.notes,
      sort_order   = excluded.sort_order,
      updated_at   = excluded.updated_at
  `).run(
    data.id,
    data.project_id,
    data.measurement_id,
    data.label,
    data.value_inches ?? null,
    data.tolerance,
    data.notes ?? null,
    data.sort_order,
    now,
    now,
  );
}

export function updateMeasurementValue(
  projectId: string,
  measurementId: string,
  value_inches: number | null,
  notes?: string,
): void {
  const db = getDb();
  const updated_at = new Date().toISOString();
  db.prepare(`
    UPDATE measurements
    SET value_inches = ?, notes = COALESCE(?, notes), updated_at = ?
    WHERE project_id = ? AND measurement_id = ?
  `).run(value_inches, notes ?? null, updated_at, projectId, measurementId);
}

export function deleteMeasurements(projectId: string): void {
  const db = getDb();
  db.prepare('DELETE FROM measurements WHERE project_id = ?').run(projectId);
}

// ─── BOM queries ──────────────────────────────────────────────────────────────

export function getBomItems(projectId: string): BomItem[] {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM bom_items WHERE project_id = ? ORDER BY sort_order'
  ).all(projectId) as BomItem[];
}

export function upsertBomItem(data: BomItem): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO bom_items
      (id, project_id, component, material, composition, weight, supplier, color, notes, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      component   = excluded.component,
      material    = excluded.material,
      composition = excluded.composition,
      weight      = excluded.weight,
      supplier    = excluded.supplier,
      color       = excluded.color,
      notes       = excluded.notes,
      sort_order  = excluded.sort_order
  `).run(
    data.id, data.project_id, data.component, data.material,
    data.composition, data.weight, data.supplier ?? null,
    data.color ?? null, data.notes ?? null, data.sort_order,
  );
}

export function deleteBomItem(id: string): void {
  const db = getDb();
  db.prepare('DELETE FROM bom_items WHERE id = ?').run(id);
}

export function replaceBomItems(projectId: string, items: Omit<BomItem, 'id' | 'project_id'>[]): BomItem[] {
  const db = getDb();
  const { nanoid } = require('nanoid');

  const replace = db.transaction(() => {
    db.prepare('DELETE FROM bom_items WHERE project_id = ?').run(projectId);
    const inserted: BomItem[] = [];
    items.forEach((item, i) => {
      const row: BomItem = {
        id: nanoid(),
        project_id: projectId,
        ...item,
        sort_order: i,
      };
      db.prepare(`
        INSERT INTO bom_items
          (id, project_id, component, material, composition, weight, supplier, color, notes, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        row.id, row.project_id, row.component, row.material,
        row.composition, row.weight, row.supplier ?? null,
        row.color ?? null, row.notes ?? null, row.sort_order,
      );
      inserted.push(row);
    });
    return inserted;
  });

  return replace();
}

// ─── Construction Note queries ─────────────────────────────────────────────────

export function getConstructionNotes(projectId: string): ConstructionNote[] {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM construction_notes WHERE project_id = ? ORDER BY sort_order'
  ).all(projectId) as ConstructionNote[];
}

export function replaceConstructionNotes(
  projectId: string,
  notes: Omit<ConstructionNote, 'id' | 'project_id'>[],
): ConstructionNote[] {
  const db = getDb();
  const { nanoid } = require('nanoid');

  const replace = db.transaction(() => {
    db.prepare('DELETE FROM construction_notes WHERE project_id = ?').run(projectId);
    const inserted: ConstructionNote[] = [];
    notes.forEach((note, i) => {
      const row: ConstructionNote = {
        id: nanoid(),
        project_id: projectId,
        ...note,
        sort_order: i,
      };
      db.prepare(`
        INSERT INTO construction_notes (id, project_id, section, content, sort_order)
        VALUES (?, ?, ?, ?, ?)
      `).run(row.id, row.project_id, row.section, row.content, row.sort_order);
      inserted.push(row);
    });
    return inserted;
  });

  return replace();
}
