<template>
  <div class="fo-layout">
    <header class="fo-header">
      <div class="fo-header-inner">
        <router-link to="/front/assets" class="fo-brand">
          <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="8" fill="var(--accent)" fill-opacity=".15"/>
            <rect x="8" y="8" width="10" height="10" rx="2" fill="var(--accent)"/>
            <rect x="22" y="8" width="10" height="10" rx="2" fill="var(--accent)" fill-opacity=".5"/>
            <rect x="8" y="22" width="10" height="10" rx="2" fill="var(--accent)" fill-opacity=".5"/>
            <rect x="22" y="22" width="10" height="10" rx="2" fill="var(--accent)"/>
          </svg>
          <span>SnipeIT <em>NewApp</em></span>
        </router-link>

        <nav class="fo-nav">
          <router-link to="/front/assets" class="fo-nav-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
            Catalogue
          </router-link>
          <router-link to="/front/ticket" class="fo-nav-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/></svg>
            Nouveau ticket
          </router-link>
        </nav>

        <router-link to="/backoffice/login" class="btn btn-secondary btn-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          Backoffice
        </router-link>
      </div>
    </header>

    <main class="fo-main">
      <router-view />
    </main>

    <footer class="fo-footer">
      <span class="mono text-xs text-muted">SnipeIT NewApp — Jour 1</span>
      <span class="mono text-xs text-muted">{{ db.assets.length }} éléments · {{ db.tickets.length }} tickets</span>
    </footer>
  </div>
</template>

<script setup>
import { useDbStore } from '@/stores/db'
const db = useDbStore()
</script>

<style scoped>
.fo-layout { display: flex; flex-direction: column; min-height: 100vh; }

.fo-header {
  background: var(--bg2);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 100;
}
.fo-header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 32px;
  height: 60px;
  display: flex;
  align-items: center;
  gap: 32px;
}

.fo-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text);
  flex-shrink: 0;
}
.fo-brand em { color: var(--accent); font-style: normal; }

.fo-nav { display: flex; gap: 4px; flex: 1; }
.fo-nav-item {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 14px;
  border-radius: var(--radius);
  color: var(--text2);
  text-decoration: none;
  font-size: 0.875rem;
  transition: all 0.15s;
}
.fo-nav-item:hover { background: var(--bg3); color: var(--text); }
.fo-nav-item.router-link-active { background: var(--accentbg); color: var(--accent); }

.fo-main { flex: 1; }

.fo-footer {
  border-top: 1px solid var(--border);
  padding: 16px 32px;
  display: flex;
  justify-content: space-between;
  background: var(--bg2);
}
</style>
