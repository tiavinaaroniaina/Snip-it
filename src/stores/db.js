// store/db.js
// assets / categories / locations / tickets → localStorage
// feuil2 → SQLite réel via backend Node (server/index.js sur port 3001)
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { fetchAssets, fetchCategories, fetchLocations } from '@/services/snipeit'

const KEYS = {
  assets:     'snipeit_assets',
  categories: 'snipeit_categories',
  locations:  'snipeit_locations',
  tickets:    'snipeit_tickets',
}

function load(key, fallback = []) {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch { return fallback }
}
function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

export const useDbStore = defineStore('db', () => {
  // ── State ─────────────────────────────────────────────
  const assets     = ref(load(KEYS.assets))
  const categories = ref(load(KEYS.categories))
  const locations  = ref(load(KEYS.locations))
  const feuil2     = ref([])   // chargé depuis SQLite via /api/feuil2
  const feuil2Loading = ref(false)
  const feuil2Error   = ref('')
  const tickets    = ref(load(KEYS.tickets))
  const syncing    = ref(false)
  const syncError  = ref('')

  // ── Computed ──────────────────────────────────────────
  // Catégories : depuis l'API SnipeIT (categories[]) OU extraites des assets
  const assetsByType = computed(() => {
    // Priorité 1 : categories chargées depuis SnipeIT
    if (categories.value.length) {
      const map = {}
      categories.value.forEach(c => {
        // Compter les assets qui ont cette catégorie
        const count = assets.value.filter(a =>
          a.category === c.name || a.category_id === c.id
        ).length
        if (count > 0 || categories.value.length <= 10) {
          map[c.name] = count
        }
      })
      return map
    }
    // Priorité 2 : extraire les catégories des assets importés
    const map = {}
    assets.value.forEach(a => {
      const t = a.category || 'Autre'
      map[t] = (map[t] || 0) + 1
    })
    return map
  })

  // Liste des noms de catégories (pour les filtres)
  const categoryNames = computed(() => {
    if (categories.value.length) {
      return categories.value.map(c => c.name).filter(Boolean)
    }
    return [...new Set(assets.value.map(a => a.category).filter(Boolean))]
  })

  // Liste des noms de localisations (pour les filtres)
  const locationNames = computed(() => {
    if (locations.value.length) {
      return locations.value.map(l => l.name).filter(Boolean)
    }
    return [...new Set(assets.value.map(a => a.location).filter(Boolean))]
  })

  const ticketsByStatus = computed(() => {
    const map = { open: 0, in_progress: 0, resolved: 0, closed: 0 }
    tickets.value.forEach(t => {
      if (map[t.status] !== undefined) map[t.status]++
      else map[t.status] = 1
    })
    return map
  })

  // ── Sync depuis SnipeIT ────────────────────────────────
  async function syncFromSnipeIT() {
    syncing.value  = true
    syncError.value = ''
    const results  = { assets: 0, categories: 0, locations: 0, errors: [] }

    // 1. Charger les catégories
    try {
      const catData = await fetchCategories({ category_type: 'asset' })
      // Réponse SnipeIT : { total: N, rows: [{id, name, category_type, ...}] }
      const cats = (catData.rows || []).map(c => ({
        id:   c.id,
        name: c.name,
        type: c.category_type,
        assets_count: c.assets_count || 0,
      }))
      categories.value = cats
      save(KEYS.categories, cats)
      results.categories = cats.length
    } catch (e) {
      results.errors.push('Catégories : ' + e.message)
    }

    // 2. Charger les localisations
    try {
      const locData = await fetchLocations()
      const locs = (locData.rows || []).map(l => ({
        id:   l.id,
        name: l.name,
        address: l.address || '',
      }))
      locations.value = locs
      save(KEYS.locations, locs)
      results.locations = locs.length
    } catch (e) {
      results.errors.push('Localisations : ' + e.message)
    }

    // 3. Charger les assets
    try {
      const assetData = await fetchAssets()
      const rows = (assetData.rows || []).map(a => ({
        id:          a.id,
        name:        a.name,
        asset_tag:   a.asset_tag,
        // category est un objet dans la réponse SnipeIT : { id, name }
        category:    a.category?.name || '',
        category_id: a.category?.id   || null,
        location:    a.location?.name || '',
        location_id: a.location?.id   || null,
        status:      a.status_label?.name || '',
        model:       a.model?.name || '',
        serial:      a.serial || '',
        manufacturer: a.manufacturer?.name || '',
      }))
      assets.value = rows
      save(KEYS.assets, rows)
      results.assets = rows.length
    } catch (e) {
      results.errors.push('Assets : ' + e.message)
    }

    syncing.value = false
    if (results.errors.length) {
      syncError.value = results.errors.join(' | ')
    }
    return results
  }

  // ── Assets CRUD ───────────────────────────────────────
  function importAssets(rows) {
    assets.value = rows
    save(KEYS.assets, rows)
    // Extraire les catégories et localisations si pas encore chargées depuis API
    if (!categories.value.length) {
      const cats = [...new Set(rows.map(r => r.category).filter(Boolean))]
        .map((name, i) => ({ id: -(i+1), name, type: 'asset' }))
      categories.value = cats
      save(KEYS.categories, cats)
    }
    if (!locations.value.length) {
      const locs = [...new Set(rows.map(r => r.location).filter(Boolean))]
        .map((name, i) => ({ id: -(i+1), name }))
      locations.value = locs
      save(KEYS.locations, locs)
    }
  }

  function upsertAsset(asset) {
    const idx = assets.value.findIndex(a => a.id === asset.id)
    if (idx >= 0) assets.value[idx] = asset
    else assets.value.push(asset)
    save(KEYS.assets, assets.value)
  }

  // ── Feuil 2 — SQLite réel via backend Node ───────────

  // Charger les données depuis le backend SQLite
  async function loadFeuil2() {
    feuil2Loading.value = true
    feuil2Error.value   = ''
    try {
      const res  = await fetch('/api/feuil2')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      feuil2.value = data.rows || []
      // Resynchroniser les tickets si des données existent dans feuil2
      if (feuil2.value.length) syncFeuil2ToTickets()
    } catch (e) {
      feuil2Error.value = 'Backend SQLite inaccessible : ' + e.message +
        ' — Lancez : node server/index.js'
      feuil2.value = []
    } finally {
      feuil2Loading.value = false
    }
  }

  // Importer un tableau de lignes dans SQLite via le backend
  async function importFeuil2(rows) {
    feuil2Loading.value = true
    feuil2Error.value   = ''
    try {
      const res = await fetch('/api/feuil2/import', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ rows }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      // Recharger depuis SQLite pour avoir les vrais IDs auto-incrémentés
      await loadFeuil2()
      // Synchroniser automatiquement vers tickets
      syncFeuil2ToTickets()
    } catch (e) {
      feuil2Error.value = e.message
      throw e
    } finally {
      feuil2Loading.value = false
    }
  }

  // Vider la table feuil2 dans SQLite
  async function clearFeuil2() {
    try {
      await fetch('/api/feuil2', { method: 'DELETE' })
      feuil2.value = []
    } catch (e) {
      feuil2Error.value = 'Erreur suppression SQLite : ' + e.message
    }
  }

  // Synchroniser feuil2 → tickets (mapping colonnes CSV → format ticket)
  // Colonnes CSV : Num_Ticket, Date, Heure, Titre, Description, Status, Priority, Items
  function syncFeuil2ToTickets() {
    const STATUS_MAP = {
      'New':         'open',
      'Open':        'open',
      'In Progress': 'in_progress',
      'Resolved':    'resolved',
      'Closed':      'closed',
    }

    const converted = feuil2.value.map(row => {
      // Parser les assets depuis le champ Items (JSON array de strings)
      let assets = []
      try {
        const raw = row['Items'] || row['items'] || '[]'
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
        id:          Number(row['Num_Ticket'] || row['_id'] || Date.now()),
        title:       row['Titre']       || row['title']       || `Ticket #${row['Num_Ticket']}`,
        description: row['Description'] || row['description'] || '',
        status,
        priority:    row['Priority']    || row['priority']    || 'Medium',
        assets,
        created_at,
        _from_feuil2: true,   // marqueur pour distinguer l'origine
      }
    })

    tickets.value = converted
    save(KEYS.tickets, converted)
    return converted.length
  }

  // ── Tickets CRUD ──────────────────────────────────────
  function createTicket(ticket) {
    const newTicket = {
      ...ticket,
      id:         Date.now(),
      created_at: new Date().toISOString(),
      status:     'open',
    }
    tickets.value.unshift(newTicket)
    save(KEYS.tickets, tickets.value)
    return newTicket
  }

  function updateTicketStatus(id, status) {
    const t = tickets.value.find(t => t.id === id)
    if (t) {
      t.status     = status
      t.updated_at = new Date().toISOString()
      save(KEYS.tickets, tickets.value)
    }
  }

  function deleteTicket(id) {
    tickets.value = tickets.value.filter(t => t.id !== id)
    save(KEYS.tickets, tickets.value)
  }

  // ── Reset ─────────────────────────────────────────────
  async function resetAll() {
    // 1. Vider localStorage (assets, tickets, categories, locations)
    Object.values(KEYS).forEach(k => localStorage.removeItem(k))
    assets.value     = []
    categories.value = []
    locations.value  = []
    tickets.value    = []
    // 2. Vider SQLite via backend
    try {
      await fetch('/api/feuil2', { method: 'DELETE' })
    } catch { /* backend peut être absent */ }
    feuil2.value = []
  }

  return {
    // State
    assets, categories, locations, feuil2, tickets,
    syncing, syncError,
    // Computed
    assetsByType, categoryNames, locationNames, ticketsByStatus,
    // Actions
    syncFromSnipeIT,
    importAssets, upsertAsset,
    importFeuil2, loadFeuil2, clearFeuil2, syncFeuil2ToTickets,
    feuil2Loading, feuil2Error,
    createTicket, updateTicketStatus, deleteTicket,
    resetAll,
  }
})