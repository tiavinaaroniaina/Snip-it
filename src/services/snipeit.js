// services/snipeit.js
// Appels API REST SnipeIT : CRUD sur chaque entité.
// Les helpers CSV et la logique d'import sont dans utils/csv.js et services/import.js.

import api from '@/services/api'

// ── Test de connexion ─────────────────────────────────
export async function testConnection() {
  try {
    const res = await api.get('/hardware', { params: { limit: 1 } })
    return { ok: true, total: res.data.total }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

// ── Assets ────────────────────────────────────────────
export async function fetchAssets(params = {}) {
  const res = await api.get('/hardware', {
    params: { limit: 500, sort: 'created_at', order: 'desc', ...params },
  })
  return res.data
}

export async function createAsset(data) {
  const res = await api.post('/hardware', data)
  return res.data
}

export async function updateAsset(id, data) {
  const res = await api.patch(`/hardware/${id}`, data)
  return res.data
}

export async function deleteAsset(id) {
  const res = await api.delete(`/hardware/${id}`)
  return res.data
}

export async function deleteAllAssets() {
  const data = await fetchAssets({ limit: 500 })
  const ids  = (data.rows || []).map(a => a.id)
  const results = { deleted: 0, errors: [] }
  for (const id of ids) {
    try   { await deleteAsset(id); results.deleted++ }
    catch (e) { results.errors.push(`ID ${id} : ${e.message}`) }
  }
  return results
}

// ── Categories ────────────────────────────────────────
export async function fetchCategories(params = {}) {
  const res = await api.get('/categories', {
    params: { limit: 500, sort: 'name', order: 'asc', ...params },
  })
  return res.data
}

export async function createCategory(name, category_type = 'asset') {
  const res = await api.post('/categories', { name, category_type })
  return res.data
}

export async function deleteCategory(id) {
  const res = await api.delete(`/categories/${id}`)
  return res.data
}

// ── Locations ─────────────────────────────────────────
export async function fetchLocations(params = {}) {
  const res = await api.get('/locations', {
    params: { limit: 500, sort: 'name', order: 'asc', ...params },
  })
  return res.data
}

export async function createLocation(name) {
  const res = await api.post('/locations', { name })
  return res.data
}

export async function deleteLocation(id) {
  const res = await api.delete(`/locations/${id}`)
  return res.data
}

// ── Manufacturers ─────────────────────────────────────
export async function fetchManufacturers(params = {}) {
  const res = await api.get('/manufacturers', {
    params: { limit: 500, sort: 'name', order: 'asc', ...params },
  })
  return res.data
}

export async function createManufacturer(name) {
  const res = await api.post('/manufacturers', { name })
  return res.data
}

export async function deleteManufacturer(id) {
  const res = await api.delete(`/manufacturers/${id}`)
  return res.data
}

// ── Models ────────────────────────────────────────────
export async function fetchModels(params = {}) {
  const res = await api.get('/models', {
    params: { limit: 500, sort: 'name', order: 'asc', ...params },
  })
  return res.data
}

export async function createModel(name, category_id, manufacturer_id) {
  const res = await api.post('/models', { name, category_id, manufacturer_id })
  return res.data
}

export async function deleteModel(id) {
  const res = await api.delete(`/models/${id}`)
  return res.data
}

// ── Status Labels ─────────────────────────────────────
export async function fetchStatusLabels(params = {}) {
  const res = await api.get('/statuslabels', { params: { limit: 200, ...params } })
  return res.data
}

export async function createStatusLabel(name, type = 'deployable') {
  const res = await api.post('/statuslabels', { name, type })
  return res.data
}

export async function deleteStatusLabel(id) {
  const res = await api.delete(`/statuslabels/${id}`)
  return res.data
}

// ── Companies ─────────────────────────────────────────
export async function fetchCompanies() {
  const res = await api.get('/companies', { params: { limit: 500 } })
  return res.data
}

export async function deleteCompany(id) {
  const res = await api.delete(`/companies/${id}`)
  return res.data
}

// ── Departments ───────────────────────────────────────
export async function fetchDepartments() {
  const res = await api.get('/departments', { params: { limit: 500 } })
  return res.data
}

export async function deleteDepartment(id) {
  const res = await api.delete(`/departments/${id}`)
  return res.data
}

// ── Users ─────────────────────────────────────────────
export async function fetchUsers() {
  const res = await api.get('/users', { params: { limit: 500 } })
  return res.data
}

export async function deleteUser(id) {
  const res = await api.delete(`/users/${id}`)
  return res.data
}

export async function createUser(data) {
  const res = await api.post('/users', data)
  return res.data
}

export async function checkoutAsset(assetId, userId) {
  const res = await api.post(`/hardware/${assetId}/checkout`, {
    checkout_to_type: 'user',
    assigned_user:    userId,
  })
  return res.data
}