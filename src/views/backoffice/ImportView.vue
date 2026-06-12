<template>
  <div class="page fade-in">
    <div class="page-header">
      <h1 class="page-title">Import des données</h1>
      <p class="page-subtitle">Les entités dépendantes (catégories, fabricants, modèles) sont créées automatiquement dans SnipeIT</p>
    </div>

    <div v-if="globalMsg" :class="`alert alert-${globalOk ? 'success' : 'danger'} mb-6`">
      {{ globalMsg }}
    </div>

    <div class="grid-2">
      <!-- ── Feuille 1 : Assets ─────────────────────── -->
      <div class="card">
        <div class="card-header">
          <div>
            <h3>Feuille 1 — Assets</h3>
            <p class="text-muted text-sm mt-1">Import vers NewApp et/ou SnipeIT</p>
          </div>
          <span class="badge badge-blue">CSV</span>
        </div>

        <!-- Drop zone -->
        <div
          class="drop-zone"
          :class="{ 'drag-over': dragging1 }"
          @dragover.prevent="dragging1 = true"
          @dragleave="dragging1 = false"
          @drop.prevent="onDrop($event, 'assets')"
          @click="$refs.fileAssets.click()"
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <p v-if="!file1">Glissez votre CSV ici ou <span class="text-accent">cliquez</span></p>
          <p v-else class="text-green">{{ file1.name }} — {{ preview1.length }} lignes détectées</p>
          <input ref="fileAssets" type="file" accept=".csv" hidden @change="onFile($event, 'assets')" />
        </div>

        <!-- Rapport de validation -->
        <div v-if="validationReport && validationReport.hasIssues" class="validation-report mt-3">
          <div class="validation-header" @click="showValidationReport = !showValidationReport">
            <div class="flex-between">
              <div class="flex gap-2">
                <span class="badge" :class="validationReport.isValid ? 'badge-green' : 'badge-yellow'">
                  {{ validationReport.isValid ? '✓ Format valide' : '⚠️ Problèmes détectés' }}
                </span>
                <span class="text-xs text-muted">{{ validationReport.totalIssues }} issue(s)</span>
              </div>
              <span class="text-xs text-accent">{{ showValidationReport ? '▲ masquer' : '▼ détails' }}</span>
            </div>
          </div>
          
          <div v-if="showValidationReport" class="validation-details">
            <!-- Erreurs critiques -->
            <div v-if="validationReport.errors.length" class="validation-section">
              <div class="validation-title text-red">❌ Erreurs critiques</div>
              <div v-for="err in validationReport.errors" :key="err.type" class="validation-item error">
                <strong>{{ err.title }}</strong>
                <p class="text-xs mt-1">{{ err.message }}</p>
                <div v-if="err.details" class="text-xs text-muted mt-1">
                  Détails: {{ err.details.join(', ') }}
                </div>
              </div>
            </div>
            
            <!-- Avertissements -->
            <div v-if="validationReport.warnings.length" class="validation-section">
              <div class="validation-title text-yellow">⚠️ Avertissements</div>
              <div v-for="warn in validationReport.warnings" :key="warn.type" class="validation-item warning">
                <strong>{{ warn.title }}</strong>
                <p class="text-xs mt-1">{{ warn.message }}</p>
                <div v-if="warn.details && warn.details.length" class="text-xs text-muted mt-1">
                  <div v-for="detail in warn.details.slice(0, 3)" :key="detail.line">
                    • Ligne {{ detail.line }}: {{ detail.errors.join(', ') }}
                  </div>
                  <div v-if="warn.details.length > 3" class="mt-1">
                    ... et {{ warn.details.length - 3 }} autre(s) ligne(s)
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Informations -->
            <div class="validation-section">
              <div class="validation-title text-blue">ℹ️ Informations</div>
              <div class="validation-item info">
                <strong>Colonnes trouvées:</strong>
                <div class="cols-list mt-1">
                  <span class="tag" v-for="col in validationReport.foundColumns" :key="col">{{ col }}</span>
                </div>
              </div>
              <div v-if="validationReport.missingColumns.length" class="validation-item info mt-2">
                <strong>Colonnes manquantes:</strong>
                <div class="cols-list mt-1">
                  <span class="tag tag-warning" v-for="col in validationReport.missingColumns" :key="col">{{ col }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Colonnes attendues -->
        <div class="expected-cols mt-3">
          <p class="text-xs text-muted mb-2">Colonnes attendues :</p>
          <div class="cols-list">
            <span class="tag" v-for="c in assetCols" :key="c">{{ c }}</span>
          </div>
        </div>

        <!-- Aperçu -->
        <div v-if="preview1.length" class="preview-block mt-4">
          <p class="text-xs text-muted mb-2">Aperçu — 3 premières lignes</p>
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th v-for="h in previewHeaders1" :key="h">{{ h }}</th></tr>
              </thead>
              <tbody>
                <tr v-for="(row, i) in preview1.slice(0, 3)" :key="i">
                  <td v-for="k in previewHeaders1" :key="k" class="text-xs">{{ row[k] || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Progression import SnipeIT -->
        <div v-if="snipeitProgress.active" class="progress-block mt-4">
          <div class="flex-between text-xs text-muted mb-2">
            <span class="mono">{{ snipeitProgress.step }}</span>
            <span class="mono">{{ snipeitProgress.pct }}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: snipeitProgress.pct + '%' }"></div>
          </div>
        </div>

        <!-- Log détaillé -->
        <div v-if="snipeitLog.length" class="log-block mt-3">
          <div class="log-header" @click="showLog = !showLog">
            <span class="text-xs mono">Journal d'import ({{ snipeitLog.length }} entrées)</span>
            <span class="text-xs text-accent">{{ showLog ? '▲ masquer' : '▼ afficher' }}</span>
          </div>
          <div v-if="showLog" class="log-entries">
            <div
              v-for="(entry, i) in snipeitLog"
              :key="i"
              :class="`log-entry ${entry.type}`"
            >
              <span class="log-icon">{{ entry.type === 'error' ? '✕' : entry.type === 'warn' ? '!' : '✓' }}</span>
              {{ entry.msg }}
            </div>
          </div>
        </div>

        <!-- Résultat -->
        <p v-if="msg1" :class="`text-sm mt-3 ${msg1.ok ? 'text-green' : 'text-red'}`">
          {{ msg1.text }}
        </p>

        <!-- Boutons -->
        <div class="flex gap-3 mt-4 flex-wrap">
          <button class="btn btn-secondary" :disabled="!file1 || loading1" @click="importLocal">
            <span v-if="loading1 === 'local'" class="loader"></span>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
            Enregistrer en local
          </button>

          <button class="btn btn-primary" :disabled="!file1 || loading1" @click="importToSnipeIT">
            <span v-if="loading1 === 'snipeit'" class="loader"></span>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Envoyer vers SnipeIT
          </button>
        </div>

        <!-- Explication cascade -->
        <div class="cascade-info mt-4">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;color:var(--blue)"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <p class="text-xs text-muted">
            L'import SnipeIT crée automatiquement les entités manquantes dans cet ordre :
            <span class="mono text-accent">Fabricant → Catégorie → Localisation → Statut → Modèle → Asset</span>
          </p>
        </div>
      </div>

      <!-- ── Feuille 2 : SQLite ──────────────────────── -->
      <div class="card">
        <div class="card-header">
          <div>
            <h3>Feuille 2 — SQLite</h3>
            <p class="text-muted text-sm mt-1">Données locales uniquement (localStorage)</p>
          </div>
          <span class="badge badge-green">SQLite</span>
        </div>

        <div
          class="drop-zone"
          :class="{ 'drag-over': dragging2 }"
          @dragover.prevent="dragging2 = true"
          @dragleave="dragging2 = false"
          @drop.prevent="onDrop($event, 'feuil2')"
          @click="$refs.fileFeuil2.click()"
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
          <p v-if="!file2">Glissez votre CSV ici ou <span class="text-accent">cliquez</span></p>
          <p v-else class="text-green">{{ file2.name }} — {{ preview2.length }} lignes détectées</p>
          <input ref="fileFeuil2" type="file" accept=".csv" hidden @change="onFile($event, 'feuil2')" />
        </div>

        <div v-if="preview2.length" class="preview-block mt-4">
          <p class="text-xs text-muted mb-2">Aperçu — 3 premières lignes</p>
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th v-for="h in previewHeaders2" :key="h">{{ h }}</th></tr>
              </thead>
              <tbody>
                <tr v-for="(row, i) in preview2.slice(0, 3)" :key="i">
                  <td v-for="k in previewHeaders2" :key="k" class="text-xs">{{ row[k] || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="flex gap-3 mt-4">
          <button class="btn btn-success" :disabled="!file2 || loading2" @click="importFeuil2">
            <span v-if="loading2" class="loader"></span>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
            Enregistrer en SQLite
          </button>
        </div>

        <p v-if="msg2" :class="`text-sm mt-3 ${msg2.ok ? 'text-green' : 'text-red'}`">
          {{ msg2.text }}
        </p>

        <!-- Erreur backend SQLite -->
        <div v-if="db.feuil2Error" class="alert alert-danger mt-3" style="font-size:0.8rem">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg>
          {{ db.feuil2Error }}
        </div>

        <div v-if="db.feuil2.length" class="stat-mini mt-4">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          {{ db.feuil2.length }} enregistrements dans SQLite (newapp.db)
          <router-link to="/backoffice/feuil2" class="text-accent" style="margin-left:8px">Voir →</router-link>
        </div>

        <!-- Backend SQLite non disponible -->
        <div v-else-if="!db.feuil2Error" class="backend-tip mt-4">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
          <span>Backend requis : <code>node server/index.js</code></span>
        </div>
      </div>
    </div>

    <!-- Historique -->
    <div class="card mt-6">
      <div class="card-header"><h3>Historique des imports</h3></div>
      <div v-if="history.length" class="table-wrap">
        <table>
          <thead>
            <tr><th>Date</th><th>Fichier</th><th>Type</th><th>Créés</th><th>Erreurs</th><th>Statut</th></tr>
          </thead>
          <tbody>
            <tr v-for="h in history" :key="h.id">
              <td class="mono text-xs">{{ h.date }}</td>
              <td>{{ h.file }}</td>
              <td><span class="tag">{{ h.type }}</span></td>
              <td class="text-green mono">{{ h.created }}</td>
              <td class="text-red mono">{{ h.errors }}</td>
              <td><span :class="`badge badge-${h.ok ? 'green' : 'yellow'}`">{{ h.ok ? 'OK' : 'Partiel' }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="empty-state" v-else><p>Aucun import dans cette session.</p></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useDbStore } from '@/stores/db'
import { fullImport } from '@/services/import'
import { parseCSVFile } from '@/composables/useParseCSV'

const db = useDbStore()

const dragging1 = ref(false)
const dragging2 = ref(false)
const file1 = ref(null)
const file2 = ref(null)
const preview1 = ref([])
const preview2 = ref([])
const loading1 = ref(false)
const loading2 = ref(false)
const msg1 = ref(null)
const msg2 = ref(null)
const globalMsg = ref('')
const globalOk  = ref(true)
const history   = ref([])
const snipeitLog = ref([])
const showLog    = ref(false)
const snipeitProgress = ref({ active: false, step: '', pct: 0 })

// Nouveaux états pour la validation
const validationReport = ref(null)
const showValidationReport = ref(false)

const assetCols = ['asset_tag', 'serial', 'name', 'category', 'manufacturer', 'model', 'status', 'company', 'user', 'email', 'department', 'purchase_date', 'purchase_cost']

const previewHeaders1 = computed(() =>
  preview1.value.length ? Object.keys(preview1.value[0]).slice(0, 6) : []
)
const previewHeaders2 = computed(() =>
  preview2.value.length ? Object.keys(preview2.value[0]).slice(0, 6) : []
)

// Fonction de validation détaillée
async function validateCSVWithDetails(f) {
  const report = {
    isValid: true,
    hasIssues: false,
    totalIssues: 0,
    errors: [],
    warnings: [],
    foundColumns: [],
    missingColumns: [],
    rowErrors: []
  }
  
  try {
    // Lire le fichier brut pour vérifier les colonnes originales
    const readRawFile = () => {
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const text = e.target.result
          const firstLine = text.split('\n')[0]
          const columns = firstLine.split(/[;,]/).map(c => c.trim().replace(/^"|"$/g, ''))
          resolve(columns)
        }
        reader.readAsText(f, 'UTF-8')
      })
    }
    
    const originalColumns = await readRawFile(f)
    report.foundColumns = originalColumns
    
    const requiredColumns = [
      'asset_tag', 'serial', 'name', 'category', 'manufacturer', 
      'model', 'status', 'company', 'user', 'email', 
      'department', 'purchase_date', 'purchase_cost'
    ]
    
    // Vérifier les colonnes manquantes
    report.missingColumns = requiredColumns.filter(col => 
      !originalColumns.some(orig => orig.toLowerCase() === col.toLowerCase())
    )
    
    if (report.missingColumns.length > 0) {
      report.hasIssues = true
      report.totalIssues += report.missingColumns.length
      report.errors.push({
        type: 'missing_columns',
        title: 'Colonnes obligatoires manquantes',
        message: `Le fichier ne contient pas toutes les colonnes requises. L'import peut échouer.`,
        details: report.missingColumns
      })
    }
    
    // Parser le fichier pour valider les données
    const rows = await parseCSVFile(f)
    
    // Valider chaque ligne
    rows.forEach((row, index) => {
      const lineErrors = []
      
      // Vérifier purchase_cost
      if (row.purchase_cost && row.purchase_cost.toString().trim() !== '') {
        const costStr = row.purchase_cost.toString().trim().replace(/\s/g, '').replace(',', '.')
        const costValue = parseFloat(costStr)
        if (isNaN(costValue)) {
          lineErrors.push(`purchase_cost "${row.purchase_cost}" n'est pas un nombre`)
        }
      }
      
      // Vérifier purchase_date
      if (row.purchase_date && row.purchase_date.toString().trim() !== '') {
        const dateStr = row.purchase_date.toString().trim()
        const parts = dateStr.split('/')
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10)
          const month = parseInt(parts[1], 10) - 1
          const year = parseInt(parts[2], 10)
          const date = new Date(year, month, day)
          if (isNaN(date.getTime())) {
            lineErrors.push(`purchase_date "${row.purchase_date}" n'est pas une date valide`)
          }
        } else {
          lineErrors.push(`purchase_date "${row.purchase_date}" n'est pas une date valide`)
        }
      }
      
      if (lineErrors.length > 0) {
        report.rowErrors.push({
          line: index + 1,
          errors: lineErrors
        })
      }
    })
    
    if (report.rowErrors.length > 0) {
      report.hasIssues = true
      report.totalIssues += report.rowErrors.length
      report.warnings.push({
        type: 'data_errors',
        title: `${report.rowErrors.length} ligne(s) contiennent des erreurs de données`,
        message: `Ces lignes seront ignorées lors de l'import vers SnipeIT`,
        details: report.rowErrors
      })
    }
    
    report.isValid = report.errors.length === 0
    
    return { report, rows }
    
  } catch (e) {
    report.hasIssues = true
    report.totalIssues++
    report.errors.push({
      type: 'parse_error',
      title: 'Erreur de lecture du fichier',
      message: e.message
    })
    return { report, rows: [] }
  }
}

