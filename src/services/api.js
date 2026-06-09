// services/api.js
// Instance Axios configurée pour SnipeIT.
// Le token Bearer est injecté par le proxy Vite (vite.config.js), pas ici.

import axios from 'axios'

const api = axios.create({
  baseURL: '/api/snipeit',
  headers: {
    'Accept':       'application/json',
    'Content-Type': 'application/json',
  },
})

// ── Intercepteur réponse ──────────────────────────────
api.interceptors.response.use(
  (response) => {
    const ct = response.headers['content-type'] || ''
    if (ct.includes('text/html')) {
      throw new Error(
        'SnipeIT a retourné du HTML. ' +
        'Vérifiez VITE_SNIPEIT_TOKEN dans .env.local puis RELANCEZ npm run dev.'
      )
    }
    return response
  },
  (error) => {
    if (!error.response) {
      return Promise.reject(new Error(
        'Impossible de joindre SnipeIT. Lancez : php artisan serve --port=8000'
      ))
    }
    const status = error.response?.status
    const body   = error.response?.data
    const msgs = {
      401: 'Token invalide ou manquant (401). Vérifiez VITE_SNIPEIT_TOKEN dans .env.local et relancez npm run dev.',
      403: 'Permissions insuffisantes (403). Le token doit avoir les droits Read sur Assets et Categories.',
      404: 'Endpoint introuvable (404). Vérifiez VITE_SNIPEIT_URL dans .env.local.',
      422: `Données invalides (422) : ${JSON.stringify(body?.messages || body)}`,
      429: 'Trop de requêtes, API throttlée (429). Réessayez dans quelques secondes.',
      500: 'Erreur interne SnipeIT (500). Consultez les logs Laravel.',
      502: body?.message || 'SnipeIT inaccessible (502). Vérifiez que php artisan serve tourne.',
    }
    return Promise.reject(new Error(msgs[status] || `Erreur API ${status}`))
  }
)

export default api
