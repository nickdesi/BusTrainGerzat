# 🚉 Gerzat Live

**Gerzat Live v3.7.3 • 2026**

Application web Next.js pour consulter rapidement les prochains passages des bus T2C et des trains TER à Gerzat, avec tableau temps réel, favoris, carte live modernisée de la ligne E1, sélecteur de trajet et indicateurs de fraîcheur des données.

[![Démo en ligne](https://img.shields.io/badge/démo-en%20ligne-brightgreen)](https://gerzatlive.desimone.fr)
[![Version](https://img.shields.io/badge/version-3.7.3-blue)](https://github.com/nickdesi/BusTrainGerzat)
[![Déploiement Coolify](https://img.shields.io/badge/déploiement-Coolify-blueviolet?logo=rocket)](https://coolify.io/)

<div align="center">
  <img src="docs/images/homepage.png" alt="Tableau des départs Gerzat Live" width="400" />
  <img src="docs/images/map.png" alt="Carte live de la ligne E1" width="400" />
</div>

## Sommaire

- [Objectif](#-objectif)
- [Fonctionnalités](#-fonctionnalités)
- [Architecture des données](#-architecture-des-données)
- [Stack technique](#️-stack-technique)
- [Installation locale](#-installation-locale)
- [Variables d’environnement](#-variables-denvironnement)
- [Scripts utiles](#-scripts-utiles)
- [Tests et validation](#-tests-et-validation)
- [Mise à jour des données T2C](#-mise-à-jour-des-données-t2c)
- [CI et qualité](#-ci-et-qualité)
- [Déploiement](#-déploiement)
- [Dépannage](#-dépannage)
- [Licence](#-licence)

## ✨ Objectif

Gerzat Live centralise les informations utiles avant un trajet depuis ou vers Gerzat : prochains départs, arrivées, bus T2C ligne E1, trains TER, favoris et carte live.

L’interface est mobile-first, sombre, lisible et pensée pour afficher immédiatement les informations prioritaires : horaire, retard, annulation, source temps réel et état de fraîcheur des données.

## 📍 Arrêts et gare surveillés

| Transport | Arrêt / Gare | Ligne(s) |
| --- | --- | --- |
| 🚌 Bus T2C | **Gerzat Champfleuri** | Ligne E1, toutes directions |
| 🚌 Bus T2C Express | **Le Patural** | Ligne E1, direction Ballainvilliers |
| 🚆 Train TER | **Gare de Gerzat** | TER Auvergne |

## 🚀 Fonctionnalités

### Tableau départs / arrivées

- Vue unifiée bus + TER.
- Horaires théoriques et temps réel.
- Statuts retard, avance, annulation et disponibilité live.
- Favoris persistants pour mettre en avant les trajets importants.
- Détail de trajet bus disponible au clic.

### Carte live ligne E1

- Carte Leaflet / React-Leaflet côté client, rendue en canvas pour préserver les performances.
- Fond Carto basemap clair/sombre avec bascule intégrée.
- Design modernisé : carte “glass”, contrôles compacts, marqueurs bus vectoriels, popups enrichies et HUD temps réel.
- Sélecteur de trajet **Tous / Gerzat / Aubière** pour éviter les tracés superposés et n’afficher que la direction utile.
- Filtrage synchronisé des véhicules selon la direction sélectionnée.
- Tracés complets par direction, branches, arrêts importants et terminus.
- Positions GPS GTFS-RT quand disponibles.
- Interpolation ou fallback horaire quand le temps réel est incomplet.

### Qualité et fraîcheur des données

- Endpoint de fraîcheur global pour T2C et SNCF.
- Détection des données GTFS T2C obsolètes.
- Statut SNCF/Navitia basé sur la présence de clé API, le cache et l’âge des dernières données.
- Tests unitaires sur les helpers critiques T2C/SNCF.

## 🧭 Architecture des données

```mermaid
flowchart LR
  subgraph Sources[Sources externes]
    T2CStatic[GTFS statique T2C]
    T2CRT["GTFS-RT T2C<br/>Trip Updates + Vehicles"]
    SNCF[SNCF / Navitia]
  end

  subgraph Data[Données générées]
    StaticSchedule["src/data/static_schedule.json"]
    GtfsConfig["src/data/gtfs_config.json"]
    LineE1Map["public/data/lineE1_data.json"]
    LineE1StopTimes["public/data/e1_stop_times.json"]
  end

  subgraph Server[Next.js API + services]
    BusService["bus.service.ts"]
    E1Service["t2c-line-e1.service.ts"]
    TrainService["train.service.ts"]
    Freshness["gtfs-freshness.ts"]
  end

  subgraph API[API internes]
    Realtime["/api/realtime"]
    Vehicles["/api/vehicles"]
    Trip["/api/trip/[tripId]"]
    Line["/api/lineE1"]
    Trains["/api/trains"]
    Fresh["/api/freshness"]
    Stream["/api/stream"]
  end

  subgraph UI[Interface]
    Board[Tableau départs / arrivées]
    Map[Carte live E1]
    Favorites[Favoris]
    Status[Alertes fraîcheur]
  end

  T2CStatic --> StaticSchedule
  T2CStatic --> GtfsConfig
  T2CStatic --> LineE1Map
  T2CStatic --> LineE1StopTimes
  T2CRT --> BusService
  T2CRT --> E1Service
  SNCF --> TrainService
  StaticSchedule --> BusService
  GtfsConfig --> BusService
  LineE1StopTimes --> E1Service
  LineE1Map --> Map
  BusService --> Realtime
  E1Service --> Vehicles
  E1Service --> Trip
  E1Service --> Line
  TrainService --> Trains
  Freshness --> Fresh
  Realtime --> Board
  Trains --> Board
  Vehicles --> Map
  Trip --> Map
  Line --> Map
  Stream --> Board
  Fresh --> Status
  Board --> Favorites
```

### Bus T2C

Gerzat Live combine plusieurs niveaux de données pour garder l’affichage exploitable même si un flux est incomplet :

1. **GTFS statique** : horaires planifiés, arrêts, routes, trips, shapes et fichiers générés.
2. **GTFS-RT Trip Updates** : retards, annulations et prévisions temps réel.
3. **GTFS-RT Vehicle Positions** : positions GPS et cap des véhicules quand disponibles.
4. **Fallback applicatif** : interpolation sur tracé E1 ou horaire théorique si un signal live manque.

```mermaid
flowchart TD
  Request[Requête carte ou départs] --> HasRealtime{Signal GTFS-RT disponible ?}
  HasRealtime -- Oui --> TripUpdate["Trip Update<br/>retards / annulations"]
  HasRealtime -- Oui --> VehicleGPS["Vehicle Position<br/>GPS + cap"]
  HasRealtime -- Non --> Static[Horaire GTFS statique]
  TripUpdate --> Merge[Fusion service E1]
  VehicleGPS --> Merge
  Static --> Interpolation[Interpolation sur shape E1]
  Interpolation --> Merge
  Merge --> Confidence{Qualité position}
  Confidence -- GPS --> Live[Affichage live]
  Confidence -- Estimée --> Estimated[Affichage estimé]
  Confidence -- Statique --> Fallback[Fallback horaire]
```

La logique spécifique à la ligne E1 est centralisée dans `src/services/t2c-line-e1.service.ts` afin d’éviter la duplication entre `/api/vehicles`, `/api/trip/[tripId]` et les services métier.

### Carte live E1

```mermaid
flowchart LR
  Direction["Filtre trajet<br/>Tous / Gerzat / Aubière"] --> Shapes{Shapes visibles}
  Direction --> Buses{Bus visibles}
  Shapes -- Tous --> Both[Deux directions + branches]
  Shapes -- Gerzat --> North[Tracé direction Gerzat]
  Shapes -- Aubière --> South[Tracé direction Aubière]
  Buses -- Tous --> AllVehicles[Tous les véhicules E1]
  Buses -- Gerzat --> NorthVehicles[Bus direction Gerzat]
  Buses -- Aubière --> SouthVehicles[Bus direction Aubière]
  Both --> Leaflet[LeafletMapClient]
  North --> Leaflet
  South --> Leaflet
  AllVehicles --> Leaflet
  NorthVehicles --> Leaflet
  SouthVehicles --> Leaflet
```

## 🛠️ Stack technique

- **Framework** : Next.js 16, App Router
- **Langage** : TypeScript
- **UI** : React 19, Tailwind CSS v4
- **Données client** : TanStack Query
- **Carte** : Leaflet 1.9, React-Leaflet 5
- **Validation** : Zod
- **Tests** : Jest, Testing Library
- **PWA** : manifest + service worker
- **Déploiement** : Coolify / Nixpacks

## 📂 Structure

```text
src/
├── app/              # Routes Next.js App Router, pages et API internes
├── components/       # Composants React UI transverses
├── components/map/   # Carte E1, légende, statut, overlays et rendu Leaflet
├── hooks/            # Hooks TanStack Query, favoris, fraîcheur et temps réel
├── lib/              # Clients API, GTFS-RT, fraîcheur, logging, rate-limit
├── services/         # Services métier T2C, ligne E1 et SNCF/Navitia
├── types/            # Types TypeScript partagés
└── utils/            # Formatage et helpers date
```

## 📡 Sources de données

| Transport | Type | Source |
| --- | --- | --- |
| Bus T2C | GTFS-RT temps réel | transport.data.gouv.fr |
| Bus T2C | GTFS statique | Clermont Métropole Open Data |
| Train TER | API SNCF / Navitia | api.sncf.com |

## 📦 Installation locale

### Prérequis

- Node.js `>= 24.15.0` ;
- npm ;
- une clé API SNCF / Navitia pour les trains ;
- Python `>= 3.13` uniquement pour régénérer les données GTFS.

### Démarrage rapide

```bash
npm install
npm run dev
```

Puis ouvrir `http://localhost:3000`.

### Configuration trains

Créer `.env.local` à la racine du dépôt :

```bash
SNCF_API_KEY=votre_cle_api_sncf
```

Sans cette variable, les données TER SNCF/Navitia ne peuvent pas être récupérées.

## 🔐 Variables d’environnement

| Variable | Requise | Description |
| --- | --- | --- |
| `SNCF_API_KEY` | Oui pour les trains | Clé API SNCF/Navitia utilisée par les endpoints TER. |

## 🔧 Scripts utiles

| Commande | Description |
| --- | --- |
| `npm run dev` | Lance le serveur de développement Next.js. |
| `npm run build` | Compile l’application pour la production. |
| `npm run start` | Lance le serveur Next.js après un build. |
| `npm run lint` | Exécute ESLint. |
| `npm run test` | Exécute la suite Jest. |
| `npm run test:watch` | Exécute Jest en mode watch. |

## 🧪 Tests et validation

Validation complète recommandée avant publication :

```bash
npm run lint
npm run test -- --runInBand
npm run build
```

Les tests couvrent notamment :

- les helpers ligne E1 et la correspondance fuzzy des trip IDs ;
- les règles de filtrage/remplacement T2C ;
- la fraîcheur SNCF/Navitia ;
- les helpers de date, formatage, API client et interpolation véhicule.

## 🔄 Mise à jour des données T2C

Les données générées sont principalement :

- `gtfs_data/` : archive GTFS T2C extraite ;
- `src/data/static_schedule.json` : horaires statiques consommés par l’app ;
- `src/data/gtfs_config.json` : configuration arrêts/routes ;
- `public/data/lineE1_data.json` : arrêts officiels et tracés de la ligne E1 pour la carte ;
- `public/data/e1_stop_times.json` : trips et stop times E1 pour les détails de trajet.

Régénération locale :

```bash
python3 scripts/gtfs/check_gtfs_update.py
python3 scripts/gtfs/generate_static_json.py
python3 scripts/gtfs/generate_e1_stop_times.py
python3 scripts/gtfs/extract_lineE1_data.py
```

Le workflow GitHub Actions `Update T2C GTFS Schedule` exécute automatiquement cette chaîne, valide les JSON générés, lance lint/tests/build, puis commit uniquement si les données changent.

## ✅ CI et qualité

Le workflow `CI` s’exécute sur `main` et sur les pull requests :

1. installation via `npm ci` ;
2. lint ESLint ;
3. tests Jest en série ;
4. build Next.js.

## 🚢 Déploiement

Le projet est compatible Coolify via `nixpacks.toml`.

Versions alignées :

- Node.js `24.15.0` en local, CI et Nixpacks ;
- Python `3.13` dans le workflow de mise à jour GTFS ;
- Next.js `16.2.x` et React `19.2.x`.

Variables d’environnement requises en production :

```bash
SNCF_API_KEY=votre_cle_api_sncf
```

## 🩺 Dépannage

### Les trains ne s’affichent pas

Vérifier que `SNCF_API_KEY` est définie dans `.env.local` en développement et dans l’environnement de production.

### La carte E1 affiche des arrêts ou tracés obsolètes

Régénérer les données GTFS, puis vérifier `public/data/lineE1_data.json` et `public/data/e1_stop_times.json`.

### Le build échoue après une mise à jour de dépendances

Relancer une installation propre puis les validations :

```bash
npm install
npm run lint
npm run test -- --runInBand
npm run build
```

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

## ✅ Version 3.7.3

Cette version apporte notamment :

- modernisation complète de la carte live E1 : interface glass, contrôles compacts, marqueurs bus vectoriels, popups enrichies et HUD temps réel ;
- ajout du sélecteur de trajet **Tous / Gerzat / Aubière** avec filtrage des tracés et véhicules par direction ;
- centralisation de la logique Line E1 dans `t2c-line-e1.service.ts` ;
- refactor des routes `/api/vehicles` et `/api/trip/[tripId]` ;
- amélioration des règles T2C : fallback GPS, interpolation, retards, annulations et remplacement de trips ;
- ajout d’un statut de fraîcheur SNCF/Navitia ;
- tests unitaires supplémentaires sur T2C et SNCF ;
- création d’un workflow CI complet ;
- durcissement du workflow de mise à jour GTFS ;
- alignement Node.js `24.15.0`, Python `3.13`, Next.js 16 et React 19.

## 📄 Licence

Projet personnel open source sous licence MIT.
