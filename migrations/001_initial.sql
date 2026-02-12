-- Initial schema for Fabrica MVP
-- Run with: node scripts/migrate.js

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('hoodie', 'sweatshirt', 'sweatpants')),
  status TEXT NOT NULL CHECK(status IN ('uploaded', 'processing', 'ready', 'error')),
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('original', 'preprocessed', 'lineart', 'svg', 'techpack_json', 'techpack_pdf', 'techpack_xlsx')),
  path TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('queued', 'running', 'done', 'error')),
  step TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  updated_at TEXT NOT NULL,
  error_message TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS techpacks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL UNIQUE,
  json_text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_assets_project ON assets(project_id);
CREATE INDEX IF NOT EXISTS idx_jobs_project ON jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_techpacks_project ON techpacks(project_id);
