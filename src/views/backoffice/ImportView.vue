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

        <!-- ── Règle 1 : Colonnes manquantes → BLOQUER ── -->
        <div v-if="assets1Validation && !assets1Validation.canImport" class="alert alert-danger mt-3">
          <strong>❌ {{ assets1Validation.errorMessage }}</strong>
          <p class="text-xs mt-2">Colonnes manquantes : <span class="mono">{{ assets1Validation.missingColumns.join(', ') }}</span></p>
          <p class="text-xs mt-1 text-muted">L'import est annulé. Vérifiez que vous utilisez le bon fichier.</p>
        </div>

        <!-- ── Résumé de validation (Règle 4) ── -->
        <div v-if="assets1Validation && assets1Validation.canImport && assets1Validation.skippedRows.length > 0" class="validation-summary mt-3">
          <div class="validation-title">⚠ {{ assets1Validation.skippedRows.length }} ligne(s) seront ignorées</div>
          <div v-for="row in assets1Validation.skippedRows" :key="row.line" class="skip-row">
            <span v-for="err in row.errors" :key="err">Ligne {{ row.line }} : {{ err }}</span>
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

        <!-- ── Règle 4 : Résumé visuel après import ── -->
        <div v-if="importSummary1.length" class="import-summary mt-3">
          <div v-for="(line, i) in importSummary1" :key="i" :class="`summary-line ${line.type}`">
            {{ line.text }}
          </div>
        </div>

        <!-- Résultat simple -->
        <p v-if="msg1" :class="`text-sm mt-3 ${msg1.ok ? 'text-green' : 'text-red'}`">
          {{ msg1.text }}
        </p>

        <!-- Boutons -->
        <div class="flex gap-3 mt-4 flex-wrap">
          <button
            class="btn btn-secondary"
            :disabled="!canImportAssets || loading1"
            :title="!assets1Validation?.canImport ? 'Import bloqué : colonnes manquantes' : ''"
            @click="importLocal"
          >
            <span v-if="loading1 === 'local'" class="loader"></span>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
            Enregistrer en local
          </button>

          <button
            class="btn btn-primary"
            :disabled="!canImportAssets || loading1"
            :title="!assets1Validation?.canImport ? 'Import bloqué : colonnes manquantes' : ''"
            @click="importToSnipeIT"
          >
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
            <p class="text-muted text-sm mt-1">Données locales uniquement (SQLite)</p>
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

        <!-- ── Règle 1 : Colonnes manquantes feuil2 ── -->
        <div v-if="feuil2Validation && !feuil2Validation.canImport" class="alert alert-danger mt-3">
          <strong>❌ {{ feuil2Validation.errorMessage }}</strong>
          <p class="text-xs mt-2">Colonnes manquantes : <span class="mono">{{ feuil2Validation.missingColumns.join(', ') }}</span></p>
        </div>

        <!-- ── Résumé validation feuil2 ── -->
        <div v-if="feuil2Validation && feuil2Validation.canImport && feuil2Validation.skippedRows.length > 0" class="validation-summary mt-3">
          <div class="validation-title">⚠ {{ feuil2Validation.skippedRows.length }} ligne(s) seront ignorées</div>
          <div v-for="row in feuil2Validation.skippedRows" :key="row.line" class="skip-row">
            <span v-for="err in row.errors" :key="err">Ligne {{ row.line }} : {{ err }}</span>
          </div>
        </div>

        <!-- Colonnes attendues feuil2 -->
        <div class="expected-cols mt-3">
          <p class="text-xs text-muted mb-2">Colonnes attendues :</p>
          <div class="cols-list">
            <span class="tag" v-for="c in feuil2Cols" :key="c">{{ c }}</span>
          </div>
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
          <button
            class="btn btn-success"
            :disabled="!canImportFeuil2 || loading2"
            @click="importFeuil2"
          >
            <span v-if="loading2" class="loader"></span>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
            Enregistrer en SQLite
          </button>
        </div>

        <!-- Règle 4 : résumé import feuil2 -->
        <div v-if="importSummary2.length" class="import-summary mt-3">
          <div v-for="(line, i) in importSummary2" :key="i" :class="`summary-line ${line.type}`">
            {{ line.text }}
          </div>
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
            <tr><th>Date</th><th>Fichier</th><th>Type</th><th>Importées</th><th>Ignorées</th><th>Statut</th></tr>
          </thead>
          <tbody>
            <tr v-for="h in history" :key="h.id">
              <td class="mono text-xs">{{ h.date }}</td>
              <td>{{ h.file }}</td>
              <td><span class="tag">{{ h.type }}</span></td>
              <td class="text-green mono">{{ h.created }}</td>
              <td class="text-yellow mono">{{ h.skipped }}</td>
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
import {
  validateAssetsFile,
  validateFeuil2File,
  ASSET_REQUIRED_COLUMNS,
  FEUIL2_REQUIRED_COLUMNS,
} from '@/services/importValidator'

