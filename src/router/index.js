import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Backoffice
import BOLogin    from '@/views/backoffice/LoginView.vue'
import BOLayout   from '@/views/backoffice/LayoutBO.vue'
import BODash     from '@/views/backoffice/DashboardView.vue'
import BOImport   from '@/views/backoffice/ImportView.vue'
import BOReset    from '@/views/backoffice/ResetView.vue'
import BOTickets  from '@/views/backoffice/TicketsView.vue'
import BOFeuil2   from '@/views/backoffice/Feuil2View.vue'
import BOKanbanConfig from '@/views/backoffice/KanbanSettingsView.vue'

// Frontoffice
import FOLayout   from '@/views/frontoffice/LayoutFO.vue'
import FOAssets   from '@/views/frontoffice/AssetsView.vue'
import FOTicket   from '@/views/frontoffice/NewTicketView.vue'
import FOKanban   from '@/views/frontoffice/KanbanView.vue'

const routes = [
  // ── Redirect racine ──────────────────────────────────
  { path: '/', redirect: '/front/assets' },

  // ── Backoffice Login ─────────────────────────────────
  { path: '/backoffice/login', component: BOLogin, meta: { title: 'Connexion Backoffice' } },

  // ── Backoffice (protégé) ─────────────────────────────
  {
    path: '/backoffice',
    component: BOLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '',          redirect: '/backoffice/dashboard' },
      { path: 'dashboard', component: BODash,    meta: { title: 'Dashboard' } },
      { path: 'import',    component: BOImport,  meta: { title: 'Import données' } },
      { path: 'reset',     component: BOReset,   meta: { title: 'Réinitialisation' } },
      { path: 'tickets',   component: BOTickets, meta: { title: 'Tickets' } },
      { path: 'feuil2',    component: BOFeuil2,  meta: { title: 'Feuil 2 — SQLite' } },
      { path: 'settings',  component: BOKanbanConfig, meta: { title: 'Configuration Kanban' } },
    ]
  },

  // ── Frontoffice ───────────────────────────────────────
  {
    path: '/front',
    component: FOLayout,
    children: [
      { path: '',        redirect: '/front/assets' },
      { path: 'assets',  component: FOAssets, meta: { title: 'Catalogue d\'équipements' } },
      { path: 'kanban',  component: FOKanban, meta: { title: 'Tableau Kanban' } },
      { path: 'ticket',  component: FOTicket, meta: { title: 'Nouveau ticket' } },
    ]
  },

  // ── 404 ───────────────────────────────────────────────
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// ── Navigation guard ─────────────────────────────────
router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return '/backoffice/login'
  }
})

// ── Titre de page ─────────────────────────────────────
router.afterEach((to) => {
  document.title = to.meta.title
    ? `${to.meta.title} — SnipeIT NewApp`
    : 'SnipeIT NewApp'
})

export default router
