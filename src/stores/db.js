// stores/db.js
// Store de façade : expose toutes les données et actions sous une seule interface
// pour maintenir la compatibilité avec les vues existantes (useDbStore()).
//
// En interne, délègue à useAssetsStore, useTicketsStore et useFeuil2Store.

import { defineStore } from 'pinia'
import { computed }    from 'vue'
import { useAssetsStore }  from '@/stores/assets'
import { useTicketsStore } from '@/stores/tickets'
import { useFeuil2Store }  from '@/stores/feuil2'

export const useDbStore = defineStore('db', () => {
  const assetsStore  = useAssetsStore()
  const ticketsStore = useTicketsStore()
  const feuil2Store  = useFeuil2Store()

  // ── State (proxies réactifs) ──────────────────────────
  const assets     = computed(() => assetsStore.assets)
  const categories = computed(() => assetsStore.categories)
  const locations  = computed(() => assetsStore.locations)
  const syncing    = computed(() => assetsStore.syncing)
  const syncError  = computed(() => assetsStore.syncError)

  const tickets         = computed(() => ticketsStore.tickets)
  const ticketsByStatus = computed(() => ticketsStore.ticketsByStatus)

  const feuil2        = computed(() => feuil2Store.rows)
  const feuil2Loading = computed(() => feuil2Store.loading)
  const feuil2Error   = computed(() => feuil2Store.error)

  // ── Computed (délégués) ───────────────────────────────
  const assetsByType  = computed(() => assetsStore.assetsByType)
  const categoryNames = computed(() => assetsStore.categoryNames)
  const locationNames = computed(() => assetsStore.locationNames)

  // ── Actions (délégués) ────────────────────────────────
  const syncFromSnipeIT = (...a) => assetsStore.syncFromSnipeIT(...a)
  const importAssets    = (...a) => assetsStore.importAssets(...a)
  const upsertAsset     = (...a) => assetsStore.upsertAsset(...a)

  const loadFeuil2          = ()     => feuil2Store.load()
  const importFeuil2        = (rows) => feuil2Store.importRows(rows)
  const clearFeuil2         = ()     => feuil2Store.clear()
  const syncFeuil2ToTickets = (rows) => ticketsStore.syncFromFeuil2(rows ?? feuil2Store.rows)

  const createTicket       = (...a) => ticketsStore.createTicket(...a)
  const updateTicketStatus = (...a) => ticketsStore.updateTicketStatus(...a)
  const deleteTicket       = (...a) => ticketsStore.deleteTicket(...a)

  async function resetAll() {
    assetsStore.clearAll()
    ticketsStore.clearAll()
    try { await feuil2Store.clear() } catch { /* backend peut être absent */ }
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
