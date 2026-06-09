<template>
  <div class="bo-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="var(--accent)" fill-opacity=".15"/>
          <rect x="8" y="8" width="10" height="10" rx="2" fill="var(--accent)"/>
          <rect x="22" y="8" width="10" height="10" rx="2" fill="var(--accent)" fill-opacity=".5"/>
          <rect x="8" y="22" width="10" height="10" rx="2" fill="var(--accent)" fill-opacity=".5"/>
          <rect x="22" y="22" width="10" height="10" rx="2" fill="var(--accent)"/>
        </svg>
        <div>
          <div class="sidebar-brand">SnipeIT</div>
          <div class="sidebar-subbrand">NewApp · BO</div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section-label">Navigation</div>
        <router-link class="nav-item" to="/backoffice/dashboard">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          Dashboard
        </router-link>
        <router-link class="nav-item" to="/backoffice/tickets">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/></svg>
          Tickets
        </router-link>
        <router-link class="nav-item" to="/backoffice/feuil2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          Feuil 2 — SQLite
        </router-link>

        <div class="nav-section-label" style="margin-top:16px">Administration</div>
        <router-link class="nav-item" to="/backoffice/import">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Importer les données
        </router-link>
        <router-link class="nav-item danger-item" to="/backoffice/reset">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.9L1 10"/></svg>
          Réinitialiser
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <a href="http://localhost:8000" target="_blank" class="ext-link">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Ouvrir SnipeIT
        </a>
        <router-link to="/front/assets" class="ext-link">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          Frontoffice
        </router-link>
        <button class="ext-link" @click="handleLogout">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Déconnexion
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <main class="bo-main">
      <div class="bo-topbar">
        <div class="topbar-breadcrumb mono text-sm text-muted">
          /backoffice/<span class="text-accent">{{ currentRoute }}</span>
        </div>
        <div class="flex-center gap-2">
          <span class="badge badge-green">
            <span class="dot"></span>
            En ligne
          </span>
        </div>
      </div>
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route  = useRoute()
const router = useRouter()
const auth   = useAuthStore()

const currentRoute = computed(() => {
  const seg = route.path.split('/').pop()
  return seg || 'dashboard'
})

function handleLogout() {
  auth.logout()
  router.push('/backoffice/login')
}
</script>

<style scoped>
.bo-layout {
  display: flex;
  min-height: 100vh;
}

/* ── Sidebar ── */
.sidebar {
  width: 240px;
  flex-shrink: 0;
  background: var(--bg2);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 20px 16px;
  border-bottom: 1px solid var(--border);
}
.sidebar-brand {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1rem;
  line-height: 1;
}
.sidebar-subbrand {
  font-size: 0.7rem;
  color: var(--accent);
  font-family: var(--font-mono);
  margin-top: 2px;
}

.sidebar-nav {
  flex: 1;
  padding: 16px 12px;
}
.nav-section-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--text3);
  font-family: var(--font-mono);
  padding: 0 8px;
  margin-bottom: 6px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: var(--radius);
  color: var(--text2);
  text-decoration: none;
  font-size: 0.875rem;
  transition: all 0.15s;
  margin-bottom: 2px;
}
.nav-item:hover { background: var(--bg3); color: var(--text); }
.nav-item.router-link-active {
  background: var(--accentbg);
  color: var(--accent);
}
.danger-item:hover { color: var(--red) !important; }

.sidebar-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ext-link {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: var(--text3);
  text-decoration: none;
  cursor: pointer;
  background: none;
  border: none;
  font-family: var(--font-body);
  transition: color 0.15s;
}
.ext-link:hover { color: var(--text); }

/* ── Main ── */
.bo-main {
  flex: 1;
  overflow-y: auto;
  background: var(--bg);
}

.bo-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 32px;
  border-bottom: 1px solid var(--border);
  background: var(--bg2);
  position: sticky;
  top: 0;
  z-index: 10;
}
.dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--green);
  animation: pulse 2s infinite;
}
</style>
