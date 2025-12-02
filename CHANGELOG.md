# Changelog

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
```
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
