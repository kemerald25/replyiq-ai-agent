-- Migration 0001_initial.sql
-- ReplyIQ D1 SQLite Database Schema

CREATE TABLE IF NOT EXISTS owners (
  id TEXT PRIMARY KEY,
  phone_number TEXT NOT NULL UNIQUE,
  display_name TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  template TEXT NOT NULL DEFAULT 'portfolio',
  status TEXT NOT NULL DEFAULT 'draft',
  current_version INTEGER NOT NULL DEFAULT 1,
  published_version INTEGER,
  suspended_reason TEXT,
  deleted_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);
CREATE INDEX IF NOT EXISTS idx_projects_deleted ON projects(deleted_at);

CREATE TABLE IF NOT EXISTS document_versions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  document_json TEXT NOT NULL,
  author_type TEXT NOT NULL,
  change_summary TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE(project_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_versions_project ON document_versions(project_id, version_number DESC);

CREATE TABLE IF NOT EXISTS publish_events (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  action TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  reason TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_publish_events_project ON publish_events(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_publish_events_action ON publish_events(project_id, action, created_at DESC);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  hash TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(owner_id, hash)
);

CREATE INDEX IF NOT EXISTS idx_assets_owner ON assets(owner_id);
CREATE INDEX IF NOT EXISTS idx_assets_hash ON assets(hash);

CREATE TABLE IF NOT EXISTS preview_tokens (
  token_hash TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_preview_tokens_project ON preview_tokens(project_id);
CREATE INDEX IF NOT EXISTS idx_preview_tokens_expires ON preview_tokens(expires_at);
