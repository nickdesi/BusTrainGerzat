# Gerzat Live - Hub Multimodal

Application Next.js ultra-moderne pour suivre en temps réel les bus T2C et les trains TER au Hub Multimodal de Gerzat.

![Gerzat Live Banner](public/manifest-icon-512.png)

## 🚀 Fonctionnalités

### 🚌 Bus T2C (Ligne 20)
- **Temps réel & Théorique** : Affichage précis des prochains passages avec distinction claire par badges de couleur.
- **Indicateurs de Retard** : Visualisation immédiate de l'état du trafic (À l'heure, En avance, Retard).
- **Directions Claires** : Séparation distincte entre les départs (Vers Clermont/Aéroport) et les arrivées (Terminus Gerzat).

### 🚆 Trains TER (Gare de Gerzat)
- **Suivi en Direct** : Horaires des trains en temps réel via l'API SNCF.
- **Double Sens** : Affichage séparé des trains vers Clermont-Ferrand et vers Riom/Moulins.
- **Horaires Détaillés** : Affichage de l'heure d'arrivée ET de départ pour chaque train à Gerzat.
- **Détails du Train** : Numéro de train et statut du retard en temps réel.

### ✨ Expérience Utilisateur (UX/UI)
- **Design Glassmorphism** : Interface sombre élégante avec effets de flou et de transparence.
- **Animations Optimisées** : Transitions douces et squelettes de chargement sans animations agressives.
- **Progressive Web App (PWA)** : Installable sur mobile comme une application native, fonctionne hors ligne.
- **Auto-Refresh** : Mise à jour automatique des données toutes les 30 secondes sans clignotement.

## 🛠 Architecture Technique

Le projet a été refactorisé pour une meilleure maintenabilité et performance :

- **Framework** : Next.js 16 (App Router).
- **Styling** : TailwindCSS v4 avec variables CSS natives.
- **Structure Modulaire** :
  - `src/components` : Composants UI réutilisables (`BusSection`, `TrainSection`, `Header`, etc.).
  - `src/hooks` : Logique métier extraite (ex: `useTransportData` pour le fetching parallèle).
  - `src/types` : Définitions TypeScript strictes.
- **Performance** : Chargement parallèle des données Bus et Train pour une réactivité maximale.

## 📦 Installation

1.  **Installer les dépendances** :
    ```bash
    npm install
    ```

2.  **Lancer le serveur de développement** :
    ```bash
    npm run dev
    ```

3.  **Accéder à l'application** :
    Ouvrir [http://localhost:3000](http://localhost:3000) dans votre navigateur.

## 🔧 Scripts Utiles

- **Build** : `npm run build` (Utilise Webpack pour la compatibilité PWA).
- **Mise à jour Bus (Théorique)** :
  ```bash
  python3 generate_static_json.py
  ```
- **Mise à jour Train (Théorique)** :
  ```bash
  python3 generate_train_static.py
  ```

## 📱 PWA

L'application est configurée pour être installée sur iOS et Android.
- **iOS** : Ouvrir dans Safari -> "Sur l'écran d'accueil".
- **Android** : Ouvrir dans Chrome -> "Installer l'application".
