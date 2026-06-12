// services/coutService.js
// Appels API REST pour les coûts de tickets.
// Cible : endpoints Node/Express + SQLite côté backend.

import axios from 'axios'

const API = '/api/ticket-couts'

export async function commitTicketCout({ ticketId, totalCost, items }) {
  const res = await axios.post(`${API}/commit`, {
    ticketId, totalCost, items
  })
  return res.data
}

export async function fetchCoutsParCategorie() {
  const res = await axios.get(`${API}/par-categorie`)
  return res.data
}

export async function fetchAllCouts() {
  const res = await axios.get(API)
  return res.data
}
