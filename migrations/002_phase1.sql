-- Phase 1: Data Layer & Measurement System
-- Adds sub_type, fit, base_size, detected fields to projects
-- Creates measurements, bom_items, construction_notes tables

-- ─── projects table: new columns ──────────────────────────────────────────────
-- SQLite does not support ADD COLUMN IF NOT EXISTS, so this migration file
-- is designed to be run only once by the tracked migrate.js runner.

ALTER TABLE projects ADD COLUMN sub_type TEXT;
ALTER TABLE projects ADD COLUMN fit TEXT DEFAULT 'regular';
ALTER TABLE projects ADD COLUMN base_size TEXT DEFAULT 'M';
ALTER TABLE projects ADD COLUMN detected_color TEXT;
ALTER TABLE projects ADD COLUMN detected_material TEXT;
ALTER TABLE projects ADD COLUMN ai_analysis_json TEXT;

-- ─── measurements ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS measurements (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  measurement_id TEXT NOT NULL,    -- e.g. 'chest_width', 'body_length'
  label TEXT NOT NULL,
  value_inches REAL,               -- NULL until set (pre-filled or manual)
  tolerance REAL NOT NULL DEFAULT 0.5,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_measurements_project_mid
  ON measurements(project_id, measurement_id);

CREATE INDEX IF NOT EXISTS idx_measurements_project
  ON measurements(project_id);

-- ─── bom_items ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bom_items (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  component TEXT NOT NULL,         -- e.g. 'Body Fabric'
  material TEXT NOT NULL,
  composition TEXT NOT NULL,
  weight TEXT NOT NULL,
  supplier TEXT,
  color TEXT,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bom_project ON bom_items(project_id);

-- ─── construction_notes ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS construction_notes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  section TEXT NOT NULL,           -- e.g. 'seams', 'finishing', 'labels'
  content TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_construction_project ON construction_notes(project_id);