async function assignFile(f, type) {
  if (!f) return
  
  if (type === 'assets') {
    // Valider le fichier ET obtenir les données parsées
    const { report, rows } = await validateCSVWithDetails(f)
    
    // Stocker le rapport de validation
    validationReport.value = report
    showValidationReport.value = report.hasIssues
    
    // Message global simplifié
    if (report.isValid) {
      globalMsg.value = `✅ Fichier valide : ${rows.length} lignes détectées`
      globalOk.value = true
    } else {
      globalMsg.value = `⚠️ ${report.totalIssues} problème(s) détecté(s). Consultez le rapport ci-dessous.`
      globalOk.value = false
    }
    setTimeout(() => { globalMsg.value = '' }, 5000)
    
    // TOUJOURS afficher l'aperçu, même avec des erreurs
    file1.value = f
    preview1.value = rows
    msg1.value = null
    snipeitLog.value = []
    
  } else {
    const rows = await parseCSVFile(f)
    file2.value = f
    preview2.value = rows
    msg2.value = null
  }
}

function onDrop(e, type) {
  dragging1.value = false
  dragging2.value = false
  assignFile(e.dataTransfer.files[0], type)
}

function onFile(e, type) {
  assignFile(e.target.files[0], type)
}

// ── Import local uniquement ───────────────────────────
function importLocal() {
  loading1.value = 'local'
  try {
    const rows = preview1.value.map((r, i) => ({
      id:         i + 1,
      name:       r.name       || r.Nom       || '',
      asset_tag:  r.asset_tag  || r['Asset Tag'] || `IMP-${i+1}`,
      category:   r.category   || r.Catégorie || r.Type || '',
      location:   r.location   || r.Localisation || '',
      serial:     r.serial     || r['Numéro de série'] || '',
      model:      r.model      || r.Modèle || '',
      status:     r.status     || r.Statut  || 'Ready to Deploy',
      manufacturer: r.manufacturer || r.Fabricant || '',
    }))
    db.importAssets(rows)
    msg1.value = { ok: true, text: `✓ ${rows.length} éléments enregistrés localement.` }
    history.value.unshift({ id: Date.now(), date: new Date().toLocaleString('fr-FR'), file: file1.value.name, type: 'Local', created: rows.length, errors: 0, ok: true })
  } catch (e) {
    msg1.value = { ok: false, text: 'Erreur : ' + e.message }
  } finally {
    loading1.value = false
  }
}

