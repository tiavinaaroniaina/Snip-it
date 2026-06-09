<template>
  <div class="page fade-in">
    <div class="page-header">
      <h1 class="page-title">Réinitialisation</h1>
      <p class="page-subtitle">Choisissez ce que vous voulez supprimer</p>
    </div>

    <!-- Sélecteur de mode -->
    <div class="mode-selector mb-6">
      <div class="mode-card" :class="{ active: mode === 'local' }" @click="mode = 'local'">
        <div class="mode-icon local">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
        </div>
        <div>
          <h4>NewApp uniquement</h4>
          <p class="text-sm text-muted mt-1">Vide le localStorage.<br>SnipeIT <strong>non touché</strong>.</p>
        </div>
        <div class="radio-dot" :class="{ selected: mode === 'local' }"></div>
      </div>

      <div class="mode-card danger-mode" :class="{ active: mode === 'both' }" @click="mode = 'both'">
        <div class="mode-icon both">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <div>
          <h4>NewApp + SnipeIT (tout)</h4>
          <p class="text-sm text-muted mt-1">
            Supprime dans SnipeIT :<br>
            <span class="text-red mono text-xs">assets · modèles · catégories · fabricants · localisations · statuts · entreprises · départements</span>
          </p>
        </div>
        <div class="radio-dot" :class="{ selected: mode === 'both' }"></div>
      </div>
    </div>

    <!-- Périmètre de suppression -->
    <div class="card mb-6" :class="mode === 'both' ? 'danger-card' : 'warning-card'">
      <div class="flex-center gap-3 mb-4">
        <div class="warn-icon" :class="{ 'red-icon': mode === 'both' }">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div>
          <h3 :style="mode === 'both' ? 'color:var(--red)' : 'color:var(--yellow)'">
            {{ mode === 'both' ? 'Suppression totale — IRRÉVERSIBLE dans SnipeIT' : 'Réinitialisation locale uniquement' }}
          </h3>
        </div>
      </div>

      <!-- Données locales -->
      <div class="scope-section-label">NewApp (localStorage)</div>
      <div class="scope-list">
        <div class="scope-item" v-for="s in localScope" :key="s.label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          <span>{{ s.label }}</span>
          <span class="mono text-xs text-muted">({{ s.count }})</span>
          <span class="badge badge-blue ml-auto">localStorage</span>
        </div>
      </div>

      <!-- Données SnipeIT -->
      <template v-if="mode === 'both'">
        <div class="scope-divider">SnipeIT — supprimé via API</div>
        <div class="scope-list">
          <div class="scope-item danger-scope" v-for="s in snipeitScope" :key="s.label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            <span>{{ s.label }}</span>
            <span class="mono text-xs" style="color:var(--red)">{{ s.endpoint }}</span>
            <span class="badge badge-red ml-auto">SnipeIT API</span>
          </div>
        </div>
      </template>
    </div>

    <!-- Confirmation -->
    <div class="card">
      <h3 class="mb-4">Confirmer</h3>

      <div class="form-group">
        <label class="form-label">
          Tapez <span class="mono text-accent">{{ confirmWord }}</span> pour confirmer
        </label>
        <input v-model="confirmText" type="text" class="form-control" :placeholder="confirmWord" />
      </div>

      <!-- Progression SnipeIT -->
      <div v-if="loading && mode === 'both'" class="progress-section mb-4">
        <div class="progress-step" v-if="currentStep">
          <span class="loader"></span>
          <span class="mono text-sm">{{ currentStep }}</span>
        </div>

        <!-- Résultats par entité en temps réel -->
        <div v-if="Object.keys(partialResults).length" class="results-grid mt-3">
          <div
            v-for="(r, label) in partialResults"
            :key="label"
            class="result-chip"
            :class="r.errors > 0 ? 'result-warn' : 'result-ok'"
          >
            <span class="result-label">{{ label }}</span>
            <span class="result-count">{{ r.deleted }}/{{ r.total }}</span>
            <span v-if="r.errors" class="result-err">{{ r.errors }} err.</span>
          </div>
        </div>
      </div>

      <div v-if="done" class="alert alert-success mb-4">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        {{ doneMsg }}
      </div>
      <div v-if="error" class="alert alert-danger mb-4">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg>
        {{ error }}
      </div>

      <div class="flex gap-3">
        <button
          class="btn btn-danger btn-lg"
          :disabled="confirmText !== confirmWord || loading"
          @click="doReset"
        >
          <span v-if="loading" class="loader"></span>
          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.9L1 10"/></svg>
          {{ mode === 'both' ? 'Supprimer tout (NewApp + SnipeIT)' : 'Réinitialiser NewApp' }}
        </button>
        <router-link to="/backoffice/dashboard" class="btn btn-secondary btn-lg">Annuler</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useDbStore } from '@/stores/db'
import { fullResetSnipeIT } from '@/services/snipeit'

const db = useDbStore()

const mode           = ref('local')
const confirmText    = ref('')
const loading        = ref(false)
const done           = ref(false)
const doneMsg        = ref('')
const error          = ref('')
const currentStep    = ref('')
const partialResults = ref({})

const confirmWord = computed(() => mode.value === 'both' ? 'SUPPRIMER TOUT' : 'RESET')

const localScope = computed(() => [
  { label: 'Assets',              count: db.assets.length },
  { label: 'Catégories',          count: db.categories.length },
  { label: 'Localisations',       count: db.locations.length },
  { label: 'Feuil 2 (SQLite)',    count: db.feuil2.length },
  { label: 'Tickets',             count: db.tickets.length },
])

