# Guide d'installation SnipeIT en local

## Prérequis

- PHP 8.1 ou supérieur
- Composer
- MySQL 5.7+ ou MariaDB 10.3+
- Node.js 16+
- Git

---

## Étape 1 — Télécharger SnipeIT

```bash
# Option A : télécharger la release v8.6.1
wget https://github.com/snipe/snipe-it/archive/refs/tags/v8.6.1.zip
unzip v8.6.1.zip
cd snipe-it-8.6.1

# Option B : cloner le repo
git clone https://github.com/snipe/snipe-it.git
cd snipe-it
git checkout v8.6.1
```

---

## Étape 2 — Configurer l'environnement

```bash
# Copier le fichier .env
cp .env.example .env

# Éditer .env avec vos valeurs
nano .env
```

Valeurs minimales à configurer dans `.env` :

```env
APP_ENV=local
APP_DEBUG=true
APP_KEY=                          # généré à l'étape 4
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=snipeit
DB_USERNAME=root
DB_PASSWORD=votre_mot_de_passe
```

---

## Étape 3 — Créer la base de données MySQL

```sql
mysql -u root -p
CREATE DATABASE snipeit CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

---

## Étape 4 — Installer les dépendances

```bash
# Dépendances PHP
composer install --no-dev --prefer-dist

# Générer la clé d'application
php artisan key:generate

# Migrations et données initiales
php artisan migrate --seed

# Assets frontend
npm install
npm run dev    # ou npm run build pour la prod
```

---

## Étape 5 — Lancer le serveur

```bash
php artisan serve --port=8000
# → http://localhost:8000
```

Identifiants par défaut après le seed :
- **Email** : admin@example.com
- **Mot de passe** : password

---

## Étape 6 — Générer le token API pour NewApp

1. Se connecter à http://localhost:8000
2. Cliquer sur l'avatar (en haut à droite) → **Manage API Tokens**
3. Cliquer **New Token** → Nommer le token `NewApp`
4. Copier le token généré
5. Le coller dans `newapp/.env.local` :

```env
VITE_SNIPEIT_TOKEN=votre_token_ici
```

---

## Étape 7 — Importer les données CSV dans SnipeIT

### Méthode 1 — Via la NewApp (recommandé)

1. Lancer la NewApp : `cd newapp && npm run dev`
2. Aller sur http://localhost:5173/backoffice/login (code : `ADMIN2026`)
3. Aller dans **Import données**
4. Uploader `sample-data/import-assets-feuil1.csv`
5. Cliquer **Envoyer vers SnipeIT**

### Méthode 2 — Via l'interface SnipeIT

1. Dans SnipeIT → **Settings** → **Import**
2. Choisir le type "Assets"
3. Uploader le fichier CSV
4. Mapper les colonnes

---

## Vérification — Données visibles dans SnipeIT

Après import, vérifier dans SnipeIT que :

| Section SnipeIT | Données |
|-----------------|---------|
| Assets → Hardware | Tous les équipements Feuil 1 |
| Assets → Categories | Laptop, Smartphone, Tablette, Écran, etc. |
| Assets → Locations | Paris - Siège, Lyon - Agence, Marseille - Agence |
| Reports → Activity | Historique des imports |

---

## Architecture complète

```
┌─────────────────────────────┐     ┌──────────────────────────┐
│        NewApp (Vue 3)        │     │    SnipeIT (Laravel)     │
│     localhost:5173           │     │    localhost:8000        │
│                              │     │                          │
│  ┌─────────────┐             │     │  ┌──────────────────┐   │
│  │  Backoffice │◄────────────┼─────┼─►│    API REST       │   │
│  │  (protégé)  │  JSON/HTTP  │     │  │  /api/v1/        │   │
│  └─────────────┘             │     │  └──────────────────┘   │
│                              │     │                          │
│  ┌─────────────┐             │     │  ┌──────────────────┐   │
│  │ Frontoffice │             │     │  │   MySQL Database  │   │
│  │  (public)   │             │     │  └──────────────────┘   │
│  └─────────────┘             │     └──────────────────────────┘
│                              │
│  ┌─────────────┐             │     ┌──────────────────────────┐
│  │  localStorage│            │     │  Backend Node (optionnel) │
│  │  (SQLite sim)│            │     │  localhost:3001           │
│  └─────────────┘             │     │  better-sqlite3          │
└─────────────────────────────┘     └──────────────────────────┘
```

---

## Troubleshooting

### SnipeIT : erreur 500
```bash
php artisan config:clear
php artisan cache:clear
chmod -R 775 storage bootstrap/cache
```

### NewApp : erreur CORS
Vérifier que `vite.config.js` a le proxy configuré correctement.
SnipeIT doit être sur le port 8000.

### NewApp : "Unauthorized" sur l'API
Vérifier que `VITE_SNIPEIT_TOKEN` est bien rempli dans `.env.local`.
Le token doit avoir les permissions **Read** et **Create**.