// ── Import vers SnipeIT avec création en cascade ──────
async function importToSnipeIT() {
  // Si des erreurs critiques existent, demander confirmation
  const hasCriticalErrors = validationReport.value && validationReport.value.errors.length > 0
  
  if (hasCriticalErrors) {
    const confirm = window.confirm(
      '⚠️ Attention : Des problèmes critiques ont été détectés dans votre fichier.\n\n' +
      validationReport.value.errors.map(e => `• ${e.title}`).join('\n') + '\n\n' +
      'L\'import risque d\'échouer ou de produire des résultats incorrects.\n\n' +
      'Voulez-vous quand même continuer ?'
    )
    if (!confirm) return
  }
  
  loading1.value = 'snipeit'
  msg1.value     = null
  snipeitLog.value = []
  snipeitProgress.value = { active: true, step: 'Démarrage…', pct: 0 }

  try {
    const result = await fullImport(
      preview1.value,
      (step, pct) => {
        snipeitProgress.value = { active: true, step, pct }
      }
    )

    snipeitLog.value = [
      ...result.log.map(m => ({ type: 'ok',    msg: m })),
      ...result.errors.map(m => ({ type: 'error', msg: m })),
    ]

    snipeitProgress.value = { active: false, step: '', pct: 100 }

    const ok = result.failed === 0
    msg1.value = {
      ok,
      text: ok
        ? `✓ ${result.created} assets créés dans SnipeIT avec toutes leurs dépendances.`
        : `⚠ ${result.created} créés, ${result.failed} échoués. Voir le journal ci-dessous.`
    }

    importLocal()

    history.value.unshift({
      id: Date.now(),
      date: new Date().toLocaleString('fr-FR'),
      file: file1.value.name,
      type: 'SnipeIT',
      created: result.created,
      errors:  result.failed,
      ok,
    })

    showLog.value = result.failed > 0

  } catch (e) {
    snipeitProgress.value = { active: false, step: '', pct: 0 }
    msg1.value = { ok: false, text: 'Erreur critique : ' + e.message }
    snipeitLog.value = [{ type: 'error', msg: e.message }]
  } finally {
    loading1.value = false
  }
}

