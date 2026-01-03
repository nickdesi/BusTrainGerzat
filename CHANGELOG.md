# Changelog

## [3.4.0] - 2026-01-02

### ♿ Accessibilité WCAG 2.1 AA

- **Conformité RGAA 4 / WCAG 2.1 AA** : Refonte complète de l'accessibilité.
  - Suppression du mode daltonien (les couleurs sont maintenant accessibles par défaut).
  - Contrastes ≥4.5:1 pour tous les textes importants.
  - Skip links ajoutés sur les pages départs et arrivées.
  - Couleurs de statut WCAG-compliant : vert (#4ade80), orange (#fb923c), rouge (#f87171).
  - **Targets Tactiles (WCAG AAA)** : Agrandissement des zones de clic à 44px (Boutons Fermer, Favoris, Recherche).

### 📱 Optimisation Mobile

- **Légende Carte Dynamique** : La légende est maintenant repliable sur mobile.
  - Gain de place significatif sur petits écrans.
  - Bouton HUD circulaire pour afficher/masquer.
- **Support Notch/Barre** : Ajout de la classe `safe-area-bottom`.
  - Évite que le menu du bas ne soit coupé par la barre de navigation système (iPhone).
- **Viewport** : Ajout de `user-scalable=no` pour une expérience "app-like" plus stable.

### 🔧 Maintenance

- **Fix Deprecation Warning** : Résolution de l'avertissement `whatwg-encoding` au déploiement.
  - Surcharge de la version de `jsdom` (force ^27.4.0) dans `package.json`.
  - Suppression de la dépendance transitive obsolète.

### 🧪 Infrastructure Qualité

- **Tests Unitaires** : Mise en place de Jest + Testing Library.
  - Configuration `jest.config.ts` pour Next.js.
  - 9 tests unitaires pour les utilitaires de formatage.
  - Scripts `npm test` et `npm test:watch` ajoutés.
- **Types par Domaine** : Réorganisation des types TypeScript.
  - `types/bus.ts` : Types spécifiques bus (BusUpdate, BusStop, BusTrip).
  - `types/train.ts` : Types spécifiques train (TrainUpdate, TrainStation).
  - `types/common.ts` : Types partagés (UnifiedEntry, TransportFilter, ApiResponse).

### 🛡️ Résilience

- **Client HTTP avec Retry** : Nouveau service `api-client.ts`.
  - 3 tentatives automatiques avec backoff exponentiel.
  - Timeout 15s et jitter anti-thundering herd.
- **Error Boundaries** : Nouveau composant `SectionErrorBoundary.tsx`.
  - Isolation des erreurs par section sans crash de l'app.

### 📊 Observabilité

- **Logger Structuré** : Nouveau service `logger.ts`.
  - Niveaux: debug, info, warn, error.
  - Contexte JSON en production, émojis colorés en dev.
  - Métriques de performance avec `startTimer()`.
- **Intégration** : `gtfs-rt.ts` utilise maintenant le logger structuré.

### 🧹 Nettoyage

- Suppression de 7 scripts de debug obsolètes (~528 lignes).
- Suppression du contexte ColorblindContext (mode daltonien).

## [3.3.0] - 2025-12-30

### 🚀 Nouvelle Landing Page

- **Refonte de l'Accueil** : Création d'une page de présentation moderne à la racine (`/`).
  - Hero Section impactante avec animations.
  - Mise en avant des fonctionnalités clés (Temps réel, IA, Accessibilité).
  - Meilleur référencement SEO.
- **Séparation de l'App** : Le tableau de bord est désormais accessible via `/app`.
  - Architecture plus propre séparant le marketing de l'utilitaire.
  - Navigation simplifiée.

### 🐛 Correctifs

- **Contenu Landing Page** : Correction des références à l'ancienne "Ligne 20". La page d'accueil mentionne désormais exclusivement la **Ligne E1** et les arrêts **Champfleuri / Gare de Gerzat**.
- **PWA Launch** : Mise à jour du `manifest.json` pour pointer vers `/app`. L'application s'ouvre désormais directement sur le tableau de bord au lieu de la landing page.

### ⚡ Performance

- **Optimisation des requêtes API** : Activation du cache serveur Next.js pour le GTFS-RT.
  - `gtfs-rt.ts` : Remplacement de `cache: 'no-store'` par `next: { revalidate: 15 }`.
  - Réduit les appels à l'API T2C externe de N×4/min (par utilisateur) à **4/min total**.
  - Améliore la scalabilité et évite le rate-limiting.

## [3.2.0] - 2025-12-27

### ⚡ Performance & Core Update (Major)

- **Upgrade Stack Technique** : Passage à la dernière stack technique stable.
  - **Next.js 16.1.1** : Dernière version du framework React.
  - **React 19.2.3** : Moteur de rendu optimisé.
  - **Tailwind CSS 4.0.0** : Nouvelle version du moteur CSS.
  - **Node.js v22.12.0** : Support de la dernière version LTS.
- **ESLint/Config** : Refonte de la configuration de linting pour le support "Flat Config" (ESLint 9).

## [3.1.1] - 2024-12-24

### 🐛 Correctifs

- **Timeline Visual Fix** : Correction de la ligne verticale coupée/non droite dans les détails de trajet.
  - Utilisation d'une hauteur flexible au lieu de `h-12` fixe.
- **Calcul du Retard** : Le badge "+Xmin" correspond maintenant exactement à la différence entre l'heure prévue et l'heure prédit.
  - Avant : utilisait le champ `delay` brut du flux GTFS-RT (parfois incohérent).
  - Après : calcule `predictedArrival - scheduledArrival`.
- **Terminus incohérent** : Le terminus ne peut plus afficher une heure antérieure à l'arrêt précédent.
  - Propagation du dernier retard connu aux arrêts sans données RT.
  - Garantie de cohérence chronologique des temps.

## [3.1.0] - 2024-12-24

### 🛡️ Intégrité des Données (Critical)

- **Configuration Dynamique** : Suppression définitive des IDs codés en dur (`Route=3`, `Stops=GECHR...`).
  - Le script `generate_static_json.py` génère désormais `src/data/gtfs_config.json`.
  - Toutes les APIs TypeScript et scripts Python consomment ce fichier.
  - Garantie de fonctionnement même si T2C change les IDs internes.
- **Scripts d'Extraction** : `extract_lineE1_data.py` utilise maintenant la recherche par nom ("E1") au lieu de l'ID `'3'`.

### 🔍 SEO & Métadonnées

- **Optimisation SEO** : Audit complet pour s'assurer qu'aucune référence à l'ancienne "Ligne 20" ne persiste (remplacées par "Ligne E1").
- **Métadonnées Dynamiques** : Ajout de métadonnées spécifiques par page (`Arrivées`, `Carte Live`) pour un meilleur indexage.
- **Accessibilité** : Amélioration des balises `alt` sur les images et logos.
- **Versionning** : Synchronisation de `v3.1.0` sur l'ensemble du projet (Page d'accueil, Arrivées, README).

