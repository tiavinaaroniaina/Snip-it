<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue'
import { useDbStore } from '@/stores/db'
import { useSettingsStore } from '@/stores/settings'

const db = useDbStore()
const settings = useSettingsStore()

onMounted(() => {
  // Charger les réglages Kanban (couleurs, noms)
  settings.load()
  
  // Charger les données Feuil 2 (SQLite)
  db.loadFeuil2()
})
</script>