// ── Import Feuil 2 ────────────────────────────────────
async function importFeuil2() {
  loading2.value = true
  msg2.value     = null
  try {
    await db.importFeuil2(preview2.value)
    msg2.value = { ok: true, text: `✓ ${db.feuil2.length} lignes écrites dans SQLite (newapp.db).` }
    history.value.unshift({
      id: Date.now(),
      date: new Date().toLocaleString('fr-FR'),
      file: file2.value.name,
      type: 'Feuil2 SQLite',
      created: db.feuil2.length,
      errors: 0,
      ok: true,
    })
  } catch (e) {
    msg2.value = {
      ok: false,
      text: 'Erreur SQLite : ' + e.message +
        (e.message.includes('inaccessible') || e.message.includes('fetch')
          ? ' → Assurez-vous que le backend tourne : node server/index.js'
          : '')
    }
    history.value.unshift({
      id: Date.now(),
      date: new Date().toLocaleString('fr-FR'),
      file: file2.value.name,
      type: 'Feuil2 SQLite',
      created: 0, errors: 1, ok: false,
    })
  } finally {
    loading2.value = false
  }
}
</script>

<style scoped>
.drop-zone {
  border: 2px dashed var(--border2); border-radius: var(--radius2);
  padding: 32px 20px; text-align: center; cursor: pointer;
  transition: all 0.2s; display: flex; flex-direction: column;
  align-items: center; gap: 12px; color: var(--text2); font-size: 0.875rem;
}
.drop-zone:hover, .drop-zone.drag-over { border-color: var(--accent); background: var(--accentbg); color: var(--text); }

