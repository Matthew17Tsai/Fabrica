-- Phase 3: Sketch generation history & API usage tracking

-- ─── sketch_generations ───────────────────────────────────────────────────────
-- One row per sketch generation attempt. Multiple rows per (project, view).
-- is_active=1 means this generation is the currently displayed one.
CREATE TABLE IF NOT EXISTS sketch_generations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  view TEXT NOT NULL,                  -- 'front' | 'back'
  generation_number INTEGER NOT NULL,  -- 1..5
  image_path TEXT NOT NULL,            -- filename within the project storage dir
  prompt_used TEXT NOT NULL,
  corrections_json TEXT NOT NULL DEFAULT '[]',  -- JSON array of correction strings applied
  generation_method TEXT NOT NULL DEFAULT 'image_to_image',  -- 'image_to_image' | 'text_to_image_fallback'
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sketch_gen_project_view
  ON sketch_generations(project_id, view);

-- ─── api_usage ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_usage (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  service TEXT NOT NULL,    -- 'recraft' | 'openai'
  operation TEXT NOT NULL,  -- 'generate_front' | 'generate_back' | 'regenerate_front' | 'vision_analysis'
  model TEXT,
  cost_usd REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_api_usage_project ON api_usage(project_id);
