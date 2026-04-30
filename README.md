# 🚉 Gerzat Live

**Gerzat Live v3.7.0 • 2026**

Application web Next.js pour consulter rapidement les prochains passages des bus T2C et des trains TER à Gerzat, avec tableau temps réel, favoris et carte live de la ligne E1.

[![Démo en ligne](https://img.shields.io/badge/démo-en%20ligne-brightgreen)](https://gerzatlive.desimone.fr)
[![Version](https://img.shields.io/badge/version-3.7.0-blue)](https://github.com/nickdesi/BusTrainGerzat)
[![Déploiement Coolify](https://img.shields.io/badge/déploiement-Coolify-blueviolet?logo=rocket)](https://coolify.io/)

<div align="center">
  <img src="docs/images/homepage.png" alt="Tableau des départs Gerzat Live" width="400" />
  <img src="docs/images/map.png" alt="Carte live de la ligne E1" width="400" />
</div>

## ✨ Objectif

Gerzat Live centralise les informations utiles avant un trajet : prochains départs et arrivées, bus T2C ligne E1, trains TER, favoris et carte live.

L’interface est pensée pour une consultation rapide sur mobile avec un design sombre lisible et les informations prioritaires visibles immédiatement.

## 📍 Arrêts et gare surveillés

| Transport | Arrêt / Gare | Ligne(s) |
| --- | --- | --- |
| 🚌 Bus T2C | **Gerzat Champfleuri** | Ligne E1, toutes directions |
| 🚌 Bus T2C Express | **Le Patural** | Ligne E1, direction Ballainvilliers |
| 🚆 Train TER | **Gare de Gerzat** | TER Auvergne |

## 🚀 Fonctionnalités

### Tableau des départs et arrivées

- Vue unifiée bus + TER.
- Horaires théoriques et temps réel.
- Statuts de retard, avance, annulation et disponibilité live.
- Favoris persistants pour mettre en avant les trajets importants.
- Détail de trajet bus disponible au clic.

### Carte live ligne E1

- Carte Leaflet / React-Leaflet côté client.
- Fond Carto basemap clair/sombre.
- Recalcul automatique de taille via `invalidateSize()` pour un affichage fiable.
- Tracé principal, branches, arrêts importants et véhicules actifs.
- Gestion des marqueurs proches pour limiter les superpositions.

### Données bus T2C

- GTFS statique pour les horaires planifiés.
- GTFS-RT Trip Updates pour les prévisions temps réel.
- GTFS-RT Vehicle Positions pour les positions GPS quand disponibles.
- Fallback intelligent quand certaines données temps réel manquent.

### Données train TER

- Intégration des horaires SNCF / Navitia.
- Trains dans les deux sens.
- Statuts retardés ou annulés.
- Heures d’arrivée et de départ à Gerzat.

### Expérience utilisateur

- Interface responsive mobile-first.
- Navigation simple : départs, arrivées, carte.
- Landing page repensée pour présenter clairement le produit.
- PWA installable sur mobile.
- Accessibilité renforcée : contrastes, focus clavier, ARIA, lien d’évitement.

## 🧠 Serveur MCP

Le projet expose un serveur **MCP (Model Context Protocol)** pour permettre à un agent IA d’interroger les données de transport.

Outils disponibles :

- `get_bus_positions` : positions GPS et cap des bus E1 ;
- `get_departures` : prochains départs, filtrables par type (`BUS`, `TRAIN`, `ALL`) ;
- `get_line_status` : résumé de ligne, nombre de véhicules et retard moyen.

```bash
npm run mcp
```

## 🛠️ Stack technique

- **Framework** : Next.js 16, App Router
- **Langage** : TypeScript
- **UI** : React 19, Tailwind CSS v4
- **Données client** : TanStack Query
- **Carte** : Leaflet 1.9, React-Leaflet 5
- **Tests** : Jest, Testing Library
- **PWA** : manifest + service worker
- **Déploiement** : Coolify compatible via `nixpacks.toml`

## 📂 Structure

```text
src/
├── app/              # Routes Next.js App Router
├── components/       # Composants React UI
├── components/map/   # Composants dédiés à la carte
├── hooks/            # Hooks de données et état local
├── lib/              # Clients API, GTFS-RT, logging, sécurité
├── mcp-server/       # Serveur MCP
├── services/         # Services métier bus et train
├── types/            # Types TypeScript partagés
└── utils/            # Formatage et helpers
```

## 📡 Sources de données

| Transport | Type | Source |
| --- | --- | --- |
| Bus T2C | GTFS-RT temps réel | transport.data.gouv.fr |
| Bus T2C | GTFS statique | Clermont Métropole Open Data |
| Train TER | API SNCF / Navitia | api.sncf.com |

## 📦 Installation locale

Prérequis : Node.js `>= 24.13.0`, npm et une clé API SNCF / Navitia.

```bash
npm install
```

Créer `.env.local` :

```bash
SNCF_API_KEY=votre_cle_api_sncf
```

Lancer le développement :

```bash
npm run dev
```

Puis ouvrir `http://localhost:3000`.

## 🔧 Scripts utiles

```bash
npm run dev      # serveur de développement
npm run build    # build production
npm run start    # serveur production
npm run lint     # analyse ESLint
npm run test     # tests Jest
npm run mcp      # serveur MCP
```

## 🔄 Mise à jour des données

```bash
python3 generate_static_json.py
python3 extract_lineE1_data.py
python3 scripts/check_gtfs_update.py
```

Les horaires bus T2C peuvent aussi être vérifiés automatiquement via GitHub Actions.

## 📱 Installation mobile

### iPhone / iPad

1. Ouvrir [gerzatlive.desimone.fr](https://gerzatlive.desimone.fr) dans Safari.
2. Appuyer sur **Partager**.
3. Choisir **Sur l’écran d’accueil**.
4. Valider avec **Ajouter**.

### Android

1. Ouvrir [gerzatlive.desimone.fr](https://gerzatlive.desimone.fr) dans Chrome.
2. Ouvrir le menu `⋮`.
3. Choisir **Installer l’application** ou **Ajouter à l’écran d’accueil**.
4. Confirmer.

## ✅ Version 3.7.0

Cette version apporte notamment :

- refonte de la landing page ;
- carte live plus fiable avec wrapper Leaflet client dédié ;
- correction CSP en développement pour React / Next ;
- amélioration du rendu visuel de la page carte ;
- documentation française mise à jour.

## 📄 Licence

Projet personnel open source sous licence MIT.
