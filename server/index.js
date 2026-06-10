// server/index.js — Backend SQLite via sql.js (pur JavaScript, sans compilation native)
// Lancer avec : node server/index.js
// Installer   : npm install express sql.js cors multer papaparse

const express  = require('express')
const cors     = require('cors')
const path     = require('path')
const fs       = require('fs')
const multer   = require('multer')
const Papa     = require('papaparse')

let initSqlJs
try {
  initSqlJs = require('sql.js')
} catch (e) {
  console.error('\n❌ sql.js non installé. Lancez :')
  console.error('   npm install express sql.js cors multer papaparse\n')
  process.exit(1)
}

const app    = express()
const upload = multer({ dest: path.join(__dirname, 'uploads/') })

// Créer le dossier uploads si absent
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true })
}

// ── Chemins ───────────────────────────────────────────
const DB_PATH = path.join(__dirname, 'newapp.db')

// ── Helpers : charger / sauvegarder la base sur disque ─
let db   // instance sql.js Database (en mémoire)
let SQL  // instance initSqlJs

function loadDb() {
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }
}

// Persister la base en mémoire → fichier .db sur disque
function saveDb() {
  const data = db.export()           // Uint8Array
  const buf  = Buffer.from(data)
  fs.writeFileSync(DB_PATH, buf)
}

// ── Initialisation des tables ─────────────────────────
function initTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS feuil2 (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      data        TEXT    NOT NULL,
      imported_at TEXT    DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS feuil2_meta (
      key   TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );

    -- Initialisation par défaut si vide
    INSERT OR IGNORE INTO settings (key, value) VALUES ('kanban_colors', '{"open":"#f8f9fa","in_progress":"#fff9db","resolved":"#ebfbee"}');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('status_names', '{"open":"Nouveau","in_progress":"En cours","resolved":"Terminé"}');
  `)
  saveDb()
}

// ── Helper : exécuter un SELECT et retourner des objets ─
function queryAll(sql, params = []) {
  const stmt    = db.prepare(sql)
  const results = []
  stmt.bind(params)
  while (stmt.step()) {
    results.push(stmt.getAsObject())
  }
  stmt.free()
  return results
}

function queryGet(sql, params = []) {
  const rows = queryAll(sql, params)
  return rows[0] || null
}

// ── Middleware ────────────────────────────────────────
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// ── Health check ──────────────────────────────────────
app.get('/api/health', (req, res) => {
  const row = queryGet('SELECT COUNT(*) as n FROM feuil2')
  res.json({ status: 'ok', db: DB_PATH, feuil2_count: row ? row.n : 0 })
})

// ── GET /api/settings — lire tous les réglages ────────
app.get('/api/settings', (req, res) => {
  try {
    const rows = queryAll('SELECT key, value FROM settings')
    const settings = {}
    rows.forEach(r => {
      try { settings[r.key] = JSON.parse(r.value) }
      catch { settings[r.key] = r.value }
    })
    res.json(settings)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── POST /api/settings — mettre à jour un réglage ─────
app.post('/api/settings', (req, res) => {
  try {
    const { key, value } = req.body
    if (!key) return res.status(400).json({ error: 'Clé manquante' })
    
    const valStr = typeof value === 'object' ? JSON.stringify(value) : String(value)
    
    db.run(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [key, valStr]
    )
    saveDb()
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── GET /api/feuil2 — lire toutes les lignes ──────────
app.get('/api/feuil2', (req, res) => {
  try {
    const rows   = queryAll('SELECT id, data, imported_at FROM feuil2 ORDER BY id')
    const parsed = rows.map(r => {
      try   { return { _id: r.id, ...JSON.parse(r.data), imported_at: r.imported_at } }
      catch { return { _id: r.id, _raw: r.data, imported_at: r.imported_at } }
    })
    res.json({ total: parsed.length, rows: parsed })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── POST /api/feuil2/import — importer un tableau JSON ─
app.post('/api/feuil2/import', (req, res) => {
  try {
    const rows = req.body.rows
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: '"rows" doit être un tableau non vide' })
    }

    // Vider puis réinsérer dans une transaction
    db.run('BEGIN TRANSACTION')
    try {
      db.run('DELETE FROM feuil2')
      const stmt = db.prepare('INSERT INTO feuil2 (data) VALUES (?)')
      rows.forEach(row => {
        stmt.run([JSON.stringify(row)])
      })
      stmt.free()

      // Sauvegarder les colonnes détectées en meta
      const cols = Object.keys(rows[0]).join(',')
      db.run(
        'INSERT OR REPLACE INTO feuil2_meta (key, value) VALUES (?, ?)',
        ['columns', cols]
      )

      db.run('COMMIT')
      saveDb()  // persister sur disque
    } catch (e) {
      db.run('ROLLBACK')
      throw e
    }

    res.json({ success: true, count: rows.length })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── POST /api/feuil2/csv — upload CSV direct ──────────
app.post('/api/feuil2/csv', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' })

    const content = fs.readFileSync(req.file.path, 'utf-8')
    fs.unlinkSync(req.file.path) // nettoyer

    const { data, errors } = Papa.parse(content, {
      header:         true,
      skipEmptyLines: true,
      encoding:       'UTF-8',
    })

    if (errors.length) console.warn('PapaParse warnings:', errors)

    db.run('BEGIN TRANSACTION')
    try {
      db.run('DELETE FROM feuil2')
      const stmt = db.prepare('INSERT INTO feuil2 (data) VALUES (?)')
      data.forEach(row => stmt.run([JSON.stringify(row)]))
      stmt.free()
      db.run('COMMIT')
      saveDb()  // persister sur disque
    } catch (e) {
      db.run('ROLLBACK')
      throw e
    }

    res.json({ success: true, count: data.length })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── DELETE /api/feuil2 — vider la table ───────────────
app.delete('/api/feuil2', (req, res) => {
  try {
    db.run('DELETE FROM feuil2')
    db.run('DELETE FROM feuil2_meta')
    saveDb()
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── DELETE /api/reset — reset global ─────────────────
app.delete('/api/reset', (req, res) => {
  try {
    db.run('DELETE FROM feuil2')
    db.run('DELETE FROM feuil2_meta')
    saveDb()
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── Démarrage (sql.js est async) ──────────────────────
const PORT = process.env.PORT || 3001

initSqlJs().then(SqlJs => {
  SQL = SqlJs
  loadDb()
  initTables()

  const count = queryGet('SELECT COUNT(*) as n FROM feuil2')

  app.listen(PORT, () => {
    console.log(`\n✅ Backend SQLite (sql.js) démarré`)
    console.log(`   URL      : http://localhost:${PORT}`)
    console.log(`   Base     : ${DB_PATH}`)
    console.log(`   Lignes   : ${count ? count.n : 0} enregistrements\n`)
  })
}).catch(err => {
  console.error('❌ Erreur initialisation sql.js :', err)
  process.exit(1)
})