### 🔧 Refactoring

- **data-source.ts** : Migration vers le service centralisé `gtfs-rt.ts`.
  - Suppression de la duplication de logique de fetch/decode.
  - Uniformisation de la détection des "Ghost Cancellations".

## [3.0.4] - 2025-12-23

### 🔧 Refactoring

- **Service GTFS-RT centralisé** : Création de `src/lib/gtfs-rt.ts` pour éliminer la duplication de code.
  - `fetchTripUpdates()` et `fetchVehiclePositions()` mutualisés
  - Types partagés : `RTStopUpdate`, `RTTripUpdate`, `RTVehiclePosition`
  - ~110 lignes de code dupliqué supprimées des API routes
- **API refactorisées** : `api/vehicles` et `api/trip/[tripId]` utilisent maintenant le service centralisé.
- **ESLint** : Scripts utilitaires (`scripts/`, `debug_pipeline.js`) exclus du linting TypeScript.

## [3.0.3] - 2025-12-23

### ✨ Améliorations

- **Intégration GTFS-RT complète** : Refonte de l'API `/api/vehicles` pour utiliser les positions GPS réelles.
  - Priorité 1 : Positions GPS via GTFS-RT Vehicle Positions
  - Priorité 2 : Interpolation avec temps prédits via GTFS-RT Trip Updates
  - Priorité 3 : Fallback sur interpolation théorique si aucune donnée RT
  - Nouveau champ `isRealtime` pour indiquer la source de la position
- **Snap-to-Route** : Les bus restent maintenant sur la ligne jaune de la carte.
  - L'interpolation suit le tracé GTFS (shapes) au lieu de couper en ligne droite
  - Algorithme de recherche optimisé (échantillonnage puis raffinement)

### 🐛 Correctifs

