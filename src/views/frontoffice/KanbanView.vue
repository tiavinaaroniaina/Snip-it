<template>
  <div class="page fade-in">
    <div class="page-header flex-between">
      <div>
        <h1 class="page-title">Tableau Kanban</h1>
        <p class="page-subtitle">Gérez vos tickets par glisser-déposer</p>
      </div>
    </div>

    <!-- Kanban Board -->
    <div class="kanban-board mt-6">
      <div 
        v-for="col in columns" 
        :key="col.id" 
        class="kanban-column"
        :style="{ backgroundColor: settings.kanbanColors[col.id] + '15' }"
        @dragover.prevent
        @drop="onDrop($event, col.id)"
      >
        <div class="column-header" :style="{ borderTopColor: settings.kanbanColors[col.id] }">
          <h3 class="column-title">
            {{ settings.statusNames[col.id] || col.label }}
            <span class="column-count">{{ getTicketsByStatus(col.id).length }}</span>
          </h3>
        </div>

        <div class="column-body">
          <!-- Bouton Ajouter Ticket (Uniquement dans la 1ère colonne 'open') -->
          <router-link 
            v-if="col.id === 'open'" 
            to="/front/ticket" 
            class="btn-add-inline mb-4"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Ajouter un ticket
          </router-link>

          <div 
            v-for="ticket in getTicketsByStatus(col.id)" 
            :key="ticket.id" 
            class="ticket-card"
            draggable="true"
            @dragstart="onDragStart($event, ticket)"
            @click="openTicket(ticket)"
          >
            <div class="ticket-priority" :class="ticket.priority"></div>
            <h4 class="ticket-title">{{ ticket.title }}</h4>
            <div class="ticket-meta">
              <span class="mono text-xs">#{{ ticket.id.toString().slice(-4) }}</span>
              <span class="text-xs text-muted">{{ fmtDate(ticket.created_at) }}</span>
            </div>
            <div class="ticket-assets" v-if="ticket.assets?.length">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
              {{ ticket.assets.length }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Coût (apparait quand on drop un ticket sur "Terminé") -->
    <CoutTicketModal
      v-if="coutTicket"
      :ticket="coutTicket"
      @validate="onCoutValidated"
      @close="onCoutCancelled"
    />

    <!-- Modal Détails Ticket -->
    <div v-if="selectedTicket" class="modal-overlay" @click="selectedTicket = null">
      <div class="modal-content card" @click.stop>
        <div class="modal-header">
          <h3>Détails du ticket #{{ selectedTicket.id.toString().slice(-4) }}</h3>
          <button class="btn-close" @click="selectedTicket = null">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Titre</label>
            <div class="text-lg fw-600">{{ selectedTicket.title }}</div>
          </div>
          <div class="form-group mt-4">
            <label class="form-label">Description</label>
            <div class="text-muted bg-light p-3 rounded">{{ selectedTicket.description || 'Pas de description' }}</div>
          </div>
          <div class="grid-2 mt-4">
            <div>
              <label class="form-label">Statut</label>
              <span class="badge text-capitalize" :class="`badge-${statusColor(selectedTicket.status)}`">
                {{ settings.statusNames[selectedTicket.status] || selectedTicket.status }}
              </span>
            </div>
            <div>
              <label class="form-label">Priorité</label>
              <span class="badge text-capitalize" :class="`badge-${priorityColor(selectedTicket.priority)}`">
                {{ selectedTicket.priority }}
              </span>
            </div>
          </div>
          <div class="form-group mt-4" v-if="selectedTicket.resolution_note">
            <label class="form-label">Note de résolution</label>
            <div class="text-green bg-green-light p-3 rounded border-green">{{ selectedTicket.resolution_note }}</div>
          </div>
          <div class="form-group mt-4">
            <label class="form-label">Éléments concernés ({{ selectedTicket.assets?.length || 0 }})</label>
            <div class="assets-list-mini">
              <div v-for="a in selectedTicket.assets" :key="a.asset_tag" class="asset-mini-tag">
                {{ a.name || a.asset_tag }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Confirmation Changement Statut (ex: pour "resolved") -->
    <div v-if="pendingChange" class="modal-overlay">
      <div class="modal-content card small-modal">
        <div class="modal-header">
          <h3>Informations supplémentaires</h3>
        </div>
        <div class="modal-body">
          <p class="mb-4">Veuillez saisir une note de résolution pour clôturer ce ticket :</p>
          <div class="form-group">
            <textarea 
              v-model="resolutionNote" 
              class="form-control" 
              rows="3" 
              placeholder="Qu'est-ce qui a été fait ?"
              autofocus
            ></textarea>
          </div>
          <div class="flex gap-3 mt-6">
            <button class="btn btn-secondary flex-1" @click="cancelChange">Annuler</button>
            <button class="btn btn-primary flex-1" @click="confirmChange" :disabled="!resolutionNote.trim()">Valider</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Confirmation Rétrogradation -->
    <ConfirmRetrogradeModal
      :is-open="showRetrogradeModal"
      :ticket-id="ticketToRetrograde?.id"
      @confirm-reouverture="onConfirmReouverture"
      @confirm-annulation="onConfirmAnnulation"
      @close="onRetrogradeModalClose"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useDbStore } from '@/stores/db'
import { useSettingsStore } from '@/stores/settings'
import CoutTicketModal from '@/components/CoutTicketModal.vue'
import ConfirmRetrogradeModal from '@/components/ConfirmRetrogradeModal.vue'

const db = useDbStore()
const settings = useSettingsStore()

const columns = [
  { id: 'open', label: 'Nouveau' },
  { id: 'in_progress', label: 'En cours' },
  { id: 'resolved', label: 'Terminé' }
]

const selectedTicket = ref(null)
const draggedTicket = ref(null)
const coutTicket = ref(null)

// Pour le dialogue de changement de statut
const pendingChange = ref(null)
const resolutionNote = ref('')
const savingCost = ref(false)

// Pour la rétrogradation des tickets
const showRetrogradeModal = ref(false)
const ticketToRetrograde = ref(null)
const newStatusForRetrograde = ref(null)

onMounted(async () => {
  await settings.load()
})

function getTicketsByStatus(status) {
  // Mapper certains statuts vers les colonnes si nécessaire (ex: closed -> resolved)
  return db.tickets.filter(t => {
    if (status === 'resolved') return t.status === 'resolved' || t.status === 'closed'
    return t.status === status
  })
}

function onDragStart(e, ticket) {
  draggedTicket.value = ticket
  e.dataTransfer.effectAllowed = 'move'
}

function onDrop(e, newStatus) {
  const ticket = draggedTicket.value
  if (!ticket || ticket.status === newStatus) return

  // Case 1: Moving a resolved/closed ticket to a non-resolved status
  if ((ticket.status === 'resolved' || ticket.status === 'closed') && (newStatus === 'open' || newStatus === 'in_progress')) {
    ticketToRetrograde.value = ticket
    newStatusForRetrograde.value = newStatus
    showRetrogradeModal.value = true
    return // Stop further processing for now, await modal action
  }

  // Existing logic for moving to resolved/closed with assets
  if ((newStatus === 'resolved' || newStatus === 'closed') && ticket.assets?.length) {
    coutTicket.value = ticket
    return
  }

  // Existing logic for moving to resolved/closed without assets
  if (newStatus === 'resolved' || newStatus === 'closed') {
    pendingChange.value = { ticketId: ticket.id, status: newStatus } // Use newStatus directly
    resolutionNote.value = ''
    return
  }

  // Default: Simply update status
  db.updateTicketStatus(ticket.id, newStatus)
}

async function onCoutValidated({ totalCost, items }) {
  if (!coutTicket.value) return
  savingCost.value = true
  try {
    const ticketId = coutTicket.value.id
    const groupeId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    await db.commitTicketCosts(ticketId, totalCost, items, groupeId)
    coutTicket.value = null
    draggedTicket.value = null

    // Déterminer le statut final après la validation du coût
    let targetStatus = 'resolved'
    if (ticketToRetrograde.value && ticketToRetrograde.value.id === ticketId) {
      targetStatus = newStatusForRetrograde.value
    }
    db.updateTicketStatus(ticketId, targetStatus)
  } catch (e) {
    alert('Erreur lors de l\'enregistrement des coûts : ' + e.message)
    coutTicket.value = null
    draggedTicket.value = null
  } finally {
    savingCost.value = false
  }
}

function onCoutCancelled() {
  coutTicket.value = null
  draggedTicket.value = null
}

async function onConfirmReouverture(ticketId) {
  // Re-use CoutTicketModal for reopening cost
  // Need to find the actual ticket object to pass it
  const ticket = db.tickets.find(t => t.id === ticketId)
  if (ticket) {
    coutTicket.value = ticket
  }
  showRetrogradeModal.value = false
  // The onCoutValidated function will handle the actual commit and status update
  // after the user enters the cost for reopening.
}

async function onConfirmAnnulation(ticketId) {
  try {
    await db.annulerDernierCout(ticketId) // Call the new backend function
    db.updateTicketStatus(ticketId, newStatusForRetrograde.value)
  } catch (e) {
    alert('Erreur lors de l\'annulation du dernier coût : ' + e.message)
  } finally {
    showRetrogradeModal.value = false
    ticketToRetrograde.value = null
    newStatusForRetrograde.value = null
    draggedTicket.value = null // Reset dragged ticket if it was set
  }
}

function onRetrogradeModalClose() {
  showRetrogradeModal.value = false
  // Revert ticket status back to resolved if the user just closed the modal
  if (ticketToRetrograde.value) {
    db.updateTicketStatus(ticketToRetrograde.value.id, 'resolved')
  }
  ticketToRetrograde.value = null
  newStatusForRetrograde.value = null
  draggedTicket.value = null // Reset dragged ticket if it was set
}

function confirmChange() {
  if (pendingChange.value) {
    const t = db.tickets.find(t => t.id === pendingChange.value.ticketId)
    if (t) {
      t.resolution_note = resolutionNote.value
      db.updateTicketStatus(t.id, pendingChange.value.status)
    }
    pendingChange.value = null
  }
}

function cancelChange() {
  pendingChange.value = null
  resolutionNote.value = ''
}

function openTicket(ticket) {
  selectedTicket.value = ticket
}

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

function statusColor(s) {
  const map = { open: 'red', in_progress: 'yellow', resolved: 'green', closed: 'gray' }
  return map[s] || 'gray'
}

function priorityColor(p) {
  const map = { low: 'blue', medium: 'yellow', high: 'orange', critical: 'red' }
  return map[p] || 'gray'
}

function priorityLabel(p) {
  const map = { low: 'Basse', medium: 'Normale', high: 'Haute', critical: 'Critique' }
  return map[p] || p
}
</script>

<style scoped>
.kanban-board {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  align-items: start;
  min-height: 70vh;
}

.kanban-column {
  border-radius: var(--radius2);
  display: flex;
  flex-direction: column;
  min-height: 500px;
  border: 1px solid var(--border);
  background: var(--bg2);
}

.column-header {
  padding: 16px;
  border-top: 4px solid var(--border);
  border-bottom: 1px solid var(--border);
  background: var(--bg2);
  border-radius: var(--radius2) var(--radius2) 0 0;
}

.column-title {
  font-size: 1rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.column-count {
  background: var(--bg3);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  color: var(--text3);
}

.column-body {
  padding: 12px;
  flex: 1;
}

.btn-add-inline {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px;
  background: var(--bg);
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  color: var(--text2);
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s;
}
.btn-add-inline:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accentbg);
}

