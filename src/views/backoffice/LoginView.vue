<template>
  <div class="login-page">
    <!-- Background grid -->
    <div class="login-grid"></div>

    <div class="login-box fade-in">
      <div class="login-logo">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="var(--accent)" fill-opacity=".12"/>
          <rect x="8" y="8" width="10" height="10" rx="2" fill="var(--accent)"/>
          <rect x="22" y="8" width="10" height="10" rx="2" fill="var(--accent)" fill-opacity=".5"/>
          <rect x="8" y="22" width="10" height="10" rx="2" fill="var(--accent)" fill-opacity=".5"/>
          <rect x="22" y="22" width="10" height="10" rx="2" fill="var(--accent)"/>
        </svg>
        <span class="login-logo-text">SnipeIT <span>NewApp</span></span>
      </div>

      <h1 class="login-title">Backoffice</h1>
      <p class="login-sub">Entrez le code d'accès pour continuer</p>

      <div v-if="error" class="alert alert-danger mt-4">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Code incorrect. Réessayez.
      </div>

      <div class="form-group mt-4">
        <label class="form-label">Code d'accès</label>
        <input
          v-model="code"
          type="text"
          class="form-control code-input mono"
          :placeholder="defaultCode"
          @keyup.enter="handleLogin"
          autocomplete="off"
          spellcheck="false"
        />
        <p class="hint">Code par défaut pré-rempli ci-dessus</p>
      </div>

      <button class="btn btn-primary btn-lg w-full" @click="handleLogin" :disabled="loading">
        <span v-if="loading" class="loader"></span>
        <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        Accéder au backoffice
      </button>

      <div class="divider"></div>
      <router-link to="/front/assets" class="front-link">
        → Aller au frontoffice (public)
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth   = useAuthStore()

const defaultCode = auth.BACKOFFICE_CODE
const code    = ref(defaultCode) // pré-rempli par défaut
const error   = ref(false)
const loading = ref(false)

onMounted(() => {
  if (auth.isAuthenticated) router.push('/backoffice/dashboard')
})

function handleLogin() {
  loading.value = true
  error.value   = false
  setTimeout(() => {
    loading.value = false
    if (!auth.login(code.value)) {
      error.value = true
      code.value  = ''
    } else {
      router.push('/backoffice/dashboard')
    }
  }, 400)
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.login-grid {
  position: fixed;
  inset: 0;
  background-image:
    linear-gradient(var(--border) 1px, transparent 1px),
    linear-gradient(90deg, var(--border) 1px, transparent 1px);
  background-size: 40px 40px;
  opacity: 0.3;
}

.login-box {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  padding: 40px;
  background: var(--bg2);
  border: 1px solid var(--border2);
  border-radius: 16px;
  box-shadow: 0 24px 80px rgba(0,0,0,0.5);
  margin: 20px;
}

.login-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 28px;
}
.login-logo-text {
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 700;
}
.login-logo-text span { color: var(--accent); }

.login-title {
  font-size: 2rem;
  font-weight: 800;
}
.login-sub {
  color: var(--text2);
  font-size: 0.875rem;
  margin-top: 6px;
}

.code-input {
  font-size: 1.2rem;
  letter-spacing: 0.2em;
  text-align: center;
  font-family: var(--font-mono);
}

.hint {
  font-size: 0.75rem;
  color: var(--text3);
  margin-top: 6px;
  font-family: var(--font-mono);
}

.front-link {
  display: block;
  text-align: center;
  font-size: 0.875rem;
  color: var(--text2);
  text-decoration: none;
  transition: color 0.15s;
}
.front-link:hover { color: var(--accent); }
</style>