- **Arrêts passés non grisés** : L'API `/api/trip/[tripId]` utilisait les horaires théoriques au lieu des temps prédits pour déterminer les arrêts passés.
  - Un bus en avance de 10 min affichait les arrêts comme "à venir" alors qu'ils étaient passés.
  - Correction : utilisation de `predictedTime` depuis GTFS-RT Trip Updates.
- **Position du bus incorrecte** : Sur la carte live, les bus en avance/retard étaient affichés à une position basée sur l'horaire théorique.
  - Maintenant les positions GPS réelles sont utilisées quand disponibles.

## [3.0.1] - 2025-12-22

### 🐛 Correctifs

- **Horaires Fantômes** : Correction critique du filtrage des horaires par date.
  - Les horaires du dimanche (vers Romagnat La Gazelle) n'apparaissent plus les jours de semaine
  - Le fichier `data-source.ts` filtre maintenant les horaires par date exacte (format YYYYMMDD)
  - Résout le problème des bus affichés à 10:49, 11:51 (départs) et 10:13, 11:15 (arrivées) qui n'existaient pas

## [3.0.2] - 2025-12-22

### 🐛 Correctifs

- **Bus "Annulés" en Doublon** : Correction d'un bug d'affichage où les bus en circulation étaient masqués par leur version théorique "Annulée".
  - Implémentation d'une déduplication intelligente : si un bus "Ajouté" (temps réel) existe dans un créneau de 20 min, la version "Annulée" correspondante est masquée.
  - Résout l'affichage "Tout est annulé" alors que les bus circulent normalement.
- **Carte Live** : Correction des bus invisibles ("Added trips").
  - Les bus ajoutés utilisaient des IDs d'arrêts incompatibles avec la carte.
  - Ajout d'une logique de fallback : mapping par séquence d'arrêt si l'ID est introuvable.
  - Les bus en temps réel s'affichent maintenant correctement sur le tracé.
- **Fuseau Horaire** : Force l'utilisation de l'heure de Paris ("Europe/Paris").
  - Garantit que les horaires affichés correspondent toujours à la date locale, quel que soit le pays/serveur d'hébergement.
  - Corrige les décalages potentiels en début/fin de journée.

## [3.0.0] - 2025-12-20

### 🚌 Migration Ligne E1

