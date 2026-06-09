// stores/auth.js
// Authentification backoffice (code d'accès + sessionStorage)
import { defineStore } from 'pinia'
import { ref } from 'vue'

const BACKOFFICE_CODE = 'ADMIN2026'

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(
    sessionStorage.getItem('bo_auth') === 'true'
  )

  function login(code) {
    if (code === BACKOFFICE_CODE) {
      isAuthenticated.value = true
      sessionStorage.setItem('bo_auth', 'true')
      return true
    }
    return false
  }

  function logout() {
    isAuthenticated.value = false
    sessionStorage.removeItem('bo_auth')
  }

  return { isAuthenticated, login, logout, BACKOFFICE_CODE }
})
