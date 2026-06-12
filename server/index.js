// server/index.js — Backend SQLite via sql.js + purge directe MySQL SnipeIT
// Lancer avec : node server/index.js
// Installer   : npm install express sql.js cors multer papaparse mysql2 dotenv

require('dotenv').config({ path: require('path').join(__dirname, '.env') })

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
  console.error('   npm install express sql.js cors multer papaparse mysql2 dotenv\n')
  process.exit(1)
}

// ── Connexion MySQL SnipeIT (optionnelle) ─────────────
let mysqlPool = null
try {
  const mysql = require('mysql2/promise')
  mysqlPool = mysql.createPool({
    host:               process.env.SNIPEIT_DB_HOST     || '127.0.0.1',
    port:               parseInt(process.env.SNIPEIT_DB_PORT || '3306'),
    user:               process.env.SNIPEIT_DB_USER     || 'snipeit',
    password:           process.env.SNIPEIT_DB_PASSWORD || '',
    database:           process.env.SNIPEIT_DB_NAME     || 'snipe_it',
    waitForConnections: true,
    connectionLimit:    5,
    // Timeout généreux pour les opérations longues
    connectTimeout:     30000,
  })
  console.log('✅ Pool MySQL SnipeIT configuré')
} catch (e) {
  console.warn('⚠ mysql2 non installé — purge MySQL désactivée.')
  console.warn('  Lancez : npm install mysql2')
}

const app    = express()
const upload = multer({ dest: path.join(__dirname, 'uploads/') })

if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true })
}

// ── SQLite ────────────────────────────────────────────
const DB_PATH = path.join(__dirname, 'newapp.db')
let db, SQL

function loadDb() {
  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH))
  } else {
    db = new SQL.Database()
  }
}

