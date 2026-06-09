// stores/feuil2.js
// Gestion des données Feuil 2 stockées dans SQLite via le backend Node.
// Source : server/index.js sur port 3001.

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiFetchFeuil2, apiImportFeuil2, apiClearFeuil2 } from '@/services/feuil2'
import { useTicketsStore } from '@/stores/tickets'

export const useFeuil2Store = defineStore('feuil2', () => {
  // ── State ─────────────────────────────────────────────
  const rows    = ref([])
  const loading = ref(false)
  const error   = ref('')

  // ── Actions ───────────────────────────────────────────

  /**
   * Charge les données depuis le backend SQLite.
   * Synchronise automatiquement les tickets si des données sont présentes.
   */
  async function load() {
    loading.value = true
    error.value   = ''
    try {
      rows.value = await apiFetchFeuil2()
      if (rows.value.length) {
        useTicketsStore().syncFromFeuil2(rows.value)
      }
    } catch (e) {
      error.value = 'Backend SQLite inaccessible : ' + e.message +
        ' — Lancez : node server/index.js'
      rows.value = []
    } finally {
      loading.value = false
    }
  }

  /**
   * Importe un tableau de lignes JSON dans SQLite puis recharge.
   * Synchronise aussi les tickets après l'import.
   *
   * @param {Array} newRows - lignes à importer
   */
  async function importRows(newRows) {
    loading.value = true
    error.value   = ''
    try {
      await apiImportFeuil2(newRows)
      await load() // recharge + sync tickets
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Vide la table feuil2 dans SQLite.
   */
  async function clear() {
    try {
      await apiClearFeuil2()
      rows.value = []
    } catch (e) {
      error.value = 'Erreur suppression SQLite : ' + e.message
    }
  }

  return {
    rows, loading, error,
    load, importRows, clear,
  }
})