const db = useDbStore()

const dragging1 = ref(false)
const dragging2 = ref(false)
const file1 = ref(null)
const file2 = ref(null)
const preview1 = ref([])   // toutes les lignes parsées
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

// Résultats de validation
const assets1Validation = ref(null)  // { canImport, missingColumns, validRows, skippedRows, summary }
const feuil2Validation  = ref(null)

// Résumé Règle 4 affiché après import
const importSummary1 = ref([])
const importSummary2 = ref([])

const assetCols  = ASSET_REQUIRED_COLUMNS
// Affichage avec la casse d'origine du fichier de référence
const feuil2Cols = ['Num_Ticket', 'Date', 'Heure', 'Titre', 'Description', 'Status', 'Priority', 'Items']

// Boutons actifs seulement si le fichier est valide (Règle 1)
const canImportAssets = computed(() =>
  file1.value && assets1Validation.value && assets1Validation.value.canImport
)
const canImportFeuil2 = computed(() =>
  file2.value && feuil2Validation.value && feuil2Validation.value.canImport
)

const previewHeaders1 = computed(() =>
  preview1.value.length ? Object.keys(preview1.value[0]).slice(0, 6) : []
)
const previewHeaders2 = computed(() =>
  preview2.value.length ? Object.keys(preview2.value[0]).slice(0, 6) : []
)