function saveDb() {
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()))
}

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
    CREATE TABLE IF NOT EXISTS ticket_couts (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      id_ticket    INTEGER NOT NULL,
      id_asset     INTEGER NOT NULL,
      id_categorie INTEGER NOT NULL,
      cout         REAL    NOT NULL
    );
    -- Initialisation par défaut si vide
    INSERT OR IGNORE INTO settings (key, value) VALUES ('kanban_colors', '{"open":"#f8f9fa","in_progress":"#fff9db","resolved":"#ebfbee"}');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('status_names',  '{"open":"Nouveau","in_progress":"En cours","resolved":"Terminé"}');
  `)
  saveDb()
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql)
  const results = []
  stmt.bind(params)
  while (stmt.step()) results.push(stmt.getAsObject())
  stmt.free()
  return results
}

function queryGet(sql, params = []) {
  return queryAll(sql, params)[0] || null
}

// ── Middleware ────────────────────────────────────────
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// ── Health check ──────────────────────────────────────
app.get('/api/health', (req, res) => {
  const row = queryGet('SELECT COUNT(*) as n FROM feuil2')
  res.json({
    status:       'ok',
    db:           DB_PATH,
    feuil2_count: row ? row.n : 0,
    mysql_ready:  !!mysqlPool,
  })
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

// ── GET /api/feuil2 ───────────────────────────────────
app.get('/api/feuil2', (req, res) => {
  try {
    const rows   = queryAll('SELECT id, data, imported_at FROM feuil2 ORDER BY id')
    const parsed = rows.map(r => {
      try   { return { _id: r.id, ...JSON.parse(r.data), imported_at: r.imported_at } }
      catch { return { _id: r.id, _raw: r.data,          imported_at: r.imported_at } }
    })
    res.json({ total: parsed.length, rows: parsed })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── POST /api/feuil2/import ───────────────────────────
app.post('/api/feuil2/import', (req, res) => {
  try {
    const rows = req.body.rows
    if (!Array.isArray(rows) || rows.length === 0)
      return res.status(400).json({ error: '"rows" doit être un tableau non vide' })

    db.run('BEGIN TRANSACTION')
    try {
      db.run('DELETE FROM feuil2')
      const stmt = db.prepare('INSERT INTO feuil2 (data) VALUES (?)')
      rows.forEach(row => stmt.run([JSON.stringify(row)]))
      stmt.free()
      db.run('INSERT OR REPLACE INTO feuil2_meta (key, value) VALUES (?, ?)',
        ['columns', Object.keys(rows[0]).join(',')])
      db.run('COMMIT')
      saveDb()
    } catch (e) { db.run('ROLLBACK'); throw e }

    res.json({ success: true, count: rows.length })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── POST /api/feuil2/csv ──────────────────────────────
app.post('/api/feuil2/csv', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' })
    const content = fs.readFileSync(req.file.path, 'utf-8')
    fs.unlinkSync(req.file.path)
    const { data, errors } = Papa.parse(content, {
      header: true, skipEmptyLines: true, encoding: 'UTF-8',
    })
    if (errors.length) console.warn('PapaParse warnings:', errors)

    db.run('BEGIN TRANSACTION')
    try {
      db.run('DELETE FROM feuil2')
      const stmt = db.prepare('INSERT INTO feuil2 (data) VALUES (?)')
      data.forEach(row => stmt.run([JSON.stringify(row)]))
      stmt.free()
      db.run('COMMIT')
      saveDb()
    } catch (e) { db.run('ROLLBACK'); throw e }

    res.json({ success: true, count: data.length })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── DELETE /api/feuil2 ────────────────────────────────
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

// ── POST /api/ticket-couts/commit — enregistrer les coûts ──
app.post('/api/ticket-couts/commit', (req, res) => {
  try {
    const { ticketId, totalCost, items } = req.body
    if (!ticketId || typeof totalCost !== 'number' || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'ticketId, totalCost et items[] requis' })
    }

    const sum = items.reduce((s, i) => s + (Number(i.cout) || 0), 0)
    if (Math.abs(sum - totalCost) > 0.01) {
      return res.status(400).json({ error: `La somme des coûts (${sum}) ne correspond pas au coût total (${totalCost})` })
    }

    db.run('BEGIN TRANSACTION')
    try {
      const stmt = db.prepare(
        'INSERT INTO ticket_couts (id_ticket, id_asset, id_categorie, cout) VALUES (?, ?, ?, ?)'
      )
      items.forEach(i => {
        stmt.run([
          Number(ticketId),
          Number(i.id_asset),
          Number(i.id_categorie),
          Number(i.cout),
        ])
      })
      stmt.free()
      db.run('COMMIT')
      saveDb()
      res.json({ success: true, count: items.length })
    } catch (e) { db.run('ROLLBACK'); throw e }
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── GET /api/ticket-couts/par-categorie — agrégation ──
app.get('/api/ticket-couts/par-categorie', (req, res) => {
  try {
    const rows = queryAll(
      `SELECT id_categorie, SUM(cout) as total
       FROM ticket_couts
       GROUP BY id_categorie`
    )
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── GET /api/ticket-couts — toutes les lignes ──────────
app.get('/api/ticket-couts', (req, res) => {
  try {
    res.json(queryAll(
      'SELECT * FROM ticket_couts ORDER BY id DESC'
    ))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── DELETE /api/reset ─────────────────────────────────
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

// ── DELETE /api/snipeit-purge — purge directe MySQL ───
// Stratégie : PAS de transaction globale car ALTER TABLE fait un commit implicite
// en MySQL/MariaDB — on opère directement connexion par connexion.
app.delete('/api/snipeit-purge', async (req, res) => {
  if (!mysqlPool) {
    return res.status(503).json({
      error: 'mysql2 non installé ou non configuré.',
      hint:  'Lancez : npm install mysql2  puis configurez server/.env',
    })
  }

  const results = {}
  const errors  = []
  let conn

  // Tables à vider (DML pur — DELETE, pas DDL)
  // Séparées des ALTER TABLE pour éviter le commit implicite dans la transaction
  const tables = [
    { table: 'asset_logs',        label: 'Logs assets'       },
    { table: 'action_logs',       label: 'Logs actions'      },
    { table: 'checkout_requests', label: 'Demandes checkout' },
    { table: 'assets',            label: 'Assets'            },
    { table: 'models',            label: 'Modèles'           },
    { table: 'categories',        label: 'Catégories'        },
    { table: 'manufacturers',     label: 'Fabricants'        },
    { table: 'suppliers',         label: 'Fournisseurs'      },
    { table: 'locations',         label: 'Localisations'     },
    { table: 'status_labels',     label: 'Statuts'           },
    { table: 'departments',       label: 'Départements'      },
    { table: 'companies',         label: 'Entreprises'       },
    // users traité séparément pour protéger les superusers
  ]

  // Tables dont on remet l'auto_increment (DDL — hors transaction)
  const resetAI = [
    'assets', 'models', 'categories', 'manufacturers',
    'locations', 'status_labels', 'departments', 'companies',
  ]

  try {
    conn = await mysqlPool.getConnection()

    // ── Phase 1 : DELETE dans une transaction ─────────
    await conn.beginTransaction()
    await conn.execute('SET FOREIGN_KEY_CHECKS = 0')

    for (const { table, label } of tables) {
      try {
        // Vérifier l'existence de la table
        const [exists] = await conn.execute(
          `SELECT COUNT(*) as n FROM information_schema.tables
           WHERE table_schema = DATABASE() AND table_name = ?`, [table]
        )
        if (!exists[0]?.n) {
          results[label] = { skipped: true, reason: 'table absente' }
          continue
        }

        const [countRes] = await conn.execute(`SELECT COUNT(*) as n FROM \`${table}\``)
        const total      = countRes[0]?.n ?? 0
        const [delRes]   = await conn.execute(`DELETE FROM \`${table}\``)

        results[label] = { total, deleted: delRes.affectedRows, errors: 0 }
      } catch (e) {
        errors.push(`${label} : ${e.message}`)
        results[label] = { total: 0, deleted: 0, errors: 1, detail: e.message }
      }
    }

    // ── Utilisateurs : protéger les superusers ─────────
    try {
      const [allUsers]   = await conn.execute(`SELECT COUNT(*) as n FROM \`users\``)
      const [superUsers] = await conn.execute(
        `SELECT COUNT(*) as n FROM \`users\`
         WHERE JSON_UNQUOTE(JSON_EXTRACT(permissions, '$.superuser')) = '1'`
      )
      const [delRes] = await conn.execute(
        `DELETE FROM \`users\`
         WHERE JSON_UNQUOTE(JSON_EXTRACT(permissions, '$.superuser')) != '1'
            OR permissions IS NULL
            OR permissions = ''`
      )
      results['Utilisateurs'] = {
        total:     allUsers[0]?.n ?? 0,
        deleted:   delRes.affectedRows,
        protected: superUsers[0]?.n ?? 0,
        errors:    0,
      }
    } catch (e) {
      errors.push(`Utilisateurs : ${e.message}`)
      results['Utilisateurs'] = { total: 0, deleted: 0, errors: 1, detail: e.message }
    }

    await conn.execute('SET FOREIGN_KEY_CHECKS = 1')
    await conn.commit()  // commit uniquement les DELETE (DML)

    // ── Phase 2 : ALTER TABLE hors transaction ─────────
    // ALTER TABLE provoque un commit implicite — on les exécute APRÈS
    // le commit explicite pour éviter tout conflit d'état.
    for (const table of resetAI) {
      try {
        await conn.execute(`ALTER TABLE \`${table}\` AUTO_INCREMENT = 1`)
      } catch { /* ignorer si table vide — MySQL refuse le reset si des lignes existent encore */ }
    }

    console.log('✅ Purge MySQL SnipeIT terminée :', results)
    res.json({ success: true, results, errors })

  } catch (e) {
    if (conn) {
      try {
        await conn.execute('SET FOREIGN_KEY_CHECKS = 1')
        await conn.rollback()
      } catch { /* ignorer */ }
    }
    console.error('❌ Erreur purge MySQL :', e.message)
    res.status(500).json({ error: e.message, results, errors })
  } finally {
    if (conn) conn.release()
  }
})

// ── Démarrage ─────────────────────────────────────────
const PORT = process.env.PORT || 3001

initSqlJs().then(SqlJs => {
  SQL = SqlJs
  loadDb()
  initTables()

  const count = queryGet('SELECT COUNT(*) as n FROM feuil2')

  app.listen(PORT, () => {
    console.log(`\n✅ Backend démarré`)
    console.log(`   URL      : http://localhost:${PORT}`)
    console.log(`   SQLite   : ${DB_PATH}`)
    console.log(`   MySQL    : ${mysqlPool ? '✅ connecté' : '⚠ non configuré'}`)
    console.log(`   Lignes   : ${count ? count.n : 0} enregistrements\n`)
  })
}).catch(err => {
  console.error('❌ Erreur initialisation sql.js :', err)
  process.exit(1)
})