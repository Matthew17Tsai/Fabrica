import Database from 'better-sqlite3';
import path from 'path';
import { nanoid } from 'nanoid';

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

// ─── Shared types ─────────────────────────────────────────────────────────────

export type SubType =
  | 'oversized_hoodie'
  | 'pullover_hoodie'
  | 'zip_hoodie'
  | 'unisex_hoodie'
  | 'crewneck'
  | 'sweatpants';

export type FitType = 'oversized' | 'regular' | 'slim';
export type BaseSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';
export type WizardStepStatus = 'not_started' | 'unconfirmed' | 'confirmed';

export interface CostSettings {
  cmt: number;           // CMT labor per unit (USD)
  overhead_pct: number;  // overhead as percent of (materials + cmt)
  shipping: number;      // shipping per unit (USD)
  duty_pct: number;      // import duty percent of FOB
  markup_ws: number;     // wholesale markup multiplier (e.g. 2.5)
  markup_retail: number; // retail markup multiplier (e.g. 2.0)
}

// ─── Project ──────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  created_at: string;
  updated_at: string;
  style_name: string;
  style_number: string | null;
  season: string | null;
  category: 'hoodie' | 'sweatshirt' | 'sweatpants';
  sub_type: SubType | null;
  fit: FitType | null;
  base_size: BaseSize | null;
  status: 'uploaded' | 'ready' | 'error';
  error_message: string | null;
  ai_analysis_json: string | null;
  detected_color: string | null;
  detected_material: string | null;
  step_features_status: WizardStepStatus;
  step_materials_status: WizardStepStatus;
  step_pom_status: WizardStepStatus;
  step_sizerun_status: WizardStepStatus;
  step_bom_status: WizardStepStatus;
  confirmed_features_json: string | null;
  confirmed_materials_json: string | null;
  cost_settings_json: string | null;
  moq_quantity: number;
}