- **Restructuration T2C** : Migration complète de la Ligne 20 vers la Ligne E1.
  - Nouveau tracé : Gerzat Champfleuri ↔ Aubière Pl. des Ramacles / Romagnat
  - Couleur badge : Jaune (#fdc300) avec texte noir
  - Nouveaux IDs GTFS : route_id=3, stop_ids=GECHR/GECHA

### 🐛 Correctifs

- **Crash Mobile** : Correction de l'erreur `Illegal constructor` pour les notifications.
  - Utilisation de `ServiceWorkerRegistration.showNotification()` au lieu de `new Notification()`
- **Error Boundaries** : Ajout de pages d'erreur conviviales (`error.tsx`, `global-error.tsx`).

## [2.3.0] - 2025-12-19

### ✨ Interface Utilisateur

- **Mode Daltonien** : Nouveau bouton intégré dans la barre de contrôles.
  - Styleharmonisé avec le thème ambre/noir.
  - Meilleure visibilité et accessibilité.

### 🐛 Correctifs

- **Tri des Départs** : Correction critique de l'algorithme de tri.
  - Résolution du bug où les bus (temps réel) s'affichaient après les trains.
  - Fixe le problème de fusion des dates : les mises à jour temps réel ne sont plus appliquées à tort aux horaires du lendemain.

## [1.0.4] - 2025-12-16

### ✨ Fonctionnalités

- **Trains annulés** : Affichage des trains supprimés avec un statut "ANNULÉ" en rouge.
  - Comparaison des horaires théoriques (`base_schedule`) avec les horaires temps réel (`realtime`)
  - Les trains présents dans l'horaire théorique mais absents du temps réel sont marqués comme annulés
  - Détection fiable des suppressions de trains via l'API SNCF

## [1.0.3] - 2025-12-15

### 🐛 Correctifs

- **Horaires Bus T2C** : Mise à jour des données GTFS pour corriger les horaires de bus qui ne correspondaient pas au PDF officiel T2C.

### ⚙️ Infrastructure

- **Mise à jour automatique quotidienne** : Le workflow GitHub Actions met maintenant à jour les horaires de bus chaque nuit à 4h00 (au lieu d'une fois par semaine).
- Ajout d'une validation des données (vérifie que le schedule contient suffisamment d'arrêts).
- Amélioration des logs avec messages détaillés.

## [1.0.2] - 2025-12-15

### 🐛 Correctifs

- **API SNCF/Navitia** : Correction de l'URL d'appel API qui causait une erreur 400 Bad Request. Ajout du préfixe `/stop_areas/` manquant dans le chemin de requête.

### 📝 Documentation

- Ajout du lien vers la documentation Navitia dans les sources de données.

## [1.0.1] - 2025-12-05

### 🔒 Sécurité

- **Mise à jour critique** : Upgrade de Next.js (16.0.7) et React (19.2.1) pour corriger les vulnérabilités CVE-2025-55182 et CVE-2025-66478.

### 🐛 Correctifs

- **Bus T2C** : Correction de l'affichage des bus qui disparaissaient à cause d'horaires statiques périmés. Ajout d'un ajustement dynamique des dates pour garantir la continuité du service.

## [1.0.0] - 2025-12-02

### ✨ Fonctionnalités

#### Transport en Temps Réel

- **Bus T2C Ligne 20** : Suivi en temps réel avec données GTFS-RT
  - Séparation claire Départs/Arrivées
  - Indicateurs de retard visuels (badges de couleur)
  - Support des horaires théoriques en mode fallback
  
- **Trains TER** : Suivi via API SNCF
  - Affichage des trains vers Clermont-Ferrand
  - Affichage des trains vers Riom/Moulins
  - **Horaires détaillés** : Arrivée ET Départ pour chaque train
  - Numéro de train et statut en temps réel

## [Unreleased]

### ⚡ Performance & Optimisation

- **Service Worker** : Désactivation du cache pour les routes API (`/api/*`) afin de garantir des données temps-réel fraîches sur mobile.
- **Frontend** :
  - Déplacement de la normalisation de texte (`regex`) hors de la boucle de rendu.
  - Mémorisation du composant `DepartureRow` pour éviter les re-rendus inutiles.
  - Utilisation du timestamp serveur pour l'affichage "Dernière MAJ" (plus précis).
- **Backend** :
  - Optimisation de l'API Trains : Inversion de la logique de tri/filtrage (Filtrage O(N) avant Tri O(M log M)).
- **CSS** : Nettoyage du code mort et des définitions dupliquées (`globals.css`).

### 🐛 Corrections

- Correction du tri du tableau des arrivées (tri par date d'arrivée au lieu de départ).
- Ajustement des intervalles de rafraîchissement (30s) pour une meilleure réactivité.

#### Interface & UX

- **Design Glassmorphism** : Interface sombre moderne avec effets de transparence
- **Composants Modulaires** : Architecture propre avec composants réutilisables
- **Loading States** : Squelettes de chargement pour une expérience fluide
- **Auto-Refresh** : Mise à jour automatique toutes les 30s
- **Optimisations UX** :
  - Suppression des animations agressives (ping, pulse)
  - Hover effects adoucis (300ms, opacité réduite)
  - Pas de clignotement pendant le refresh

#### PWA & Performance

- **Progressive Web App** : Installable sur iOS/Android
- **Service Worker** : Fonctionne hors ligne
- **Chargement Parallèle** : Fetch simultané Bus + Train
- **Build Optimisé** : Configuration Webpack pour compatibilité PWA

### 🏗 Architecture Technique

#### Structure du Projet

```text
src/
├── app/
│   ├── page.tsx          # Page principale
│   ├── layout.tsx        # Layout global
│   └── globals.css       # Styles globaux
├── components/
│   ├── Header.tsx        # En-tête avec refresh
│   ├── BusSection.tsx    # Section bus
│   ├── TrainSection.tsx  # Section trains
│   └── StatusBadge.tsx   # Badge de statut
├── hooks/
│   └── useTransportData.ts  # Hook de gestion des données
└── types/
    └── transport.ts      # Types TypeScript
```

#### Stack Technique

- **Framework** : Next.js 16 (App Router)
- **Styling** : TailwindCSS v4
- **Language** : TypeScript
- **Icons** : Lucide React
- **PWA** : @ducanh2912/next-pwa

### 🐛 Correctifs

- Fix: Suppression du cercle vert clignotant sur les indicateurs temps réel
- Fix: Suppression des points pulsants sur les titres de section
- Fix: Adoucissement de l'effet hover (de 200ms à 300ms, opacité réduite)
- Fix: Suppression de la barre de progression qui causait des clignotements
- Fix: Configuration webpack pour build PWA

### 📝 Documentation

- README.md complet avec architecture et installation
- Instructions PWA pour iOS/Android
- Scripts de mise à jour des horaires théoriques
