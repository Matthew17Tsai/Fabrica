const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '..', 'fabrica.db');
const migrationsDir = path.join(__dirname, '..', 'migrations');

console.log('Running migrations...');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = OFF');  // temporarily off during drops

// Create tracking table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS _migrations (
    filename TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  )
`);

const applied = new Set(
  db.prepare('SELECT filename FROM _migrations').all().map(r => r.filename)
);

const migrationFiles = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

for (const file of migrationFiles) {
  if (applied.has(file)) {
    console.log(`Skipping ${file} (already applied)`);
    continue;
  }

  console.log(`Applying ${file}...`);
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  db.exec(sql);
  db.prepare('INSERT INTO _migrations (filename, applied_at) VALUES (?, ?)').run(
    file,
    new Date().toISOString()
  );
  console.log(`  ✓ ${file}`);
}

db.pragma('foreign_keys = ON');
db.close();
console.log('Migrations complete!');
