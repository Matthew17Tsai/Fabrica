const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '..', 'fabrica.db');
const migrationsDir = path.join(__dirname, '..', 'migrations');

console.log('Running migrations...');

const db = new Database(dbPath);

const migrationFiles = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

for (const file of migrationFiles) {
  console.log(`Applying ${file}...`);
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  db.exec(sql);
}

db.close();
console.log('Migrations complete!');