.expected-cols .cols-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }

.preview-block {
  background: var(--bg3); border-radius: var(--radius);
  padding: 12px; border: 1px solid var(--border);
}

/* Validation report */
.validation-report {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.validation-header {
  padding: 10px 12px;
  background: var(--bg3);
  cursor: pointer;
  transition: background 0.2s;
}

.validation-header:hover {
  background: var(--border);
}

.validation-details {
  padding: 12px;
  border-top: 1px solid var(--border);
  max-height: 400px;
  overflow-y: auto;
}

.validation-section {
  margin-bottom: 16px;
}

.validation-section:last-child {
  margin-bottom: 0;
}

.validation-title {
  font-size: 0.75rem;
  font-weight: 600;
  margin-bottom: 8px;
}

.validation-item {
  padding: 8px 12px;
  background: var(--bg2);
  border-radius: var(--radius-sm);
  margin-bottom: 8px;
}

.validation-item.error {
  border-left: 3px solid var(--red);
  background: var(--redbg);
}

.validation-item.warning {
  border-left: 3px solid var(--yellow);
  background: rgba(245, 158, 11, 0.1);
}

.validation-item.info {
  border-left: 3px solid var(--blue);
  background: var(--bluebg);
}

.text-red { color: var(--red); }
.text-yellow { color: var(--yellow); }
.text-blue { color: var(--blue); }

.tag-warning {
  background: var(--yellow);
  color: var(--bg);
}

.badge-green {
  background: var(--green);
  color: white;
}

.badge-yellow {
  background: var(--yellow);
  color: var(--bg);
}

/* Progress */
.progress-block { background: var(--bg3); border-radius: var(--radius); padding: 12px; border: 1px solid var(--border); }
.progress-bar   { height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
.progress-fill  { height: 100%; background: var(--accent); border-radius: 3px; transition: width 0.4s ease; }

/* Log */
.log-block { border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
.log-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 12px; background: var(--bg3); cursor: pointer;
}
.log-header:hover { background: var(--border); }
.log-entries { max-height: 200px; overflow-y: auto; }
.log-entry {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 6px 12px; font-size: 0.75rem; font-family: var(--font-mono);
  border-bottom: 1px solid var(--border);
}
.log-entry.ok    { color: var(--green); }
.log-entry.error { color: var(--red); background: var(--redbg); }
.log-entry.warn  { color: var(--yellow); }
.log-icon { flex-shrink: 0; font-weight: 700; }

/* Cascade info */
.cascade-info {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 10px 12px; background: var(--bluebg);
  border: 1px solid rgba(77,158,255,0.2); border-radius: var(--radius);
}

.stat-mini {
  display: flex; align-items: center; gap: 6px;
  padding: 10px 14px; background: var(--greenbg);
  border: 1px solid var(--green); border-radius: var(--radius);
  font-size: 0.875rem; color: var(--green);
}

.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.flex {
  display: flex;
}

.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }
.mt-1 { margin-top: 4px; }
.mt-2 { margin-top: 8px; }
.mb-2 { margin-bottom: 8px; }
</style>