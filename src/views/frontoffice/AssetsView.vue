<template>
  <div class="page fade-in">
    <div class="page-header">
      <h1 class="page-title">Catalogue d'équipements</h1>
      <p class="page-subtitle">{{ filtered.length }} résultat(s) sur {{ db.assets.length }} éléments</p>
    </div>

    <!-- Barre de recherche multi-critères — colonnes de la Feuille 1 -->
    <div class="search-panel card mb-6">
      <div class="search-grid">
        <!-- Recherche libre -->
        <div class="search-bar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input v-model="q.search" type="text" class="form-control" placeholder="Nom, tag, numéro de série, modèle…" />
        </div>

        <!-- Catégorie (colonne : category) -->
        <select v-model="q.category" class="form-control">
          <option value="">Toutes catégories</option>
          <option v-for="c in categories" :key="c">{{ c }}</option>
        </select>

        <!-- Fabricant (colonne : manufacturer) -->
        <select v-model="q.manufacturer" class="form-control">
          <option value="">Tous fabricants</option>
          <option v-for="m in manufacturers" :key="m">{{ m }}</option>
        </select>

        <!-- Statut (colonne : status) -->
        <select v-model="q.status" class="form-control">
          <option value="">Tous statuts</option>
          <option v-for="s in statuses" :key="s">{{ s }}</option>
        </select>

        <!-- Localisation (colonne : location) -->
        <select v-model="q.location" class="form-control">
          <option value="">Toutes localisations</option>
          <option v-for="l in locations" :key="l">{{ l }}</option>
        </select>

        <!-- Entreprise (colonne : company) -->
        <select v-model="q.company" class="form-control">
          <option value="">Toutes entreprises</option>
          <option v-for="c in companies" :key="c">{{ c }}</option>
        </select>

        <!-- Département (colonne : department) -->
        <select v-model="q.department" class="form-control">
          <option value="">Tous départements</option>
          <option v-for="d in departments" :key="d">{{ d }}</option>
        </select>

        <!-- Bouton reset -->
        <button class="btn btn-secondary" @click="resetFilters">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.9L1 10"/></svg>
          Effacer
        </button>

        <!-- Vue toggle -->
        <div class="view-toggle">
          <button :class="['btn btn-sm btn-icon', viewMode === 'grid' ? 'btn-primary' : 'btn-secondary']" @click="viewMode = 'grid'" title="Grille">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          </button>
          <button :class="['btn btn-sm btn-icon', viewMode === 'list' ? 'btn-primary' : 'btn-secondary']" @click="viewMode = 'list'" title="Liste">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </button>
        </div>
      </div>

      <!-- Filtres actifs (badges) -->
      <div v-if="hasActiveFilters" class="active-filters mt-3">
        <span class="text-xs text-muted">Filtres actifs :</span>
        <span v-if="q.category"   class="filter-badge">catégorie: {{ q.category }}   <button @click="q.category = ''">✕</button></span>
        <span v-if="q.manufacturer" class="filter-badge">fabricant: {{ q.manufacturer }} <button @click="q.manufacturer = ''">✕</button></span>
        <span v-if="q.status"     class="filter-badge">statut: {{ q.status }}     <button @click="q.status = ''">✕</button></span>
        <span v-if="q.location"   class="filter-badge">localisation: {{ q.location }}   <button @click="q.location = ''">✕</button></span>
        <span v-if="q.company"    class="filter-badge">entreprise: {{ q.company }}    <button @click="q.company = ''">✕</button></span>
        <span v-if="q.department" class="filter-badge">département: {{ q.department }} <button @click="q.department = ''">✕</button></span>
      </div>
    </div>

    <!-- Aucun résultat -->
    <div class="empty-state" v-if="!db.assets.length">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
      <h4>Catalogue vide</h4>
      <p>Importez des données depuis le <router-link to="/backoffice/import">backoffice</router-link>.</p>
    </div>

    <div class="empty-state" v-else-if="!filtered.length">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <h4>Aucun résultat</h4>
      <p>Modifiez vos critères de recherche.</p>
    </div>

    <!-- Vue GRILLE -->
    <div class="assets-grid" v-else-if="viewMode === 'grid'">
      <div
        v-for="a in paginated"
        :key="a.id"
        class="asset-card"
        @click="openAsset(a)"
      >
        <div class="asset-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <component :is="'path'" v-if="isLaptop(a)" d="M2 18v3h20v-3M4 6h16v12H4z" />
            <path v-else d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
          </svg>
        </div>
        <h4 class="asset-name">{{ a.name || a.asset_tag }}</h4>
        <div class="asset-meta">
          <span class="tag">{{ a.category || 'N/A' }}</span>
          <span :class="`badge ${assetStatusBadge(a.status)}`">{{ a.status || 'N/A' }}</span>
        </div>
        <div class="asset-detail">
          <span class="mono text-xs text-muted">{{ a.asset_tag || '—' }}</span>
          <span class="text-xs text-muted">{{ a.location || '—' }}</span>
        </div>
        <div class="asset-detail mt-1" v-if="a.manufacturer || a.company">
          <span class="text-xs text-muted">{{ a.manufacturer || '—' }}</span>
          <span class="text-xs text-muted">{{ a.company || '—' }}</span>
        </div>
        <button class="btn btn-primary btn-sm w-full mt-3" @click.stop="createTicketWith(a)">
          + Créer un ticket
        </button>
      </div>
    </div>

    <!-- Vue LISTE -->
    <div class="card" v-else>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Tag</th>
              <th>Catégorie</th>
              <th>Fabricant</th>
              <th>Modèle</th>
              <th>Localisation</th>
              <th>Entreprise</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in paginated" :key="a.id" @click="openAsset(a)" style="cursor:pointer">
              <td class="fw-600">{{ a.name || '—' }}</td>
              <td class="mono text-xs">{{ a.asset_tag || '—' }}</td>
              <td><span class="tag">{{ a.category || '—' }}</span></td>
              <td class="text-muted">{{ a.manufacturer || '—' }}</td>
              <td class="text-muted">{{ a.model || '—' }}</td>
              <td class="text-muted">{{ a.location || '—' }}</td>
              <td class="text-muted">{{ a.company || '—' }}</td>
              <td><span :class="`badge ${assetStatusBadge(a.status)}`">{{ a.status || 'N/A' }}</span></td>
              <td>
                <button class="btn btn-primary btn-sm" @click.stop="createTicketWith(a)">Ticket</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pagination -->
    <div class="pagination mt-6" v-if="totalPages > 1">
      <button class="btn btn-secondary" :disabled="page <= 1" @click="page--">← Précédent</button>
      <div class="page-nums">
        <button
          v-for="p in visiblePages"
          :key="p"
          :class="['btn btn-sm', p === page ? 'btn-primary' : 'btn-secondary']"
          @click="page = p"
        >{{ p }}</button>
      </div>
      <button class="btn btn-secondary" :disabled="page >= totalPages" @click="page++">Suivant →</button>
    </div>

    <!-- Fiche asset (modal) -->
    <div class="modal-backdrop" v-if="selected" @click.self="selected = null">
      <div class="modal fade-in">
        <div class="flex-between mb-4">
          <span class="badge badge-gray mono">{{ selected.asset_tag }}</span>
          <button class="btn btn-secondary btn-sm btn-icon" @click="selected = null">✕</button>
        </div>
        <h2 class="modal-title">{{ selected.name || selected.asset_tag }}</h2>
        <div class="grid-2 mt-4">
          <div v-for="(label, key) in assetFields" :key="key">
            <div class="form-label">{{ label }}</div>
            <div class="text-sm">{{ selected[key] || '—' }}</div>
          </div>
        </div>
        <div class="divider"></div>
        <div class="flex gap-3">
          <button class="btn btn-primary" @click="createTicketWith(selected); selected = null">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/></svg>
            Créer un ticket
          </button>
          <button class="btn btn-secondary" @click="selected = null">Fermer</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDbStore } from '@/stores/db'

