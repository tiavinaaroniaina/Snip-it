<template>
  <div class="page fade-in">
    <div class="page-header flex-between">
      <div>
        <h1 class="page-title">Coût par Catégorie</h1>
        <p class="page-subtitle">Répartition des coûts des tickets par catégorie d'actif.</p>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <p>Chargement des données...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <p class="text-danger">Erreur : {{ error }}</p>
      <p>Veuillez vous assurer que le backend Node.js est lancé (<code>node server/index.js</code>) et que la connexion à Snipe-IT est fonctionnelle.</p>
    </div>

    <div v-else-if="aggregatedCosts.length === 0" class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      <h4>Aucun coût enregistré pour le moment.</h4>
      <p>Terminez des tickets sur le tableau Kanban pour voir la répartition des coûts.</p>
    </div>

    <div v-else class="table-responsive">
      <table class="table">
        <thead>
          <tr>
            <th>Catégorie</th>
            <th class="text-right">Coût Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in displayData" :key="item.id_categorie">
            <td>{{ item.category_name }}</td>
            <td class="text-right">{{ formatCurrency(item.total_cout) }}</td>
          </tr>
          <tr class="table-total">
            <td><strong>Total général</strong></td>
            <td class="text-right"><strong>{{ formatCurrency(grandTotal) }}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { apiGetAggregatedCoutsByCategory } from '@/services/coutService';
import { fetchCategories } from '@/services/snipeit';

const loading = ref(true);
const error = ref(null);
const aggregatedCosts = ref([]);
const snipeitCategories = ref([]);

// Fetch data on component mount
onMounted(async () => {
  try {
    // Fetch aggregated costs from local DB
    aggregatedCosts.value = await apiGetAggregatedCoutsByCategory();
    
    // Fetch all Snipe-IT categories
    const categoriesResponse = await fetchCategories();
    snipeitCategories.value = categoriesResponse.rows || [];

  } catch (err) {
    error.value = err.message;
    console.error("Erreur lors du chargement des coûts par catégorie:", err);
  } finally {
    loading.value = false;
  }
});

// Combine aggregated costs with Snipe-IT category names
const displayData = computed(() => {
  return aggregatedCosts.value.map(costItem => {
    const category = snipeitCategories.value.find(cat => cat.id === costItem.id_categorie);
    return {
      ...costItem,
      category_name: category ? category.name : `Catégorie inconnue (${costItem.id_categorie})`,
    };
  }).sort((a, b) => b.total_cout - a.total_cout); // Sort by total cost descending
});

// Calculate grand total
const grandTotal = computed(() => {
  return displayData.value.reduce((sum, item) => sum + item.total_cout, 0);
});

// Currency formatter
function formatCurrency(value) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'MGA', // Assuming MGA as currency, adjust if needed
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
</script>

<style scoped>
.page { padding: 20px; }
.page-title { font-size: 2em; margin-bottom: 5px; }
.page-subtitle { color: #666; }

.loading-state, .error-state, .empty-state {
  text-align: center;
  padding: 50px 20px;
  background: #f8f8f8;
  border-radius: 8px;
  margin-top: 30px;
  color: #555;
}
.error-state .text-danger { color: #dc3545; font-weight: bold; }
.empty-state svg {
  color: #ccc;
  margin-bottom: 20px;
}
.empty-state h4 { margin-bottom: 10px; color: #777; }

.table-responsive {
  overflow-x: auto;
  margin-top: 30px;
}

.table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden; /* Ensures rounded corners apply to children */
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.table th, .table td {
  padding: 12px 15px;
  border-bottom: 1px solid #eee;
  text-align: left;
}

.table th {
  background: #f0f0f0;
  font-weight: 600;
  color: #333;
  text-transform: uppercase;
  font-size: 0.9em;
}

.table tbody tr:last-child td {
  border-bottom: none;
}

.table tbody tr:hover {
  background-color: #f5f5f5;
}

.table .text-right {
  text-align: right;
}

.table-total {
  background-color: #e9ecef;
  font-weight: bold;
}
.table-total td {
  border-top: 2px solid #dee2e6;
  font-size: 1.1em;
}

/* Basic styling for potential chart - currently not implemented */
.chart-container {
  margin-top: 40px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
</style>