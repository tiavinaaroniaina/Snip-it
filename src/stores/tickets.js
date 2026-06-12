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
// Accepte les clés originales ET normalisées (minuscules après normalizeCSVHeaders)
const STATUS_MAP = {
  'New':         'open',
  'new':         'open',
  'Open':        'open',
  'open':        'open',
  'In Progress': 'in_progress',
  'in_progress': 'in_progress',
  'in progress': 'in_progress',
  'Resolved':    'resolved',
  'resolved':    'resolved',
  'Closed':      'closed',
  'closed':      'closed',
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
   * @param {Array}  feuil2Rows  - lignes issues de db.feuil2
   * @param {Array}  allAssets   - (optionnel) assets du store pour enrichir les catégories
   * @returns {number}
   */
  function syncFromFeuil2(feuil2Rows, allAssets = []) {
    const catMap = Object.fromEntries(
      allAssets.filter(a => a.category_id).map(a => [a.asset_tag || a.id, a.category_id])
    )

    const converted = feuil2Rows.map(row => {
      // Parser les assets depuis le champ Items (JSON array de strings)
      let assets = []
      try {
        const raw  = row['items'] || row['Items'] || '[]'
        const tags = JSON.parse(raw)
        assets = tags.map(tag => {
          const key = String(tag)
          return {
            id:         catMap[key] ? `${catMap[key]}-${key}` : key,
            asset_tag:  tag,
            name:       tag,
            category_id: catMap[key] || null,
          }
        })
      } catch { /* Items mal formé, on ignore */ }

      // Construire l'ISO date depuis Date + Heure du CSV
      // Clés normalisées : Date → date, Heure → heure
      let created_at = new Date().toISOString()
      try {
        const [d, m, y] = (row['date'] || row['Date'] || '').split('/')
        const heure     = row['heure'] || row['Heure'] || '00:00'
        if (d && m && y) created_at = new Date(`${y}-${m}-${d}T${heure}:00`).toISOString()
      } catch { /* date invalide */ }

      const rawStatus = row['status'] || row['Status'] || ''
      const status    = STATUS_MAP[rawStatus] || 'open'

      // Les clés sont normalisées par normalizeCSVHeaders() :
      // Titre → titre, Num_Ticket → num_ticket, Description → description,
      // Status → status, Priority → priority, Items → items, Date → date, Heure → heure
      const numTicket = row['num_ticket'] || row['Num_Ticket'] || row['_id']
      return {
        id:           Number(numTicket) || Date.now(),
        title:        row['titre']       || row['Titre']       || `Ticket #${numTicket}`,
        description:  row['description'] || row['Description'] || '',
        status,
        priority:     row['priority']    || row['Priority']    || 'Medium',
        assets,
        created_at,
        _from_feuil2: true,
      }
    })

    // Fusionner : conserver les tickets créés depuis le frontoffice (_from_feuil2 absent)
    // et remplacer uniquement les tickets issus du CSV (_from_feuil2: true)
    const frontofficeTickets = tickets.value.filter(t => !t._from_feuil2)
    tickets.value = [...converted, ...frontofficeTickets]
    save(tickets.value)
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