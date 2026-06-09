import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  // Charger les variables d'env (y compris .env.local)
  const env = loadEnv(mode, process.cwd(), '')

  const snipeitToken = env.VITE_SNIPEIT_TOKEN || ''
  const snipeitUrl   = env.VITE_SNIPEIT_URL   || 'http://localhost:8000'

  console.log('[Vite Config] SnipeIT URL:', snipeitUrl)
  console.log('[Vite Config] SnipeIT Token loaded:', snipeitToken ? 'YES (starts with ' + snipeitToken.substring(0, 10) + '...)' : 'NO')

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server: {
      port: 5173,
      proxy: {
        // Toutes les requêtes /api/snipeit/* → SnipeIT
        // Le token est injecté ICI côté serveur Vite, pas dans le browser
        '/api/snipeit': {
          target: snipeitUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/snipeit/, '/api/v1'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              // Injecter les headers obligatoires côté proxy (pas côté browser)
              proxyReq.setHeader('Authorization',  `Bearer ${snipeitToken}`)
              proxyReq.setHeader('Accept',         'application/json')
              proxyReq.setHeader('Content-Type',   'application/json')
            })
            proxy.on('error', (err, req, res) => {
              console.error('[Proxy SnipeIT] Erreur :', err.message)
              res.writeHead(502, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({
                error: true,
                message: `Impossible de joindre SnipeIT sur ${snipeitUrl}. Vérifiez que SnipeIT est lancé (php artisan serve).`,
                detail: err.message
              }))
            })
          }
        },

        // Backend Node SQLite optionnel
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('error', (err, req, res) => {
              res.writeHead(502, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: true, message: 'Backend Node non disponible (port 3001).' }))
            })
          }
        }
      }
    }
  }
})
