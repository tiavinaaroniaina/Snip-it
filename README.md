# SnipeIT NewApp — Vue 3

Interface complémentaire à SnipeIT, développée en Vue.js 3.

## Stack technique

| Technologie | Usage |
|-------------|-------|
| Vue 3 + Composition API | Framework frontend |
| Vue Router 4 | Navigation + garde d'auth |
| Pinia | State management |
| Axios | Appels API SnipeIT |
| PapaParse | Parsing CSV |
| localStorage | SQLite simulé (browser) |

---

## 🚀 Installation

```bash
# 1. Installer les dépendances
npm install

# 2. Copier le fichier d'environnement
cp .env.example .env.local

# 3. Remplir le token SnipeIT dans .env.local
#    VITE_SNIPEIT_TOKEN=votre_token_ici

# 4. Lancer le serveur de développement
npm run dev
# → http://localhost:5173
```

---

## 🏗️ Structure du projet

```
newapp/
├── src/
│   ├── assets/
│   │   └── global.css          ← Design system complet
│   ├── stores/
│   │   ├── auth.js             ← Authentification (code unique)
│   │   └── db.js               ← Base de données locale (Pinia + localStorage)
│   ├── services/
│   │   └── snipeit.js          ← Toutes les requêtes vers l'API SnipeIT
│   ├── router/
│   │   └── index.js            ← Routes + garde de navigation
│   ├── views/
│   │   ├── backoffice/
│   │   │   ├── LoginView.vue   ← Connexion par code unique
│   │   │   ├── LayoutBO.vue    ← Layout avec sidebar
│   │   │   ├── DashboardView.vue  ← Stats éléments + tickets
│   │   │   ├── ImportView.vue     ← Import CSV (Feuil1 + Feuil2)
│   │   │   ├── ResetView.vue      ← Réinitialisation données
│   │   │   ├── TicketsView.vue    ← Liste + fiche ticket
│   │   │   └── Feuil2View.vue     ← Données SQLite
│   │   └── frontoffice/
│   │       ├── LayoutFO.vue       ← Layout avec header/footer
│   │       ├── AssetsView.vue     ← Catalogue + recherche multi-critère
│   │       └── NewTicketView.vue  ← Création ticket + association éléments
│   ├── App.vue
│   └── main.js
├── .env.example
├── index.html
├── package.json
└── vite.config.js
```

---

## 🔐 Authentification Backoffice

Le backoffice est protégé par un **code unique** (pas de login/password traditionnel).

- Code par défaut : **`ADMIN2026`**
- Pré-rempli dans le formulaire de connexion
- Modifiable dans `src/stores/auth.js` → constante `BACKOFFICE_CODE`
- La session est conservée dans `sessionStorage` (perdue à la fermeture du navigateur)

---

## 📦 Fonctionnalités

### Backoffice (protégé)

| Page | URL | Description |
|------|-----|-------------|
| Login | `/backoffice/login` | Connexion par code unique |
| Dashboard | `/backoffice/dashboard` | Stats éléments + tickets |
| Import | `/backoffice/import` | Upload CSV Feuil1 + Feuil2 |
| Tickets | `/backoffice/tickets` | Liste + gestion des tickets |
| Feuil 2 | `/backoffice/feuil2` | Données SQLite |
| Reset | `/backoffice/reset` | Réinitialisation données |

### Frontoffice (public)

| Page | URL | Description |
|------|-----|-------------|
| Catalogue | `/front/assets` | Liste éléments + recherche multi-critère |
| Nouveau ticket | `/front/ticket` | Création ticket + association éléments |

---

## 📁 Format CSV attendu

### Feuille 1 (Assets)

```csv
name,asset_tag,category,location,serial,model,status,purchase_date,purchase_cost
MacBook Pro 14",LAP-001,Laptop,Paris,C02XL0J,Apple MacBook Pro,Ready to Deploy,2024-01-15,2499
```

Colonnes reconnues automatiquement (avec variantes FR/EN) :
- `name` / `Nom`
- `asset_tag` / `Asset Tag`
- `category` / `Catégorie` / `Type`
- `location` / `Localisation`
- `serial` / `Numéro de série`
- `model` / `Modèle`
- `status` / `Statut`

### Feuille 2 (SQLite)

Format libre — toutes les colonnes sont détectées automatiquement.

---

## 🔗 Connexion avec SnipeIT

### 1. Obtenir le token API

1. Ouvrir SnipeIT → http://localhost:8000
2. Profil utilisateur → **API Tokens**
3. Générer un token
4. Copier dans `.env.local` : `VITE_SNIPEIT_TOKEN=xxx`

### 2. Synchroniser les assets

Dans le Dashboard → bouton **"Sync SnipeIT"**

Les données SnipeIT seront chargées et stockées localement.

### 3. Envoyer un CSV vers SnipeIT

Dans Import → **"Envoyer vers SnipeIT"** (après avoir uploadé le CSV)

---

## 🗄️ SQLite (Feuil 2)

En mode browser, les données sont stockées dans `localStorage`.

Pour utiliser un **vrai SQLite** avec `better-sqlite3` :

```bash
# Installer le backend Express
npm install express better-sqlite3 cors

# Lancer le serveur
node server/index.js
```

Le fichier `server/index.js` expose une API REST :
- `GET  /api/feuil2` → lire toutes les lignes
- `POST /api/feuil2/import` → importer un tableau JSON
- `DELETE /api/feuil2` → vider la table

---

## 🛠️ Configuration Vite

Le proxy Vite redirige :
- `/api/snipeit/*` → `http://localhost:8000/api/v1/*` (SnipeIT)
- `/api/*` → `http://localhost:3001/*` (backend Node optionnel)

---

## 📝 Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `VITE_SNIPEIT_TOKEN` | Token Bearer pour l'API SnipeIT | — |
| `VITE_SNIPEIT_URL` | URL de SnipeIT | `http://localhost:8000` |
