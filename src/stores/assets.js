// stores/assets.js
// Gestion des assets, catégories et localisations.
// Persistance : localStorage. Source : CSV importé ou API SnipeIT.

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { fetchAssets, fetchCategories, fetchLocations, fetchUsers } from '@/services/snipeit'

const KEYS = {
  assets:     'snipeit_assets',
  categories: 'snipeit_categories',
  locations:  'snipeit_locations',
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

export const useAssetsStore = defineStore('assets', () => {
  // ── State ─────────────────────────────────────────────
  const assets     = ref(load(KEYS.assets))
  const categories = ref(load(KEYS.categories))
  const locations  = ref(load(KEYS.locations))
  const syncing    = ref(false)
  const syncError  = ref('')

  // ── Computed ──────────────────────────────────────────
  const assetsByType = computed(() => {
    if (categories.value.length) {
      const map = {}
      categories.value.forEach(c => {
        const count = assets.value.filter(a =>
          a.category === c.name || a.category_id === c.id
        ).length
        if (count > 0 || categories.value.length <= 10) {
          map[c.name] = count
        }
      })
      return map
    }
    const map = {}
    assets.value.forEach(a => {
      const t = a.category || 'Autre'
      map[t] = (map[t] || 0) + 1
    })
    return map
  })

  const categoryNames = computed(() => {
    if (categories.value.length) {
      return categories.value.map(c => c.name).filter(Boolean)
    }
    return [...new Set(assets.value.map(a => a.category).filter(Boolean))]
  })

  const locationNames = computed(() => {
    if (locations.value.length) {
      return locations.value.map(l => l.name).filter(Boolean)
    }
    return [...new Set(assets.value.map(a => a.location).filter(Boolean))]
  })

  // ── Sync depuis SnipeIT ────────────────────────────────
  async function syncFromSnipeIT() {
    syncing.value   = true
    syncError.value = ''
    const results   = { assets: 0, categories: 0, locations: 0, errors: [] }

    try {
      const catData = await fetchCategories({ category_type: 'asset' })
      const cats = (catData.rows || []).map(c => ({
        id:           c.id,
        name:         c.name,
        type:         c.category_type,
        assets_count: c.assets_count || 0,
      }))
      categories.value = cats
      save(KEYS.categories, cats)
      results.categories = cats.length
    } catch (e) {
      results.errors.push('Catégories : ' + e.message)
    }

    try {
      const locData = await fetchLocations()
      const locs = (locData.rows || []).map(l => ({
        id:      l.id,
        name:    l.name,
        address: l.address || '',
      }))
      locations.value = locs
      save(KEYS.locations, locs)
      results.locations = locs.length
    } catch (e) {
      results.errors.push('Localisations : ' + e.message)
    }

    try {
      // 🔑 Étape 1 : Récupérer TOUS les utilisateurs avec leurs départements
      let userMap = {}
      try {
        const usersData = await fetchUsers()
        userMap = {}
        usersData.rows.forEach(u => {
          userMap[u.id] = {
            name: u.name,
            email: u.username,
            department: u.department?.name || '',
            department_id: u.department?.id || null
          }
        })
      } catch (e) {
        results.errors.push('Utilisateurs : ' + e.message)
      }
      
      // 🔑 Étape 2 : Récupérer les assets et les enrichir avec les départements des utilisateurs
      const assetData = await fetchAssets()
      const rows = (assetData.rows || []).map(a => {
        const userId = a.assigned_to?.id
        const user = userId && userMap[userId] ? userMap[userId] : null
        
        return {
          id:            a.id,
          name:          a.name,
          asset_tag:     a.asset_tag,
          category:      a.category?.name     || '',
          category_id:   a.category?.id       || null,
          location:      a.location?.name     || '',
          location_id:   a.location?.id       || null,
          status:        a.status_label?.name || '',
          model:         a.model?.name        || '',
          serial:        a.serial             || '',
          manufacturer:  a.manufacturer?.name || '',
          company:       a.company?.name      || '',
          company_id:    a.company?.id        || null,
          // 🔑 Département vient de l'utilisateur assigné (pas de l'asset directement)
          department:    user?.department      || '',
          department_id: user?.department_id   || null,
          user:          a.assigned_to?.name   || '',
          email:         a.assigned_to?.username || '',
          purchase_date: a.purchase_date?.formatted || '',
          purchase_cost: a.purchase_cost      || '',
        }
      })
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

  // ── CRUD local ────────────────────────────────────────
  function importAssets(rows) {
    assets.value = rows
    save(KEYS.assets, rows)
    if (!categories.value.length) {
      const cats = [...new Set(rows.map(r => r.category).filter(Boolean))]
        .map((name, i) => ({ id: -(i + 1), name, type: 'asset' }))
      categories.value = cats
      save(KEYS.categories, cats)
    }
    if (!locations.value.length) {
      const locs = [...new Set(rows.map(r => r.location).filter(Boolean))]
        .map((name, i) => ({ id: -(i + 1), name }))
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

  function clearAll() {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k))
    assets.value     = []
    categories.value = []
    locations.value  = []
  }

  return {
    assets, categories, locations, syncing, syncError,
    assetsByType, categoryNames, locationNames,
    syncFromSnipeIT, importAssets, upsertAsset, clearAll,
  }
})