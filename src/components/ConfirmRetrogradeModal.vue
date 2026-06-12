<template>
  <div v-if="isOpen" class="modal-overlay">
    <div class="modal-content">
      <h3>Rétrograder le ticket #{{ ticketId }}</h3>
      <p>Que souhaitez-vous faire avec ce ticket "résolu" ?</p>
      <div class="modal-actions">
        <button @click="confirmReouverture">Réouverture</button>
        <button @click="confirmAnnulation">Annulation</button>
        <button @click="closeModalAndRevert">Fermer</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  ticketId: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['confirm-reouverture', 'confirm-annulation', 'close'])

const confirmReouverture = () => {
  emit('confirm-reouverture', props.ticketId)
}

const confirmAnnulation = () => {
  emit('confirm-annulation', props.ticketId)
}

const closeModalAndRevert = () => {
  emit('close')
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
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  text-align: center;
  max-width: 400px;
  width: 90%;
}

.modal-content h3 {
  margin-top: 0;
  color: #333;
}

.modal-content p {
  color: #555;
  margin-bottom: 1.5rem;
}

.modal-actions button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 0.75rem 1.25rem;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1rem;
  margin: 0 0.5rem;
  transition: background-color 0.2s ease;
}

.modal-actions button:hover {
  background-color: #0056b3;
}

.modal-actions button:nth-child(2) { /* Annulation button */
  background-color: #dc3545;
}

.modal-actions button:nth-child(2):hover {
  background-color: #c82333;
}

.modal-actions button:last-child { /* Fermer button */
  background-color: #6c757d;
}

.modal-actions button:last-child:hover {
  background-color: #5a6268;
}
</style>