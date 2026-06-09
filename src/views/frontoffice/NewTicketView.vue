<template>
  <div class="page fade-in">
    <div class="page-header">
      <router-link to="/front/assets" class="back-link">← Retour au catalogue</router-link>
      <h1 class="page-title mt-2">Créer un ticket</h1>
      <p class="page-subtitle">Décrivez votre problème et associez les éléments concernés</p>
    </div>

    <!-- Succès -->
    <div v-if="success" class="success-overlay fade-in">
      <div class="success-box">
        <div class="success-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2>Ticket créé !</h2>
        <p class="text-muted">Votre ticket <span class="mono text-accent">#{{ createdId }}</span> a été enregistré.</p>
        <div class="flex gap-3 mt-6">
          <router-link to="/front/assets" class="btn btn-primary">Retour au catalogue</router-link>
          <button class="btn btn-secondary" @click="resetForm">Nouveau ticket</button>
        </div>
      </div>
    </div>

    <div class="ticket-form-layout" v-else>
      <!-- ── Formulaire ────────────────────────────── -->
      <div class="form-col">
        <div class="card">
          <div class="card-header"><h3>Informations du ticket</h3></div>

          <div class="form-group">
            <label class="form-label">Titre *</label>
            <input v-model="form.title" type="text" class="form-control" placeholder="Ex: Écran cassé, panne réseau..." />
            <p v-if="errors.title" class="field-error">{{ errors.title }}</p>
          </div>

          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea v-model="form.description" class="form-control" rows="4" placeholder="Décrivez le problème en détail..."></textarea>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Priorité</label>
              <select v-model="form.priority" class="form-control">
                <option value="low">Basse</option>
                <option value="medium">Normale</option>
                <option value="high">Haute</option>
                <option value="critical">Critique</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Votre nom</label>
              <input v-model="form.requester" type="text" class="form-control" placeholder="Prénom Nom" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Email de contact</label>
            <input v-model="form.email" type="email" class="form-control" placeholder="votre@email.com" />
          </div>
        </div>

        <!-- Résumé -->
        <div class="card summary-card mt-4">
          <h4 class="mb-3">Résumé</h4>
          <div class="summary-row">
            <span class="text-muted text-sm">Titre</span>
            <span class="text-sm">{{ form.title || '—' }}</span>
          </div>
          <div class="summary-row">
            <span class="text-muted text-sm">Priorité</span>
            <span :class="`badge badge-${priorityColor(form.priority)}`">{{ priorityLabel(form.priority) }}</span>
          </div>
          <div class="summary-row">
            <span class="text-muted text-sm">Éléments</span>
            <span class="text-sm">{{ selectedAssets.length }} associé(s)</span>
          </div>

          <div class="divider"></div>
          <button class="btn btn-primary btn-lg w-full" @click="submit" :disabled="submitting">
            <span v-if="submitting" class="loader"></span>
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/></svg>
            Créer le ticket
          </button>
        </div>
      </div>

      <!-- ── Sélection d'éléments ───────────────────── -->
      <div class="assets-col">
        <div class="card">
          <div class="card-header">
            <div>
              <h3>Éléments concernés</h3>
              <p class="text-sm text-muted mt-1">{{ selectedAssets.length }} sélectionné(s)</p>
            </div>
          </div>

          <!-- Chips sélectionnés -->
          <div class="selected-chips" v-if="selectedAssets.length">
            <div class="chip-selected" v-for="a in selectedAssets" :key="a.id">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/></svg>
              {{ a.name || a.asset_tag }}
              <button @click="removeAsset(a.id)" class="chip-remove">✕</button>
            </div>
          </div>

          <!-- Recherche -->
          <div class="search-bar mt-3 mb-3">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input v-model="assetSearch" type="text" class="form-control" placeholder="Rechercher un élément..." />
          </div>

          <div class="asset-picker" v-if="db.assets.length">
            <div
              v-for="a in filteredPickerAssets"
              :key="a.id"
              class="picker-item"
              :class="{ selected: isSelected(a.id) }"
              @click="toggleAsset(a)"
            >
              <div class="picker-check">
                <svg v-if="isSelected(a.id)" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div class="picker-info">
                <div class="picker-name">{{ a.name || a.asset_tag }}</div>
                <div class="picker-meta">
                  <span class="tag">{{ a.category || '—' }}</span>
                  <span class="mono text-xs text-muted">{{ a.asset_tag }}</span>
                </div>
              </div>
              <span :class="`badge badge-${assetStatusBadge(a.status)} badge-xs`">{{ a.status || 'N/A' }}</span>
            </div>
          </div>

          <div class="empty-state" v-else style="padding:30px">
            <p class="text-sm">Aucun élément disponible. Importez-en depuis le backoffice.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useDbStore } from '@/stores/db'

