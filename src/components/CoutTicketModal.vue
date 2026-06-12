<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content card small-modal">
      <div class="modal-header">
        <h3>Coût du ticket terminé</h3>
      </div>
      <div class="modal-body">
        <p class="text-sm text-muted mb-4">
          Ce ticket dispose de <strong>{{ ticket.assets?.length || 0 }}</strong> équipement(s).
          Saisissez le coût total pour le répartir équitablement.
        </p>
        <div class="form-group">
          <label class="form-label">Coût total (€)</label>
          <input
            ref="costInput"
            v-model="cost"
            type="number"
            step="0.01"
            min="0"
            class="form-control"
            placeholder="0.00"
            autofocus
            @keydown.enter="validate"
            @keydown.esc="$emit('close')"
          />
        </div>
        <div class="flex gap-3 mt-6">
          <button class="btn btn-secondary flex-1" @click="$emit('close')">Annuler</button>
          <button
            class="btn btn-primary flex-1"
            :disabled="!isValidCost"
            @click="validate"
          >
            Valider
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'

const props = defineProps({
  ticket: { type: Object, required: true }
})
const emit = defineEmits(['validate', 'close'])

const costInput = ref(null)
const cost = ref(0)

function splitCost(total, count) {
  const base = Math.floor((total / count) * 100) / 100
  const reste = Math.round((total - base * count) * 100) / 100
  const items = []
  const assets = props.ticket.assets || []
  for (let i = 0; i < count; i++) {
    const c = i === count - 1 ? base + reste : base
    const a = assets[i] || {}
    items.push({
      id_asset: Number(a.id) || 0,
      id_categorie: Number(a.category_id) || 0,
      cout: Math.round(c * 100) / 100,
      name: a.name,
      asset_tag: a.asset_tag,
    })
  }
  const sum = items.reduce((s, i) => s + i.cout, 0)
  if (Math.abs(sum - total) > 0.01 && items.length) {
    items[items.length - 1].cout = Math.round((items[items.length - 1].cout + total - sum) * 100) / 100
  }
  return items
}

const itemsPreview = computed(() => {
  if (!cost.value || !props.ticket.assets?.length) return []
  return splitCost(Number(cost.value), props.ticket.assets.length)
})
const isValidCost = computed(() => Number(cost.value) > 0)

watch(isValidCost, (v) => {
  if (v) nextTick(() => costInput.value?.select())
})

onMounted(() => {
  cost.value = 0
  nextTick(() => costInput.value?.select())
})

function validate() {
  if (!isValidCost.value) return
  emit('validate', {
    totalCost: Number(cost.value),
    items: itemsPreview.value,
  })
}
</script>

<style scoped>

</style>
