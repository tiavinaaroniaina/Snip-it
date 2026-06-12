<template>
  <div class="page fade-in">
    <div class="page-header flex-between">
      <div>
        <h1 class="page-title">Coût par catégorie</h1>
        <p class="page-subtitle">Répartition des coûts des tickets terminés par catégorie SnipeIT</p>
      </div>
    </div>

    <div v-if="loading" class="text-center text-muted py-8">
      <span class="loader"></span> Chargement…
    </div>

    <div v-else-if="error" class="alert alert-error mt-6">
      {{ error }}
    </div>

    <template v-else>
      <div v-if="rows.length === 0" class="empty-state py-8 text-center text-muted">
        Aucun coût enregistré. Terminez des tickets sur le tableau Kanban pour commencer.
      </div>

      <div v-else class="card mt-6">
        <table class="table">
          <thead>
            <tr>
              <th>Catégorie</th>
              <th class="text-right">Coût total (€)</th>
              <th class="text-right">Tickets</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.id_categorie">
              <td>
                <span class="fw-600">{{ r.categoryName || `Catégorie #${r.id_categorie}` }}</span>
                <span class="text-xs text-muted ml-2">#{{ r.id_categorie }}</span>
              </td>
              <td class="text-right mono">{{ fmtCurrency(r.total) }}</td>
              <td class="text-right text-sm text-muted">{{ r.ticketCount || '-' }}</td>
            </tr>
            <tr class="table-total-row">
              <td class="fw-700">Total général</td>
              <td class="text-right mono fw-700">{{ fmtCurrency(grandTotal) }}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { fetchCoutsParCategorie } from '@/services/coutService'
import { fetchCategories } from '@/services/snipeit'

const rows = ref([])
const categories = ref([])
const loading = ref(true)
const error = ref('')

const grandTotal = computed(() => rows.value.reduce((s, r) => s + (r.total || 0), 0))

function fmtCurrency(n) {
  return Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [couts, cats] = await Promise.all([
      fetchCoutsParCategorie(),
      fetchCategories().catch(() => ({ rows: [] })).then(r => r.rows || []),
    ])
    const catMap = Object.fromEntries(cats.map(c => [c.id, c.name]))
    rows.value = couts.map(c => ({
      ...c,
      categoryName: c.id_categorie === 0
        ? 'Non classé'
        : catMap[c.id_categorie] || null,
    }))
    categories.value = cats
  } catch (e) {
    error.value = 'Erreur lors du chargement : ' + e.message
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.table { width: 100%; border-collapse: collapse; }
.table th {
  text-align: left;
  padding: 10px 12px;
  border-bottom: 2px solid var(--border);
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--text3);
  font-family: var(--font-mono);
  letter-spacing: 0.05em;
}
.table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  font-size: 0.9rem;
}
.table-total-row td { border-top: 2px solid var(--border2); border-bottom: none; }
.text-right { text-align: right; }
.ml-2 { margin-left: 8px; }
</style>