const snipeitScope = [
  { label: 'Assets (Hardware)',   endpoint: 'DELETE /hardware/:id' },
  { label: 'Modèles',             endpoint: 'DELETE /models/:id' },
  { label: 'Catégories',          endpoint: 'DELETE /categories/:id' },
  { label: 'Fabricants',          endpoint: 'DELETE /manufacturers/:id' },
  { label: 'Localisations',       endpoint: 'DELETE /locations/:id' },
  { label: 'Statuts',             endpoint: 'DELETE /statuslabels/:id' },
  { label: 'Entreprises',         endpoint: 'DELETE /companies/:id' },
  { label: 'Départements',        endpoint: 'DELETE /departments/:id' },
]

async function doReset() {
  loading.value        = true
  error.value          = ''
  done.value           = false
  currentStep.value    = ''
  partialResults.value = {}

  try {
    if (mode.value === 'both') {
      // ── Reset SnipeIT complet ──
      const results = await fullResetSnipeIT((step) => {
        currentStep.value = step
        // Extraire le nom de l'entité depuis le message pour l'affichage
        const match = step.match(/Suppression : (.+)…/)
        if (match) partialResults.value[match[1]] = { total: '?', deleted: 0, errors: 0 }
      })

      // Mettre à jour les résultats finaux
      partialResults.value = results

      const totalDeleted = Object.values(results).reduce((s, r) => s + (r.deleted || 0), 0)
      const totalErrors  = Object.values(results).reduce((s, r) => s + (r.errors  || 0), 0)

      // Vider le localStorage
      db.resetAll()

      currentStep.value = ''
      doneMsg.value = totalErrors === 0
        ? `✓ ${totalDeleted} éléments supprimés dans SnipeIT. NewApp vidée.`
        : `✓ ${totalDeleted} supprimés, ${totalErrors} erreur(s). NewApp vidée.`

    } else {
      // ── Local uniquement ──
      await new Promise(r => setTimeout(r, 400))
      db.resetAll()
      doneMsg.value = '✓ NewApp réinitialisée. SnipeIT non modifié.'
    }

    done.value        = true
    confirmText.value = ''

  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.mode-selector { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 700px) { .mode-selector { grid-template-columns: 1fr; } }

.mode-card {
  display: flex; align-items: flex-start; gap: 16px;
  padding: 20px; background: var(--bg2);
  border: 2px solid var(--border); border-radius: var(--radius2);
  cursor: pointer; transition: all 0.2s;
}
.mode-card:hover { border-color: var(--border2); }
.mode-card.active { border-color: var(--accent); background: var(--accentbg); }
.mode-card.danger-mode.active { border-color: var(--red); background: var(--redbg); }

.mode-icon {
  width: 44px; height: 44px; flex-shrink: 0;
  border-radius: var(--radius);
  display: flex; align-items: center; justify-content: center;
}
.mode-icon.local { background: var(--bluebg); color: var(--blue); }
.mode-icon.both  { background: var(--redbg);  color: var(--red); }

.radio-dot {
  width: 18px; height: 18px; margin-left: auto; flex-shrink: 0;
  border: 2px solid var(--border2); border-radius: 50%; transition: all 0.15s;
}
.radio-dot.selected { border-color: var(--accent); background: var(--accent); }
.danger-mode .radio-dot.selected { border-color: var(--red); background: var(--red); }

.warning-card { border-color: var(--yellow); background: linear-gradient(135deg, var(--bg2), rgba(255,216,77,0.04)); }
.danger-card  { border-color: var(--red);    background: linear-gradient(135deg, var(--bg2), rgba(255,77,109,0.05)); }

.warn-icon {
  width: 56px; height: 56px; flex-shrink: 0;
  background: var(--yellowbg); border-radius: 50%;
  display: flex; align-items: center; justify-content: center; color: var(--yellow);
}
.warn-icon.red-icon { background: var(--redbg); color: var(--red); }

.scope-section-label {
  font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.12em;
  color: var(--text3); font-family: var(--font-mono); margin-bottom: 8px;
}
.scope-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.scope-item {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 14px; background: var(--bg3);
  border-radius: var(--radius); font-size: 0.875rem; color: var(--text2);
}
.scope-item svg { color: var(--yellow); flex-shrink: 0; }
.danger-scope { border: 1px solid rgba(255,77,109,0.2); }
.danger-scope svg { color: var(--red); }
.ml-auto { margin-left: auto; }

.scope-divider {
  display: flex; align-items: center; gap: 12px;
  font-size: 0.7rem; color: var(--red);
  font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.1em;
  margin: 10px 0 8px;
}
.scope-divider::before, .scope-divider::after {
  content: ''; flex: 1; height: 1px; background: var(--red); opacity: 0.3;
}

/* Progression */
.progress-section { background: var(--bg3); border-radius: var(--radius); padding: 14px; border: 1px solid var(--border); }
.progress-step { display: flex; align-items: center; gap: 10px; }

.results-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.result-chip {
  display: flex; align-items: center; gap: 6px;
  padding: 5px 10px; border-radius: 20px;
  font-size: 0.75rem; font-family: var(--font-mono);
  border: 1px solid;
}
.result-ok   { background: var(--greenbg); border-color: var(--green); color: var(--green); }
.result-warn { background: var(--yellowbg); border-color: var(--yellow); color: var(--yellow); }
.result-label { font-weight: 600; }
.result-count { opacity: 0.8; }
.result-err   { color: var(--red); }
</style>