// ── Chargement et validation à l'assignation du fichier ──
async function assignFile(f, type) {
  if (!f) return

  if (type === 'assets') {
    const rows = await parseCSVFile(f)
    preview1.value = rows
    file1.value = f
    msg1.value = null
    snipeitLog.value = []
    importSummary1.value = []

    // Validation (Règles 1 & 3)
    const result = await validateAssetsFile(f, rows)
    assets1Validation.value = result

    if (!result.canImport) {
      globalMsg.value = `❌ Import annulé — ${result.errorMessage}`
      globalOk.value = false
    } else if (result.skippedRows.length > 0) {
      globalMsg.value = `⚠ ${result.skippedRows.length} ligne(s) seront ignorées (types invalides).`
      globalOk.value = false
    } else {
      globalMsg.value = `✅ Fichier valide — ${result.validRows.length} lignes prêtes à importer`
      globalOk.value = true
    }
    setTimeout(() => { globalMsg.value = '' }, 6000)

  } else {
    const rows = await parseCSVFile(f)
    preview2.value = rows
    file2.value = f
    msg2.value = null
    importSummary2.value = []

    const result = await validateFeuil2File(f, rows)
    feuil2Validation.value = result

    if (!result.canImport) {
      globalMsg.value = `❌ Import SQLite annulé — ${result.errorMessage}`
      globalOk.value = false
    } else if (result.skippedRows.length > 0) {
      globalMsg.value = `⚠ SQLite : ${result.skippedRows.length} ligne(s) seront ignorées.`
      globalOk.value = false
    } else {
      globalMsg.value = `✅ Fichier SQLite valide — ${result.validRows.length} lignes OK`
      globalOk.value = true
    }
    setTimeout(() => { globalMsg.value = '' }, 6000)
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

// ── Import local (uniquement les lignes valides) ──────────
function importLocal() {
  if (!canImportAssets.value) return
  loading1.value = 'local'
  try {
    const validRows = assets1Validation.value.validRows
    const rows = validRows.map((r, i) => ({
      id:           i + 1,
      name:         r.name         || '',
      asset_tag:    r.asset_tag    || `IMP-${i+1}`,
      category:     r.category     || '',
      location:     r.location     || '',
      serial:       r.serial       || '',
      model:        r.model        || '',
      status:       r.status       || 'Ready to Deploy',
      manufacturer: r.manufacturer || '',
      company:      r.company      || '',
      department:   r.department   || '',
      user:         r.user         || '',
      email:        r.email        || '',
      purchase_date: r.purchase_date || '',
      purchase_cost: r.purchase_cost || '',
    }))
    db.importAssets(rows)

    // Règle 4 : résumé
    const skipped = assets1Validation.value.skippedRows
    importSummary1.value = assets1Validation.value.summary || []
    if (rows.length === 0) {
      importSummary1.value = [{ type: 'warning', text: '⚠ Aucune ligne valide à importer.' }]
    }

    msg1.value = { ok: true, text: `✓ ${rows.length} éléments enregistrés localement.` }
    history.value.unshift({
      id: Date.now(),
      date: new Date().toLocaleString('fr-FR'),
      file: file1.value.name,
      type: 'Local',
      created: rows.length,
      skipped: skipped.length,
      ok: true,
    })
  } catch (e) {
    msg1.value = { ok: false, text: 'Erreur : ' + e.message }
  } finally {
    loading1.value = false
  }
}

// ── Import vers SnipeIT (uniquement les lignes valides) ───
async function importToSnipeIT() {
  if (!canImportAssets.value) return

  loading1.value = 'snipeit'
  msg1.value     = null
  snipeitLog.value = []
  importSummary1.value = []
  snipeitProgress.value = { active: true, step: 'Démarrage…', pct: 0 }

  try {
    // N'envoyer que les lignes valides (Règle 3)
    const validRows = assets1Validation.value.validRows

    const result = await fullImport(
      validRows,
      (step, pct) => {
        snipeitProgress.value = { active: true, step, pct }
      }
    )

    snipeitLog.value = [
      ...result.log.map(m => ({ type: 'ok',    msg: m })),
      ...result.errors.map(m => ({ type: 'error', msg: m })),
    ]

    snipeitProgress.value = { active: false, step: '', pct: 100 }

    // Règle 4 : résumé avec lignes ignorées incluses
    const skippedRows = assets1Validation.value.skippedRows
    importSummary1.value = [
      ...(assets1Validation.value.summary || []),
      ...(result.failed > 0
        ? [{ type: 'warning', text: `⚠ ${result.failed} asset(s) rejetés par SnipeIT` }]
        : [])
    ]

    const ok = result.failed === 0
    msg1.value = {
      ok,
      text: ok
        ? `✓ ${result.created} assets créés dans SnipeIT.`
        : `⚠ ${result.created} créés, ${result.failed} échoués. Voir le journal.`
    }

    importLocal()

    history.value.unshift({
      id: Date.now(),
      date: new Date().toLocaleString('fr-FR'),
      file: file1.value.name,
      type: 'SnipeIT',
      created: result.created,
      skipped: skippedRows.length + result.failed,
      ok,
    })

    showLog.value = result.failed > 0

  } catch (e) {
    snipeitProgress.value = { active: false, step: '', pct: 0 }
    msg1.value = { ok: false, text: 'Erreur critique : ' + e.message }
    snipeitLog.value = [{ type: 'error', msg: e.message }]
    importSummary1.value = [{ type: 'warning', text: '❌ Import échoué : ' + e.message }]
  } finally {
    loading1.value = false
  }
}

// ── Import Feuil 2 (uniquement les lignes valides) ────────
async function importFeuil2() {
  if (!canImportFeuil2.value) return
  loading2.value = true
  msg2.value     = null
  importSummary2.value = []
  try {
    const validRows = feuil2Validation.value.validRows
    await db.importFeuil2(validRows)

    // Règle 4 : résumé
    importSummary2.value = feuil2Validation.value.summary || []

    msg2.value = { ok: true, text: `✓ ${db.feuil2.length} lignes écrites dans SQLite (newapp.db).` }
    history.value.unshift({
      id: Date.now(),
      date: new Date().toLocaleString('fr-FR'),
      file: file2.value.name,
      type: 'Feuil2 SQLite',
      created: validRows.length,
      skipped: feuil2Validation.value.skippedRows.length,
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
    importSummary2.value = [{ type: 'warning', text: '❌ Import SQLite échoué' }]
    history.value.unshift({
      id: Date.now(),
      date: new Date().toLocaleString('fr-FR'),
      file: file2.value.name,
      type: 'Feuil2 SQLite',
      created: 0, skipped: 0, ok: false,
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

/* Validation summary (Règle 3 preview) */
.validation-summary {
  border: 1px solid var(--yellow);
  border-radius: var(--radius);
  padding: 10px 14px;
  background: rgba(245, 158, 11, 0.08);
  font-size: 0.8rem;
}
.validation-title {
  font-weight: 600;
  color: var(--yellow);
  margin-bottom: 6px;
}
.skip-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: var(--text2);
  font-size: 0.75rem;
  font-family: var(--font-mono);
  padding: 2px 0;
  border-top: 1px solid rgba(245,158,11,0.2);
  margin-top: 4px;
}

/* Import summary (Règle 4) */
.import-summary {
  border-radius: var(--radius);
  border: 1px solid var(--border);
  overflow: hidden;
}
.summary-line {
  padding: 8px 14px;
  font-size: 0.82rem;
  font-family: var(--font-mono);
  border-bottom: 1px solid var(--border);
}
.summary-line:last-child { border-bottom: none; }
.summary-line.success { color: var(--green); background: var(--greenbg); }
.summary-line.warning { color: var(--yellow); background: rgba(245,158,11,0.08); }

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

.flex { display: flex; }
.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }
.mt-1 { margin-top: 4px; }
.mt-2 { margin-top: 8px; }
.mb-2 { margin-bottom: 8px; }
</style>