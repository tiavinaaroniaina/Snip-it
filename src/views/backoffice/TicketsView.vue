<template>
  <div class="page fade-in">
    <div class="page-header flex-between">
      <div>
        <h1 class="page-title">Tickets</h1>
        <p class="page-subtitle">{{ db.tickets.length }} ticket(s) au total</p>
      </div>
      <div class="flex gap-3">
        <select v-model="filterStatus" class="form-control" style="width:160px">
          <option value="">Tous les statuts</option>
          <option value="open">Ouverts</option>
          <option value="in_progress">En cours</option>
          <option value="resolved">Résolus</option>
          <option value="closed">Fermés</option>
        </select>
      </div>
    </div>

    <!-- Stat bar -->
    <div class="stat-bar mb-6">
      <div class="stat-bar-item" v-for="(label, key) in statuses" :key="key" @click="filterStatus = key === filterStatus ? '' : key" :class="{ active: filterStatus === key }">
        <span :class="`badge badge-${statusColor(key)}`">{{ db.ticketsByStatus[key] || 0 }}</span>
        <span class="stat-bar-label">{{ label }}</span>
      </div>
    </div>

    <!-- Liste tickets -->
    <div class="tickets-list" v-if="filtered.length">
      <div
        v-for="t in filtered"
        :key="t.id"
        class="ticket-card"
        @click="openTicket(t)"
      >
        <div class="ticket-header">
          <span class="ticket-id mono">#{{ t.id.toString().slice(-6) }}</span>
          <span :class="`badge badge-${statusColor(t.status)}`">{{ statusLabel(t.status) }}</span>
        </div>
        <h4 class="ticket-title">{{ t.title }}</h4>
        <p class="ticket-desc" v-if="t.description">{{ t.description }}</p>
        <div class="ticket-footer">
          <div class="flex-center gap-2 text-muted text-xs">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/></svg>
            {{ t.assets?.length || 0 }} élément(s) associé(s)
          </div>
          <span class="mono text-xs text-muted">{{ fmtDate(t.created_at) }}</span>
        </div>
      </div>
    </div>

    <div class="empty-state" v-else>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/></svg>
      <h4>Aucun ticket {{ filterStatus ? `"${filterStatus}"` : '' }}</h4>
      <p>Les tickets sont créés depuis le frontoffice.</p>
    </div>

    <!-- Fiche ticket (modal) -->
    <div class="modal-backdrop" v-if="selected" @click.self="selected = null">
      <div class="modal ticket-modal fade-in">
        <div class="flex-between mb-4">
          <span class="mono text-muted text-sm">#{{ selected.id.toString().slice(-6) }}</span>
          <button class="btn btn-secondary btn-sm btn-icon" @click="selected = null">✕</button>
        </div>

        <h2 class="modal-title">{{ selected.title }}</h2>
        <p class="text-muted text-sm mb-4">{{ selected.description || 'Pas de description.' }}</p>

        <!-- Statut -->
        <div class="form-group">
          <label class="form-label">Changer le statut</label>
          <div class="flex gap-2 flex-wrap">
            <button
              v-for="(label, key) in statuses"
              :key="key"
              :class="`btn btn-sm badge-btn badge-${statusColor(key)} ${selected.status === key ? 'active-status' : ''}`"
              @click="changeStatus(selected, key)"
            >
              {{ label }}
            </button>
          </div>
        </div>

        <!-- Éléments associés -->
        <div class="form-group">
          <label class="form-label">Éléments associés ({{ selected.assets?.length || 0 }})</label>
          <div v-if="selected.assets?.length" class="assets-chips">
            <span class="chip" v-for="a in selected.assets" :key="a.id">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/></svg>
              {{ a.name || a.asset_tag }}
            </span>
          </div>
          <p class="text-muted text-sm" v-else>Aucun élément associé.</p>
        </div>

        <!-- Méta -->
        <div class="meta-grid">
          <div>
            <div class="form-label">Créé le</div>
            <div class="text-sm mono">{{ fmtDate(selected.created_at) }}</div>
          </div>
          <div v-if="selected.updated_at">
            <div class="form-label">Mis à jour</div>
            <div class="text-sm mono">{{ fmtDate(selected.updated_at) }}</div>
          </div>
          <div>
            <div class="form-label">Demandeur</div>
            <div class="text-sm">{{ selected.requester || 'Anonyme' }}</div>
          </div>
        </div>

        <div class="divider"></div>
        <div class="flex gap-3">
          <button class="btn btn-danger btn-sm" @click="deleteTicket(selected.id)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            Supprimer
          </button>
          <button class="btn btn-secondary btn-sm" @click="selected = null">Fermer</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useDbStore } from '@/stores/db'

const db = useDbStore()
const filterStatus = ref('')
const selected = ref(null)

const statuses = {
  open:        'Ouvert',
  in_progress: 'En cours',
  resolved:    'Résolu',
  closed:      'Fermé',
}

const filtered = computed(() => {
  if (!filterStatus.value) return db.tickets
  return db.tickets.filter(t => t.status === filterStatus.value)
})

function statusColor(s) {
  const map = { open:'red', in_progress:'yellow', resolved:'green', closed:'gray' }
  return map[s] || 'gray'
}
function statusLabel(s) {
  return statuses[s] || s
}
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
}

function openTicket(t) { selected.value = { ...t } }

function changeStatus(ticket, status) {
  db.updateTicketStatus(ticket.id, status)
  selected.value = db.tickets.find(t => t.id === ticket.id)
}

function deleteTicket(id) {
  if (confirm('Supprimer ce ticket ?')) {
    db.deleteTicket(id)
    selected.value = null
  }
}
</script>

<style scoped>
.stat-bar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.stat-bar-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.15s;
}
.stat-bar-item:hover { border-color: var(--border2); }
.stat-bar-item.active { border-color: var(--accent); background: var(--accentbg); }
.stat-bar-label { font-size: 0.8rem; color: var(--text2); }

.tickets-list { display: flex; flex-direction: column; gap: 12px; }

.ticket-card {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--radius2);
  padding: 20px;
  cursor: pointer;
  transition: all 0.15s;
}
.ticket-card:hover { border-color: var(--border2); transform: translateY(-1px); box-shadow: var(--shadow2); }

.ticket-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.ticket-id { color: var(--text3); font-size: 0.75rem; }
.ticket-title { font-family: var(--font-display); font-weight: 600; font-size: 1rem; margin-bottom: 4px; }
.ticket-desc { font-size: 0.875rem; color: var(--text2); margin-bottom: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ticket-footer { display: flex; align-items: center; justify-content: space-between; }

.ticket-modal { max-width: 600px; }
.assets-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 12px;
  background: var(--bg3); border: 1px solid var(--border2);
  border-radius: 20px; font-size: 0.8rem; color: var(--text2);
}
.meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 16px; }
.badge-btn {
  border: 1px solid;
  border-radius: 20px;
  cursor: pointer;
  font-family: var(--font-mono);
}
.active-status { font-weight: 700; }
</style>