export function createProject(data: {
  id: string;
  style_name: string;
  style_number?: string;
  season?: string;
  category: Project['category'];
  sub_type?: SubType;
  fit?: FitType;
  base_size?: BaseSize;
}): Project {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO projects (id, created_at, updated_at, style_name, style_number, season, category, sub_type, fit, base_size, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'uploaded')
  `).run(
    data.id, now, now,
    data.style_name,
    data.style_number ?? null,
    data.season ?? null,
    data.category,
    data.sub_type ?? null,
    data.fit ?? 'regular',
    data.base_size ?? 'M',
  );

  return getProject(data.id)!;
}

export function getProject(id: string): Project | null {
  const db = getDb();
  return db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project | undefined ?? null;
}

export function listProjects(): Project[] {
  const db = getDb();
  return db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all() as Project[];
}

export function deleteProject(id: string): void {
  const db = getDb();
  // Foreign key cascade handles assets, bom_items, measurements, size_run, construction_notes
  db.prepare('DELETE FROM projects WHERE id = ?').run(id);
}

export function updateProjectStatus(id: string, status: Project['status'], error_message?: string): void {
  const db = getDb();
  db.prepare(`UPDATE projects SET status = ?, error_message = ?, updated_at = ? WHERE id = ?`)
    .run(status, error_message ?? null, new Date().toISOString(), id);
}

export function updateProjectAnalysis(id: string, fields: {
  sub_type?: SubType;
  fit?: FitType;
  detected_color?: string;
  detected_material?: string;
  ai_analysis_json?: string;
}): void {
  const db = getDb();
  const parts: string[] = ['updated_at = ?'];
  const values: unknown[] = [new Date().toISOString()];

  if (fields.sub_type !== undefined)         { parts.push('sub_type = ?');          values.push(fields.sub_type); }
  if (fields.fit !== undefined)              { parts.push('fit = ?');               values.push(fields.fit); }
  if (fields.detected_color !== undefined)   { parts.push('detected_color = ?');    values.push(fields.detected_color); }
  if (fields.detected_material !== undefined){ parts.push('detected_material = ?'); values.push(fields.detected_material); }
  if (fields.ai_analysis_json !== undefined) { parts.push('ai_analysis_json = ?');  values.push(fields.ai_analysis_json); }

  values.push(id);
  db.prepare(`UPDATE projects SET ${parts.join(', ')} WHERE id = ?`).run(...values);
}

export function updateProjectWizardStatus(
  id: string,
  step: 'features' | 'materials' | 'pom' | 'sizerun' | 'bom',
  status: WizardStepStatus,
): void {
  const db = getDb();
  const col = `step_${step}_status`;
  db.prepare(`UPDATE projects SET ${col} = ?, updated_at = ? WHERE id = ?`)
    .run(status, new Date().toISOString(), id);
}

export function updateProjectFeatures(id: string, featuresJson: string): void {
  const db = getDb();
  db.prepare(`UPDATE projects SET confirmed_features_json = ?, step_features_status = 'confirmed', updated_at = ? WHERE id = ?`)
    .run(featuresJson, new Date().toISOString(), id);
}

export function updateProjectMaterials(id: string, materialsJson: string): void {
  const db = getDb();
  db.prepare(`UPDATE projects SET confirmed_materials_json = ?, step_materials_status = 'confirmed', updated_at = ? WHERE id = ?`)
    .run(materialsJson, new Date().toISOString(), id);
}

export function updateProjectCostSettings(id: string, settings: CostSettings): void {
  const db = getDb();
  db.prepare(`UPDATE projects SET cost_settings_json = ?, step_bom_status = 'confirmed', updated_at = ? WHERE id = ?`)
    .run(JSON.stringify(settings), new Date().toISOString(), id);
}

export function getProjectCostSettings(id: string): CostSettings {
  const project = getProject(id);
  if (project?.cost_settings_json) {
    try { return JSON.parse(project.cost_settings_json) as CostSettings; } catch { /* fallthrough */ }
  }
  // Default settings
  return { cmt: 4.00, overhead_pct: 12, shipping: 0.80, duty_pct: 16.5, markup_ws: 2.5, markup_retail: 2.0 };
}

// ─── Assets ───────────────────────────────────────────────────────────────────

export interface Asset {
  id: string;
  project_id: string;
  asset_type: 'photo_front' | 'photo_back' | 'photo_detail' | 'photo_other' | 'sketch_front' | 'sketch_back' | 'ai_sketch_front' | 'ai_sketch_back';
  file_path: string;
  original_filename: string | null;
  mime_type: string | null;
  created_at: string;
}

export function createAsset(data: Omit<Asset, 'created_at'>): Asset {
  const db = getDb();
  const created_at = new Date().toISOString();
  db.prepare(`
    INSERT INTO assets (id, project_id, asset_type, file_path, original_filename, mime_type, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(data.id, data.project_id, data.asset_type, data.file_path, data.original_filename ?? null, data.mime_type ?? null, created_at);
  return { ...data, created_at };
}

export function getAssetsByProject(projectId: string): Asset[] {
  const db = getDb();
  return db.prepare('SELECT * FROM assets WHERE project_id = ? ORDER BY created_at').all(projectId) as Asset[];
}

export function getAssetByType(projectId: string, assetType: Asset['asset_type']): Asset | null {
  const db = getDb();
  return db.prepare('SELECT * FROM assets WHERE project_id = ? AND asset_type = ? ORDER BY created_at DESC LIMIT 1')
    .get(projectId, assetType) as Asset | undefined ?? null;
}

export function deleteAsset(id: string): void {
  const db = getDb();
  db.prepare('DELETE FROM assets WHERE id = ?').run(id);
}

// ─── BOM Items ────────────────────────────────────────────────────────────────

export type BomCategory = 'fabric' | 'trim' | 'label' | 'packaging' | 'thread';

export interface BomItem {
  id: string;
  project_id: string;
  category: BomCategory;
  component: string;
  material: string;
  composition: string;
  specification: string | null;
  notes: string | null;
  unit_price: number;
  unit: string;           // 'yard' | 'piece' | 'gram'
  consumption: number;
  wastage: number;        // percent
  total_cost: number;     // computed
  price_source: string;
  sort_order: number;
}

function computeBomItemTotalCost(item: Pick<BomItem, 'unit_price' | 'consumption' | 'wastage'>): number {
  return item.unit_price * item.consumption * (1 + item.wastage / 100);
}

export function getBomItems(projectId: string): BomItem[] {
  const db = getDb();
  return db.prepare('SELECT * FROM bom_items WHERE project_id = ? ORDER BY sort_order').all(projectId) as BomItem[];
}

export function replaceBomItems(projectId: string, items: Omit<BomItem, 'id' | 'project_id' | 'total_cost' | 'sort_order'>[]): BomItem[] {
  const db = getDb();

  const replace = db.transaction(() => {
    db.prepare('DELETE FROM bom_items WHERE project_id = ?').run(projectId);
    const inserted: BomItem[] = [];
    items.forEach((item, i) => {
      const total_cost = computeBomItemTotalCost(item);
      const row: BomItem = {
        id: nanoid(),
        project_id: projectId,
        ...item,
        total_cost,
        sort_order: i,
      };
      db.prepare(`
        INSERT INTO bom_items
          (id, project_id, category, component, material, composition, specification, notes,
           unit_price, unit, consumption, wastage, total_cost, price_source, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        row.id, row.project_id, row.category, row.component, row.material,
        row.composition, row.specification ?? null, row.notes ?? null,
        row.unit_price, row.unit, row.consumption, row.wastage,
        row.total_cost, row.price_source, row.sort_order,
      );
      inserted.push(row);
    });
    return inserted;
  });

  return replace();
}

export function upsertBomItem(item: Omit<BomItem, 'total_cost'>): BomItem {
  const db = getDb();
  const total_cost = computeBomItemTotalCost(item);
  const row = { ...item, total_cost };

  db.prepare(`
    INSERT INTO bom_items
      (id, project_id, category, component, material, composition, specification, notes,
       unit_price, unit, consumption, wastage, total_cost, price_source, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      category = excluded.category,
      component = excluded.component,
      material = excluded.material,
      composition = excluded.composition,
      specification = excluded.specification,
      notes = excluded.notes,
      unit_price = excluded.unit_price,
      unit = excluded.unit,
      consumption = excluded.consumption,
      wastage = excluded.wastage,
      total_cost = excluded.total_cost,
      price_source = excluded.price_source,
      sort_order = excluded.sort_order
  `).run(
    row.id, row.project_id, row.category, row.component, row.material,
    row.composition, row.specification ?? null, row.notes ?? null,
    row.unit_price, row.unit, row.consumption, row.wastage,
    row.total_cost, row.price_source, row.sort_order,
  );

  return row;
}

export function deleteBomItem(id: string): void {
  const db = getDb();
  db.prepare('DELETE FROM bom_items WHERE id = ?').run(id);
}

// ─── Measurements ─────────────────────────────────────────────────────────────

export interface Measurement {
  id: string;
  project_id: string;
  measurement_id: string;
  label: string;
  measurement_point: string | null;
  group_name: string | null;
  base_value: number | null;
  tolerance: number;
  unit: string;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function getMeasurements(projectId: string): Measurement[] {
  const db = getDb();
  return db.prepare('SELECT * FROM measurements WHERE project_id = ? ORDER BY sort_order').all(projectId) as Measurement[];
}

export function upsertMeasurement(data: Omit<Measurement, 'created_at' | 'updated_at'>): void {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO measurements
      (id, project_id, measurement_id, label, measurement_point, group_name, base_value, tolerance, unit, notes, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(project_id, measurement_id) DO UPDATE SET
      label             = excluded.label,
      measurement_point = excluded.measurement_point,
      group_name        = excluded.group_name,
      base_value        = excluded.base_value,
      tolerance         = excluded.tolerance,
      unit              = excluded.unit,
      notes             = excluded.notes,
      sort_order        = excluded.sort_order,
      updated_at        = excluded.updated_at
  `).run(
    data.id, data.project_id, data.measurement_id, data.label,
    data.measurement_point ?? null, data.group_name,
    data.base_value ?? null, data.tolerance, data.unit,
    data.notes ?? null, data.sort_order, now, now,
  );
}

export function deleteMeasurements(projectId: string): void {
  const db = getDb();
  db.prepare('DELETE FROM measurements WHERE project_id = ?').run(projectId);
}

// ─── Size Run ─────────────────────────────────────────────────────────────────

export interface SizeRunRow {
  id: string;
  project_id: string;
  measurement_id: string;
  size_label: string;
  value: number;
  is_base_size: number;    // 1 | 0
  is_user_override: number; // 1 | 0
}

export function getSizeRun(projectId: string): SizeRunRow[] {
  const db = getDb();
  return db.prepare('SELECT * FROM size_run WHERE project_id = ? ORDER BY measurement_id, size_label').all(projectId) as SizeRunRow[];
}

export function replaceSizeRun(projectId: string, rows: Omit<SizeRunRow, 'id' | 'project_id'>[]): SizeRunRow[] {
  const db = getDb();

  const replace = db.transaction(() => {
    db.prepare('DELETE FROM size_run WHERE project_id = ?').run(projectId);
    const inserted: SizeRunRow[] = [];
    for (const row of rows) {
      const full: SizeRunRow = { id: nanoid(), project_id: projectId, ...row };
      db.prepare(`
        INSERT INTO size_run (id, project_id, measurement_id, size_label, value, is_base_size, is_user_override)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(full.id, full.project_id, full.measurement_id, full.size_label, full.value, full.is_base_size, full.is_user_override);
      inserted.push(full);
    }
    return inserted;
  });

  return replace();
}

export function updateSizeRunCell(
  projectId: string,
  measurementId: string,
  sizeLabel: string,
  value: number,
): void {
  const db = getDb();
  db.prepare(`
    UPDATE size_run SET value = ?, is_user_override = 1
    WHERE project_id = ? AND measurement_id = ? AND size_label = ?
  `).run(value, projectId, measurementId, sizeLabel);
}

// ─── Construction Notes ───────────────────────────────────────────────────────

export interface ConstructionNote {
  id: string;
  project_id: string;
  section: string;
  content: string;
  sort_order: number;
}

export function getConstructionNotes(projectId: string): ConstructionNote[] {
  const db = getDb();
  return db.prepare('SELECT * FROM construction_notes WHERE project_id = ? ORDER BY sort_order').all(projectId) as ConstructionNote[];
}

export function replaceConstructionNotes(
  projectId: string,
  notes: Omit<ConstructionNote, 'id' | 'project_id' | 'sort_order'>[],
): ConstructionNote[] {
  const db = getDb();

  const replace = db.transaction(() => {
    db.prepare('DELETE FROM construction_notes WHERE project_id = ?').run(projectId);
    const inserted: ConstructionNote[] = [];
    notes.forEach((note, i) => {
      const row: ConstructionNote = { id: nanoid(), project_id: projectId, ...note, sort_order: i };
      db.prepare('INSERT INTO construction_notes (id, project_id, section, content, sort_order) VALUES (?, ?, ?, ?, ?)')
        .run(row.id, row.project_id, row.section, row.content, row.sort_order);
      inserted.push(row);
    });
    return inserted;
  });

  return replace();
}

// ─── API Usage ────────────────────────────────────────────────────────────────

export function logApiUsage(
  projectId: string | null,
  service: string,
  operation: string,
  model: string | null,
  costUsd: number,
): void {
  const db = getDb();
  db.prepare(`INSERT INTO api_usage (id, project_id, service, operation, model, cost_usd) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(nanoid(), projectId, service, operation, model, costUsd);
}

export function getApiUsageSummary(): { service: string; operation: string; count: number; total_cost: number }[] {
  const db = getDb();
  return db.prepare(`
    SELECT service, operation, COUNT(*) as count, ROUND(SUM(cost_usd), 4) as total_cost
    FROM api_usage
    GROUP BY service, operation
    ORDER BY total_cost DESC
  `).all() as { service: string; operation: string; count: number; total_cost: number }[];
}
