// stores/tickets.js
// Gestion des tickets de support.
// Persistance : localStorage.
// Source : création manuelle depuis le frontoffice, ou synchronisation depuis feuil2.

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const KEY = 'snipeit_tickets'

function load(fallback = []) {
  try {
    const v = localStorage.getItem(KEY)
    return v ? JSON.parse(v) : fallback
  } catch { return fallback }
}

function save(data) {
  localStorage.setItem(KEY, JSON.stringify(data))
}

// Mapping statuts CSV → statuts internes
const STATUS_MAP = {
  'New':         'open',
  'Open':        'open',
  'In Progress': 'in_progress',
  'Resolved':    'resolved',
  'Closed':      'closed',
}

export const useTicketsStore = defineStore('tickets', () => {
  // ── State ─────────────────────────────────────────────
  const tickets = ref(load())

  // ── Computed ──────────────────────────────────────────
  const ticketsByStatus = computed(() => {
    const map = { open: 0, in_progress: 0, resolved: 0, closed: 0 }
    tickets.value.forEach(t => {
      if (map[t.status] !== undefined) map[t.status]++
      else map[t.status] = 1
    })
    return map
  })

  // ── CRUD ──────────────────────────────────────────────
  function createTicket(ticket) {
    const newTicket = {
      ...ticket,
      id:         Date.now(),
      created_at: new Date().toISOString(),
      status:     'open',
    }
    tickets.value.unshift(newTicket)
    save(tickets.value)
    return newTicket
  }

  function updateTicketStatus(id, status) {
    const t = tickets.value.find(t => t.id === id)
    if (t) {
      t.status     = status
      t.updated_at = new Date().toISOString()
      save(tickets.value)
    }
  }

  function deleteTicket(id) {
    tickets.value = tickets.value.filter(t => t.id !== id)
    save(tickets.value)
  }

  /**
   * Synchronise les tickets depuis les données feuil2 (SQLite).
   * Convertit chaque ligne CSV → format ticket interne.
   * Colonnes : Num_Ticket, Date, Heure, Titre, Description, Status, Priority, Items
   *
   * @param {Array} feuil2Rows - lignes issues de db.feuil2
   * @returns {number} nombre de tickets synchronisés
   */
  function syncFromFeuil2(feuil2Rows) {
    const converted = feuil2Rows.map(row => {
      // Parser les assets depuis le champ Items (JSON array de strings)
      let assets = []
      try {
        const raw  = row['Items'] || row['items'] || '[]'
        const tags = JSON.parse(raw)
        assets = tags.map(tag => ({ id: tag, asset_tag: tag, name: tag }))
      } catch { /* Items mal formé, on ignore */ }

      // Construire l'ISO date depuis Date + Heure du CSV
      let created_at = new Date().toISOString()
      try {
        const [d, m, y] = (row['Date'] || '').split('/')
        const heure     = row['Heure'] || '00:00'
        if (d && m && y) created_at = new Date(`${y}-${m}-${d}T${heure}:00`).toISOString()
      } catch { /* date invalide */ }

      const rawStatus = row['Status'] || row['status'] || ''
      const status    = STATUS_MAP[rawStatus] || 'open'

      return {
        id:           Number(row['Num_Ticket'] || row['_id'] || Date.now()),
        title:        row['Titre']       || row['title']       || `Ticket #${row['Num_Ticket']}`,
        description:  row['Description'] || row['description'] || '',
        status,
        priority:     row['Priority']    || row['priority']    || 'Medium',
        assets,
        created_at,
        _from_feuil2: true,
      }
    })

    tickets.value = converted
    save(converted)
    return converted.length
  }

  function clearAll() {
    localStorage.removeItem(KEY)
    tickets.value = []
  }

  return {
    tickets, ticketsByStatus,
    createTicket, updateTicketStatus, deleteTicket,
    syncFromFeuil2, clearAll,
  }
})