const db     = useDbStore()
const router = useRouter()

const viewMode = ref('grid')
const page     = ref(1)
const PER      = 12
const selected = ref(null)

// Filtres alignés sur les colonnes CSV Feuille 1
const q = ref({
  search:       '',
  category:     '',
  manufacturer: '',
  status:       '',
  location:     '',
  company:      '',
  department:   '',
})

// Listes de valeurs uniques depuis les assets
const categories   = computed(() => [...new Set(db.assets.map(a => a.category).filter(Boolean))].sort())
const manufacturers = computed(() => [...new Set(db.assets.map(a => a.manufacturer).filter(Boolean))].sort())
const statuses     = computed(() => [...new Set(db.assets.map(a => a.status).filter(Boolean))].sort())
const locations    = computed(() => db.locationNames)
const companies    = computed(() => [...new Set(db.assets.map(a => a.company).filter(Boolean))].sort())
const departments  = computed(() => [...new Set(db.assets.map(a => a.department).filter(Boolean))].sort())

const hasActiveFilters = computed(() =>
  q.value.category || q.value.manufacturer || q.value.status ||
  q.value.location  || q.value.company      || q.value.department
)

const filtered = computed(() => {
  return db.assets.filter(a => {
    const s = q.value.search.toLowerCase()
    if (s && ![a.name, a.asset_tag, a.model, a.serial, a.manufacturer].some(v => v?.toLowerCase().includes(s))) return false
    if (q.value.category     && a.category     !== q.value.category)     return false
    if (q.value.manufacturer && a.manufacturer !== q.value.manufacturer) return false
    if (q.value.status       && a.status       !== q.value.status)       return false
    if (q.value.location     && a.location     !== q.value.location)     return false
    if (q.value.company      && a.company      !== q.value.company)      return false
    if (q.value.department   && a.department   !== q.value.department)   return false
    return true
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / PER)))
const paginated  = computed(() => {
  const start = (page.value - 1) * PER
  return filtered.value.slice(start, start + PER)
})
const visiblePages = computed(() => {
  const pages = []
  for (let i = Math.max(1, page.value - 2); i <= Math.min(totalPages.value, page.value + 2); i++) pages.push(i)
  return pages
})

const assetFields = {
  name:         'Nom',
  asset_tag:    'Tag',
  category:     'Catégorie',
  manufacturer: 'Fabricant',
  model:        'Modèle',
  serial:       'Numéro de série',
  location:     'Localisation',
  status:       'Statut',
  company:      'Entreprise',
  department:   'Département',
  user:         'Utilisateur',
  email:        'Email',
}

function resetFilters() {
  q.value = { search: '', category: '', manufacturer: '', status: '', location: '', company: '', department: '' }
  page.value = 1
}
function openAsset(a) { selected.value = a }
function isLaptop(a) {
  return a.category?.toLowerCase().includes('laptop') ||
         a.category?.toLowerCase().includes('ordinateur')
}

function assetStatusBadge(s) {
  if (!s) return 'badge-gray'
  const sl = s.toLowerCase()
  if (sl.includes('ready') || sl.includes('dispo')) return 'badge-green'
  if (sl.includes('deploy') || sl.includes('utilis'))  return 'badge-blue'
  if (sl.includes('repair') || sl.includes('répar'))   return 'badge-yellow'
  return 'badge-gray'
}

function createTicketWith(asset) {
  router.push({ path: '/front/ticket', query: { assetId: asset.id } })
}
</script>

<style scoped>
.search-panel { padding: 20px; }
.search-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr 1fr auto auto;
  gap: 10px;
  align-items: center;
}
@media (max-width: 1200px) {
  .search-grid { grid-template-columns: 1fr 1fr 1fr; }
}
@media (max-width: 700px) {
  .search-grid { grid-template-columns: 1fr; }
}

.active-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.filter-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--accentbg);
  color: var(--accent);
  border: 1px solid var(--accent);
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 0.75rem;
}
.filter-badge button {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--accent);
  font-size: 0.7rem;
  padding: 0;
  line-height: 1;
}

.view-toggle { display: flex; gap: 4px; }

.assets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.asset-card {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--radius2);
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;
}
.asset-card:hover { border-color: var(--accent); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }

.asset-icon {
  width: 44px; height: 44px;
  background: var(--accentbg);
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  margin-bottom: 12px;
}

.asset-name {
  font-family: var(--font-display);
  font-size: 0.95rem;
  font-weight: 600;
  margin-bottom: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.asset-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }

.asset-detail {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.page-nums { display: flex; gap: 4px; }
.fw-600 { font-weight: 600; }
.mt-1 { margin-top: 4px; }
</style>