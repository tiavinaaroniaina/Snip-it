<template>
  <div v-if="show" class="modal-overlay">
    <div class="modal-content">
      <h3>Saisir le coût total du ticket</h3>
      <input
        type="number"
        v-model.number="cost"
        placeholder="Coût total"
        min="0"
        step="0.01"
        @keyup.enter="handleValidate"
      />
      <div class="modal-actions">
        <button @click="handleValidate">Valider</button>
        <button @click="handleCancel" class="cancel">Annuler</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  initialCost: {
    type: Number,
    default: 0,
  }
});

const emit = defineEmits(['validate', 'cancel']);

const cost = ref(props.initialCost);

watch(() => props.initialCost, (newVal) => {
  cost.value = newVal;
});

function handleValidate() {
  if (cost.value >= 0) {
    emit('validate', cost.value);
    cost.value = 0; // Reset for next use
  } else {
    alert('Veuillez saisir un coût valide.');
  }
}

function handleCancel() {
  emit('cancel');
  cost.value = 0; // Reset
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  text-align: center;
  width: 90%;
  max-width: 400px;
}

h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #333;
  font-size: 1.4em;
}

input[type="number"] {
  width: calc(100% - 20px);
  padding: 12px 10px;
  margin-bottom: 25px;
  border: 1px solid #ccc;
  border-radius: 5px;
  font-size: 1.1em;
  box-sizing: border-box;
}

input[type="number"]:focus {
  border-color: #007bff;
  outline: none;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
}

.modal-actions {
  display: flex;
  justify-content: space-around;
  gap: 15px;
}

button {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1em;
  transition: background-color 0.2s ease;
  flex-grow: 1;
}

button:not(.cancel) {
  background-color: #007bff;
  color: white;
}

button:not(.cancel):hover {
  background-color: #0056b3;
}

button.cancel {
  background-color: #6c757d;
  color: white;
}

button.cancel:hover {
  background-color: #5a6268;
}
</style>