const db    = useDbStore()
const route = useRoute()

const form = ref({
  title:       '',
  description: '',
  priority:    'medium',
  requester:   '',
  email:       '',
})
const errors         = ref({})
const selectedAssets = ref([])
const assetSearch    = ref('')
const submitting     = ref(false)
const success        = ref(false)
const createdId      = ref(null)

onMounted(() => {
  const id = route.query.assetId
  if (id) {
    const a = db.assets.find(a => String(a.id) === String(id))
    if (a) selectedAssets.value = [a]
  }
})

const filteredPickerAssets = computed(() => {
  if (!assetSearch.value) return db.assets.slice(0, 50)
  const q = assetSearch.value.toLowerCase()
  return db.assets.filter(a =>
    a.name?.toLowerCase().includes(q) ||
    a.asset_tag?.toLowerCase().includes(q) ||
    a.category?.toLowerCase().includes(q)
  ).slice(0, 50)
})

function isSelected(id) { return selectedAssets.value.some(a => a.id === id) }
function toggleAsset(a) {
  if (isSelected(a.id)) removeAsset(a.id)
  else selectedAssets.value.push(a)
}
function removeAsset(id) { selectedAssets.value = selectedAssets.value.filter(a => a.id !== id) }

function priorityColor(p) {
  return { low:'gray', medium:'blue', high:'yellow', critical:'red' }[p] || 'gray'
}
function priorityLabel(p) {
  return { low:'Basse', medium:'Normale', high:'Haute', critical:'Critique' }[p] || p
}
function assetStatusBadge(s) {
  if (!s) return 'badge-gray'
  const sl = s.toLowerCase()
  if (sl.includes('ready') || sl.includes('dispo')) return 'badge-green'
  if (sl.includes('deploy')) return 'badge-blue'
  if (sl.includes('repair')) return 'badge-yellow'
  return 'badge-gray'
}

function validate() {
  errors.value = {}
  if (!form.value.title.trim()) errors.value.title = 'Le titre est obligatoire.'
  return !Object.keys(errors.value).length
}

async function submit() {
  if (!validate()) return
  submitting.value = true
  await new Promise(r => setTimeout(r, 500))
  const t = db.createTicket({
    ...form.value,
    assets: selectedAssets.value,
  })
  createdId.value  = t.id.toString().slice(-6)
  success.value    = true
  submitting.value = false
}

function resetForm() {
  form.value       = { title: '', description: '', priority: 'medium', requester: '', email: '' }
  selectedAssets.value = []
  errors.value     = {}
  success.value    = false
  createdId.value  = null
}
</script>

<style scoped>
.back-link { font-size: 0.875rem; color: var(--text2); text-decoration: none; }
.back-link:hover { color: var(--accent); }

.ticket-form-layout {
  display: grid;
  grid-template-columns: 1fr 420px;
  gap: 24px;
  align-items: start;
}
@media (max-width: 900px) {
  .ticket-form-layout { grid-template-columns: 1fr; }
}

.summary-card {
  background: linear-gradient(135deg, var(--bg2), var(--bg3));
  border-color: var(--border2);
}
.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}
.summary-row:last-child { border-bottom: none; }

.selected-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip-selected {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  background: var(--accentbg);
  border: 1px solid var(--accent);
  border-radius: 20px;
  font-size: 0.8rem;
  color: var(--accent);
}
.chip-remove {
  background: none;
  border: none;
  color: var(--accent);
  cursor: pointer;
  font-size: 0.7rem;
  line-height: 1;
  padding: 0 2px;
  opacity: 0.7;
}
.chip-remove:hover { opacity: 1; }

.asset-picker { max-height: 400px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }

.picker-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid transparent;
}
.picker-item:hover { background: var(--bg3); }
.picker-item.selected { background: var(--accentbg); border-color: var(--accent); }

.picker-check {
  width: 20px; height: 20px;
  border: 2px solid var(--border2);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;
}
.selected .picker-check { background: var(--accent); border-color: var(--accent); color: #fff; }

.picker-info { flex: 1; min-width: 0; }
.picker-name { font-size: 0.875rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.picker-meta { display: flex; gap: 8px; align-items: center; margin-top: 2px; }

.badge-xs { font-size: 0.65rem; padding: 2px 7px; }

.field-error { color: var(--red); font-size: 0.75rem; margin-top: 4px; }

/* Success overlay */
.success-overlay {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}
.success-box {
  text-align: center;
  padding: 40px;
  background: var(--bg2);
  border: 1px solid var(--border2);
  border-radius: var(--radius2);
  max-width: 420px;
}
.success-icon {
  width: 72px; height: 72px;
  background: var(--greenbg);
  border: 2px solid var(--green);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--green);
  margin: 0 auto 20px;
}
</style>
