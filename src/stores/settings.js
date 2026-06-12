import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export const useSettingsStore = defineStore('settings', () => {
  const kanbanColors = ref({
    vaovao: '#f8f9fa',
    efa_manao: '#fff9db',
    vita: '#ebfbee'
  })
  
  const statusNames = ref({
    vaovao: 'Nouveau',
    efa_manao: 'En cours',
    vita: 'Terminé'
  })

  const loading = ref(false)
  const error = ref(null)

  async function load() {
    loading.value = true
    try {
      const { data } = await axios.get(`${API_URL}/settings`)
      if (data.kanban_colors) kanbanColors.value = data.kanban_colors
      if (data.status_names) statusNames.value = data.status_names
    } catch (e) {
      console.error('Erreur chargement settings:', e)
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function updateSetting(key, value) {
    try {
      await axios.post(`${API_URL}/settings`, { key, value })
      if (key === 'kanban_colors') kanbanColors.value = value
      if (key === 'status_names') statusNames.value = value
    } catch (e) {
      console.error('Erreur update setting:', e)
      throw e
    }
  }

  return {
    kanbanColors,
    statusNames,
    loading,
    error,
    load,
    updateSetting
  }
})
