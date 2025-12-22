# Changelog

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
