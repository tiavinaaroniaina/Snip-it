<template>
  <div class="page fade-in">
    <div class="page-header flex-between">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">Vue d'ensemble des données</p>
      </div>
      <div class="flex gap-3">
        <!-- Indicateur de connexion SnipeIT -->
        <div class="conn-badge" :class="connStatus.cls">
          <span class="dot-small"></span>
          {{ connStatus.label }}
        </div>
        <button class="btn btn-primary" @click="doSync" :disabled="db.syncing">
          <span v-if="db.syncing" class="loader"></span>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.9L1 10"/></svg>
          Sync SnipeIT
        </button>
      </div>
    </div>

    <!-- Résultat sync -->
    <div v-if="syncResult" :class="`alert alert-${syncResult.ok ? 'success' : 'warning'} mb-6`">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline v-if="syncResult.ok" points="20 6 9 17 4 12"/>
        <path v-else d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      </svg>
      <span>{{ syncResult.msg }}</span>
    </div>

    <!-- Erreur sync -->
    <div v-if="db.syncError" class="alert alert-danger mb-6">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      {{ db.syncError }}
    </div>

    <!-- Tip si pas de token -->
    <div v-if="!hasToken" class="alert alert-warning mb-6">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      <span>
        <strong>VITE_SNIPEIT_TOKEN</strong> non configuré dans <code>.env.local</code>.
        La synchronisation avec SnipeIT est désactivée.
        Vous pouvez quand même importer des CSV localement.
      </span>
    </div>

    <!-- ── KPI Assets ──────────────────────────────────── -->
    <section>
      <div class="section-header">
        <h3 class="section-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
          Éléments (Assets)
        </h3>
        <span class="text-xs text-muted mono">
          Source : {{ db.categories.length ? 'API SnipeIT' : 'CSV importé' }}
        </span>
      </div>

      <div class="kpi-grid mt-4">
        <!-- Total -->
        <div class="stat-card accent-top">
          <div class="stat-label">Total général</div>
          <div class="stat-value text-accent">{{ db.assets.length }}</div>
          <div class="stat-sub">
            {{ db.categories.length }} catégorie(s) —
            {{ db.locations.length }} site(s)
          </div>
        </div>

        <!-- Par catégorie -->
        <div
          v-for="(count, name) in db.assetsByType"
          :key="name"
          class="stat-card"
        >
          <div class="stat-label">{{ name }}</div>
          <div class="stat-value">{{ count }}</div>
          <div class="stat-sub">{{ pct(count, db.assets.length) }}% du total</div>
        </div>

        <!-- État vide -->
        <div v-if="!db.assets.length" class="stat-card empty-card">
          <div class="stat-label">Aucune donnée</div>
          <div class="stat-sub mt-2">
            <router-link to="/backoffice/import">Importer un CSV</router-link>
            ou cliquer sur Sync SnipeIT
          </div>
        </div>
      </div>

      <!-- Détail catégories SnipeIT si disponibles -->
      <div v-if="db.categories.length" class="categories-detail mt-4">
        <p class="text-xs text-muted mono mb-2">
          Catégories chargées depuis SnipeIT (/api/v1/categories) :
        </p>
        <div class="cats-chips">
          <div class="cat-chip" v-for="c in db.categories" :key="c.id">
            <span class="cat-name">{{ c.name }}</span>
            <span class="cat-count">{{ assetCountForCat(c.name) }}</span>
          </div>
        </div>
      </div>
    </section>

    <div class="divider"></div>

    <!-- ── KPI Tickets ─────────────────────────────────── -->
    <section>
      <h3 class="section-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/></svg>
        Tickets
      </h3>
      <div class="grid-4 mt-4">
        <div class="stat-card">
          <div class="stat-label">Total</div>
          <div class="stat-value">{{ db.tickets.length }}</div>
          <div class="stat-sub">tous statuts</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Ouverts</div>
          <div class="stat-value text-red">{{ db.ticketsByStatus.open || 0 }}</div>
          <div class="stat-sub"><span class="badge badge-red">open</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">En cours</div>
          <div class="stat-value text-yellow">{{ db.ticketsByStatus.in_progress || 0 }}</div>
          <div class="stat-sub"><span class="badge badge-yellow">in_progress</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Résolus</div>
          <div class="stat-value text-green">{{ (db.ticketsByStatus.resolved || 0) + (db.ticketsByStatus.closed || 0) }}</div>
          <div class="stat-sub"><span class="badge badge-green">resolved / closed</span></div>
        </div>
      </div>
    </section>

    <div class="divider"></div>

    <!-- ── Derniers tickets ────────────────────────────── -->
    <section>
      <div class="flex-between mb-4">
        <h3 class="section-title">Derniers tickets</h3>
        <router-link to="/backoffice/tickets" class="btn btn-secondary btn-sm">Voir tout →</router-link>
      </div>
      <div class="card" v-if="db.tickets.length">
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>#</th><th>Titre</th><th>Statut</th><th>Éléments</th><th>Date</th></tr>
            </thead>
            <tbody>
              <tr v-for="t in recentTickets" :key="t.id">
                <td class="mono text-muted text-xs">#{{ t.id.toString().slice(-4) }}</td>
                <td>{{ t.title }}</td>
                <td><span :class="statusBadge(t.status)">{{ t.status }}</span></td>
                <td class="text-muted">{{ t.assets?.length || 0 }} élément(s)</td>
                <td class="mono text-muted text-xs">{{ fmtDate(t.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="empty-state" v-else>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/></svg>
        <h4>Aucun ticket</h4>
        <p>Créez-en un depuis le <router-link to="/front/ticket">frontoffice</router-link>.</p>
      </div>
    </section>

    <!-- ── Derniers assets ─────────────────────────────── -->
    <div class="divider"></div>
    <section>
      <div class="flex-between mb-4">
        <h3 class="section-title">Éléments récents</h3>
        <router-link to="/front/assets" class="btn btn-secondary btn-sm">Catalogue →</router-link>
      </div>
      <div class="card" v-if="db.assets.length">
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Nom</th><th>Catégorie</th><th>Tag</th><th>Site</th><th>Statut</th></tr>
            </thead>
            <tbody>
              <tr v-for="a in recentAssets" :key="a.id">
                <td class="fw-600">{{ a.name || a.asset_tag }}</td>
                <td><span class="tag">{{ a.category || '—' }}</span></td>
                <td class="mono text-xs">{{ a.asset_tag || '—' }}</td>
                <td class="text-muted">{{ a.location || '—' }}</td>
                <td><span :class="assetStatusBadge(a.status)">{{ a.status || 'N/A' }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="empty-state" v-else>
        <h4>Aucun élément</h4>
        <p>Importez un CSV dans <router-link to="/backoffice/import">Import données</router-link>.</p>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useDbStore } from '@/stores/db'
import { testConnection } from '@/services/snipeit'

const db = useDbStore()

const syncResult  = ref(null)
const connOk      = ref(null) // null = pas testé, true/false = résultat

const hasToken = computed(() =>
  !!import.meta.env.VITE_SNIPEIT_TOKEN
)

const connStatus = computed(() => {
  if (!hasToken.value) return { cls: 'conn-none',  label: 'Token manquant' }
  if (connOk.value === null) return { cls: 'conn-unknown', label: 'Non testé' }
  if (connOk.value) return { cls: 'conn-ok',    label: 'SnipeIT connecté' }
  return { cls: 'conn-err', label: 'SnipeIT inaccessible' }
})

const recentTickets = computed(() => db.tickets.slice(0, 5))
const recentAssets  = computed(() => db.assets.slice(0, 8))

function pct(val, total) {
  if (!total) return 0
  return Math.round((val / total) * 100)
}
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' })
}
function statusBadge(s) {
  const map = { open:'badge badge-red', in_progress:'badge badge-yellow', resolved:'badge badge-green', closed:'badge badge-gray' }
  return map[s] || 'badge badge-gray'
}
function assetStatusBadge(s) {
  if (!s) return 'badge badge-gray'
  const sl = s.toLowerCase()
  if (sl.includes('ready') || sl.includes('dispo')) return 'badge badge-green'
  if (sl.includes('deploy') || sl.includes('utilis')) return 'badge badge-blue'
  if (sl.includes('repair') || sl.includes('répar')) return 'badge badge-yellow'
  return 'badge badge-gray'
}
function assetCountForCat(catName) {
  return db.assets.filter(a => a.category === catName).length
}

async function doSync() {
  syncResult.value = null
  const results = await db.syncFromSnipeIT()
  const hasErr  = results.errors.length > 0
  syncResult.value = {
    ok:  !hasErr,
    msg: hasErr
      ? `Sync partielle : ${results.assets} assets, ${results.categories} catégories, ${results.locations} sites. Erreurs : ${results.errors.join(' | ')}`
      : `✓ Sync réussie : ${results.assets} assets, ${results.categories} catégories, ${results.locations} sites.`
  }
  connOk.value = !hasErr
  setTimeout(() => syncResult.value = null, 8000)
}

onMounted(async () => {
  // Test silencieux de connexion au chargement
  if (hasToken.value) {
    const r = await testConnection()
    connOk.value = r.ok
  }
})
</script>

<style scoped>
.section-header { display: flex; align-items: center; justify-content: space-between; }
.section-title {
  display: flex; align-items: center; gap: 8px;
  font-size: 1rem; font-weight: 600; color: var(--text2);
}
.accent-top { border-top: 2px solid var(--accent); }
.fw-600 { font-weight: 600; }

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}
.empty-card { border-style: dashed; }

/* Catégories SnipeIT */
.categories-detail {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px 16px;
}
.cats-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.cat-chip {
  display: flex; align-items: center; gap: 6px;
  padding: 5px 12px;
  background: var(--bg3);
  border: 1px solid var(--border2);
  border-radius: 20px;
}
.cat-name { font-size: 0.8rem; }
.cat-count {
  font-size: 0.75rem;
  font-family: var(--font-mono);
  background: var(--accentbg);
  color: var(--accent);
  padding: 1px 6px;
  border-radius: 10px;
}

/* Badge connexion */
.conn-badge {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-family: var(--font-mono);
  border: 1px solid;
}
.conn-ok      { background: var(--greenbg);  border-color: var(--green);  color: var(--green); }
.conn-err     { background: var(--redbg);    border-color: var(--red);    color: var(--red); }
.conn-none    { background: var(--yellowbg); border-color: var(--yellow); color: var(--yellow); }
.conn-unknown { background: var(--bg3);      border-color: var(--border2);color: var(--text3); }

.dot-small {
  width: 6px; height: 6px; border-radius: 50%;
  background: currentColor;
  animation: pulse 2s infinite;
}
</style>