.ticket-card {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px;
  margin-bottom: 12px;
  cursor: grab;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}
.ticket-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.06);
  border-color: var(--accent);
}
.ticket-card:active { cursor: grabbing; }

.ticket-priority {
  position: absolute;
  top: 0; left: 0; bottom: 0;
  width: 4px;
}
.ticket-priority.low      { background: var(--blue); }
.ticket-priority.medium   { background: var(--yellow); }
.ticket-priority.high     { background: var(--orange); }
.ticket-priority.critical { background: var(--red); }

.ticket-title {
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 8px;
  line-height: 1.4;
}

.ticket-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--text3);
}

.ticket-assets {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  color: var(--text3);
  margin-top: 8px;
  background: var(--bg3);
  width: fit-content;
  padding: 2px 6px;
  border-radius: 4px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}
.modal-content {
  width: 90%;
  max-width: 600px;
  background: var(--bg);
  padding: 0;
  overflow: hidden;
  animation: slideUp 0.3s ease;
}
.small-modal { max-width: 400px; }

.modal-header {
  padding: 16px 24px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.modal-body { padding: 24px; }
.btn-close {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: var(--text3);
}

.assets-list-mini {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.asset-mini-tag {
  background: var(--bg3);
  border: 1px solid var(--border);
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.75rem;
}

.bg-light { background: var(--bg3); }
.bg-green-light { background: var(--greenbg); }
.border-green { border: 1px solid var(--green); }

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
