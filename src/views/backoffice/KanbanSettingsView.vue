<template>
  <div class="page fade-in">
    <div class="page-header">
      <h1 class="page-title">Configuration Kanban</h1>
      <p class="page-subtitle">Personnalisez l'apparence et les noms des statuts</p>
    </div>

    <div v-if="successMsg" class="alert alert-success mb-6">
      {{ successMsg }}
    </div>

    <div class="grid-2">
      <!-- Couleurs des colonnes -->
      <div class="card">
        <div class="card-header">
          <h3>Couleurs des colonnes</h3>
        </div>
        <div class="p-4">
          <div v-for="(color, status) in localColors" :key="status" class="form-group mb-4">
            <label class="form-label text-capitalize">{{ statusLabel(status) }}</label>
            <div class="flex gap-3 align-center">
              <input type="color" v-model="localColors[status]" class="color-input" />
              <input type="text" v-model="localColors[status]" class="form-control mono" style="width: 120px" />
              <div class="color-preview" :style="{ backgroundColor: localColors[status] }"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Noms des statuts (Malgache) -->
      <div class="card">
        <div class="card-header">
          <h3>Noms des statuts (Malgache)</h3>
        </div>
        <div class="p-4">
          <div v-for="(name, status) in localNames" :key="status" class="form-group mb-4">
            <label class="form-label text-capitalize">Statut original : {{ statusLabel(status) }}</label>
            <input 
              v-model="localNames[status]" 
              type="text" 
              class="form-control" 
              :placeholder="'Nom pour ' + statusLabel(status)" 
            />
          </div>
        </div>
      </div>
    </div>

    <div class="mt-6 flex justify-end">
      <button class="btn btn-primary btn-lg" @click="saveSettings" :disabled="saving">
        <span v-if="saving" class="loader"></span>
        <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        Enregistrer les réglages
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()
const saving = ref(false)
const successMsg = ref('')

const localColors = ref({ ...settings.kanbanColors })
const localNames = ref({ ...settings.statusNames })

onMounted(async () => {
  await settings.fetchSettings()
  localColors.value = { ...settings.kanbanColors }
  localNames.value = { ...settings.statusNames }
})

function statusLabel(status) {
  const map = { open: 'Nouveau', in_progress: 'En cours', resolved: 'Terminé' }
  return map[status] || status
}

async function saveSettings() {
  saving.value = true
  successMsg.value = ''
  try {
    await settings.updateSetting('kanban_colors', localColors.value)
    await settings.updateSetting('status_names', localNames.value)
    successMsg.value = 'Réglages enregistrés avec succès dans SQLite.'
    setTimeout(() => successMsg.value = '', 3000)
  } catch (e) {
    alert('Erreur lors de la sauvegarde : ' + e.message)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.color-input {
  width: 40px;
  height: 40px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
}
.color-preview {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  border: 1px solid var(--border);
}
.align-center {
  align-items: center;
}
.justify-end {
  justify-content: flex-end;
}
</style>
