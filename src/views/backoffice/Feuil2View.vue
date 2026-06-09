<template>
  <div class="page fade-in">
    <div class="page-header flex-between">
      <div>
        <h1 class="page-title">Feuil 2 — SQLite</h1>
        <p class="page-subtitle">{{ db.feuil2.length }} enregistrements dans la base locale</p>
      </div>
      <div class="flex gap-3">
        <div class="search-bar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input v-model="search" type="text" class="form-control" placeholder="Rechercher..." style="width:220px" />
        </div>
        <router-link to="/backoffice/import" class="btn btn-primary btn-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Importer
        </router-link>
      </div>
    </div>

    <!-- Info SQLite -->
    <div class="alert alert-info mb-6">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
      Données stockées via <strong>SQLite (localStorage simulé)</strong>. En production avec Electron ou un backend Node, ces données seront écrites dans un fichier <code>.db</code> réel via <code>better-sqlite3</code>.
    </div>

    <div v-if="db.feuil2.length">
      <!-- Stats colonnes -->
      <div class="cols-stat card mb-6">
        <div class="flex-between mb-3">
          <h4>Structure de la table</h4>
          <span class="badge badge-green">{{ columns.length }} colonnes</span>
        </div>
        <div class="cols-chips">
          <span class="chip-col" v-for="c in columns" :key="c">{{ c }}</span>
        </div>
      </div>

      <!-- Tableau -->
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th v-for="col in columns" :key="col">{{ col }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in paginated" :key="row._id">
                <td v-for="col in columns" :key="col" class="text-sm">
                  {{ row[col] || '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination mt-4" v-if="totalPages > 1">
          <button class="btn btn-secondary btn-sm" :disabled="page <= 1" @click="page--">←</button>
          <span class="text-sm text-muted">Page {{ page }} / {{ totalPages }}</span>
          <button class="btn btn-secondary btn-sm" :disabled="page >= totalPages" @click="page++">→</button>
        </div>
      </div>

      <!-- Export JSON -->
      <div class="flex gap-3 mt-4">
        <button class="btn btn-secondary btn-sm" @click="exportJson">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Exporter en JSON
        </button>
      </div>
    </div>

    <!-- Chargement -->
    <div class="empty-state" v-else-if="db.feuil2Loading">
      <span class="loader" style="width:32px;height:32px;border-width:3px"></span>
      <p class="mt-4">Chargement depuis SQLite…</p>
    </div>

    <!-- Erreur backend -->
    <div v-else-if="db.feuil2Error" class="alert alert-danger">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg>
      <div>
        <strong>Backend SQLite inaccessible</strong><br>
        <span class="text-sm">{{ db.feuil2Error }}</span><br>
        <code style="font-size:0.8rem;margin-top:6px;display:block">node server/index.js</code>
      </div>
    </div>

    <!-- Base vide -->
    <div class="empty-state" v-else>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
      <h4>Base vide</h4>
      <p>Importez le fichier CSV Feuil 2 depuis la page <router-link to="/backoffice/import">Import</router-link>.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useDbStore } from '@/stores/db'

const db = useDbStore()
const search = ref('')
const page   = ref(1)
const PER    = 20

// Charger les données SQLite au montage de la page
onMounted(() => db.loadFeuil2())

const columns = computed(() => {
  if (!db.feuil2.length) return []
  return Object.keys(db.feuil2[0]).filter(k => k !== '_id')
})

const filteredRows = computed(() => {
  if (!search.value) return db.feuil2
  const q = search.value.toLowerCase()
  return db.feuil2.filter(row =>
    Object.values(row).some(v => String(v).toLowerCase().includes(q))
  )
})

const totalPages = computed(() => Math.ceil(filteredRows.value.length / PER))

const paginated = computed(() => {
  const start = (page.value - 1) * PER
  return filteredRows.value.slice(start, start + PER)
})

function exportJson() {
  const blob = new Blob([JSON.stringify(db.feuil2, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'feuil2-export.json'
  a.click()
}
</script>

<style scoped>
.cols-stat { padding: 16px 20px; }
.cols-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip-col {
  padding: 4px 10px;
  background: var(--bluebg);
  border: 1px solid var(--blue);
  border-radius: 4px;
  font-size: 0.75rem;
  font-family: var(--font-mono);
  color: var(--blue);
}
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}
.backend-tip {
  display: flex; align-items: center; gap: 6px;
  font-size: 0.8rem; color: var(--text3);
  padding: 8px 12px;
  border: 1px dashed var(--border2);
  border-radius: var(--radius);
}
.backend-tip code { font-family: var(--font-mono); color: var(--accent); }
</style>
