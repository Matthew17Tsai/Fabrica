-- Migration 004: Wizard schema (full reset)
-- Drops all previous tables and recreates with the new wizard-oriented schema.
-- Run via: npm run setup  (which calls migrate.js with --reset flag)

-- ── Drop old tables ──────────────────────────────────────────────────────────
DROP TABLE IF EXISTS sketch_generations;
DROP TABLE IF EXISTS techpacks;
DROP TABLE IF EXISTS jobs;
DROP TABLE IF EXISTS construction_notes;
DROP TABLE IF EXISTS bom_items;
DROP TABLE IF EXISTS measurements;
DROP TABLE IF EXISTS size_run;
DROP TABLE IF EXISTS assets;
DROP TABLE IF EXISTS api_usage;
DROP TABLE IF EXISTS projects;

-- ── Projects ──────────────────────────────────────────────────────────────────
CREATE TABLE projects (
  id                      TEXT PRIMARY KEY,
  created_at              TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at              TEXT NOT NULL DEFAULT (datetime('now')),

  -- Identity
  style_name              TEXT NOT NULL DEFAULT '',
  style_number            TEXT,
  season                  TEXT,
  category                TEXT NOT NULL DEFAULT 'hoodie',  -- 'hoodie' | 'sweatshirt' | 'sweatpants'
  sub_type                TEXT,  -- 'oversized_hoodie' | 'pullover_hoodie' | 'zip_hoodie' | 'unisex_hoodie' | 'crewneck' | 'sweatpants'
  fit                     TEXT DEFAULT 'regular',          -- 'oversized' | 'regular' | 'slim'
  base_size               TEXT DEFAULT 'M',                -- 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL'

  -- Status
  status                  TEXT NOT NULL DEFAULT 'uploaded', -- 'uploaded' | 'ready' | 'error'
  error_message           TEXT,

  -- AI analysis
  ai_analysis_json        TEXT,
  detected_color          TEXT,
  detected_material       TEXT,

  -- Wizard step statuses
  step_features_status    TEXT NOT NULL DEFAULT 'unconfirmed',  -- 'unconfirmed' | 'confirmed'
  step_materials_status   TEXT NOT NULL DEFAULT 'unconfirmed',
  step_pom_status         TEXT NOT NULL DEFAULT 'unconfirmed',
  step_sizerun_status     TEXT NOT NULL DEFAULT 'not_started',  -- 'not_started' | 'confirmed'
  step_bom_status         TEXT NOT NULL DEFAULT 'unconfirmed',

  -- Wizard confirmed data (JSON blobs)
  confirmed_features_json TEXT,   -- { hasHood, hasDrawcord, hasZipper, hasPockets, ... }
  confirmed_materials_json TEXT,  -- { bodyFabric: {...}, ribFabric: {...} }

  -- Cost settings (user overrides)
  cost_settings_json      TEXT,   -- { cmt, overhead_pct, shipping, duty_pct, markup_ws, markup_retail }
  moq_quantity            INTEGER NOT NULL DEFAULT 500
);

-- ── Assets ────────────────────────────────────────────────────────────────────
CREATE TABLE assets (
  id               TEXT PRIMARY KEY,
  project_id       TEXT NOT NULL,
  asset_type       TEXT NOT NULL,  -- 'photo_front' | 'photo_back' | 'photo_detail' | 'sketch_front' | 'sketch_back'
  file_path        TEXT NOT NULL,
  original_filename TEXT,
  mime_type        TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- ── BOM Items ─────────────────────────────────────────────────────────────────
CREATE TABLE bom_items (
  id             TEXT PRIMARY KEY,
  project_id     TEXT NOT NULL,
  category       TEXT NOT NULL DEFAULT 'fabric',  -- 'fabric' | 'trim' | 'label' | 'packaging' | 'thread'
  component      TEXT NOT NULL,
  material       TEXT NOT NULL DEFAULT '',
  composition    TEXT NOT NULL DEFAULT '',
  specification  TEXT,
  notes          TEXT,
  unit_price     REAL NOT NULL DEFAULT 0,
  unit           TEXT NOT NULL DEFAULT 'piece',   -- 'yard' | 'piece' | 'gram'
  consumption    REAL NOT NULL DEFAULT 1,
  wastage        REAL NOT NULL DEFAULT 0,          -- percent (12 = 12%)
  total_cost     REAL NOT NULL DEFAULT 0,          -- computed: unit_price × consumption × (1 + wastage/100)
  price_source   TEXT NOT NULL DEFAULT 'default_asia',
  sort_order     INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- ── Measurements ─────────────────────────────────────────────────────────────
CREATE TABLE measurements (
  id                TEXT PRIMARY KEY,
  project_id        TEXT NOT NULL,
  measurement_id    TEXT NOT NULL,   -- stable key e.g. 'body_length'
  label             TEXT NOT NULL,   -- display name e.g. 'Body Length'
  measurement_point TEXT,            -- callout description e.g. 'HPS to hem'
  group_name        TEXT NOT NULL DEFAULT 'body',  -- 'body' | 'sleeve' | 'hood' | 'pocket' | 'zipper' | 'drawcord'
  base_value        REAL,            -- base size measurement
  tolerance         REAL NOT NULL DEFAULT 0.5,
  unit              TEXT NOT NULL DEFAULT 'inches',
  notes             TEXT,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (project_id, measurement_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- ── Size Run ──────────────────────────────────────────────────────────────────
CREATE TABLE size_run (
  id               TEXT PRIMARY KEY,
  project_id       TEXT NOT NULL,
  measurement_id   TEXT NOT NULL,    -- references measurements.measurement_id
  size_label       TEXT NOT NULL,    -- 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL'
  value            REAL NOT NULL,
  is_base_size     INTEGER NOT NULL DEFAULT 0,
  is_user_override INTEGER NOT NULL DEFAULT 0,
  UNIQUE (project_id, measurement_id, size_label),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- ── Construction Notes ────────────────────────────────────────────────────────
CREATE TABLE construction_notes (
  id         TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  section    TEXT NOT NULL,
  content    TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- ── API Usage ─────────────────────────────────────────────────────────────────
CREATE TABLE api_usage (
  id         TEXT PRIMARY KEY,
  project_id TEXT,
  service    TEXT NOT NULL,    -- 'openai'
  operation  TEXT NOT NULL,    -- 'vision_analysis'
  model      TEXT,
  cost_usd   REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Indices ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_assets_project     ON assets(project_id);
CREATE INDEX IF NOT EXISTS idx_bom_project        ON bom_items(project_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_measurements_proj  ON measurements(project_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_sizerun_proj       ON size_run(project_id, measurement_id);
CREATE INDEX IF NOT EXISTS idx_construction_proj  ON construction_notes(project_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_api_usage_proj     ON api_usage(project_id);
