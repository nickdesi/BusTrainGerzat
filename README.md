# 🚉 Gerzat Live - Hub Multimodal

Application Next.js pour suivre en temps réel les bus T2C et les trains TER à Gerzat.

[![demo online](https://img.shields.io/badge/demo-online-brightgreen)](https://gertzatlive.desimone.fr)
[![Deploy with Coolify](https://img.shields.io/badge/Deploy%20with-Coolify-blueviolet?logo=rocket)](https://coolify.io/)

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

- **Framework** : Next.js 16 (App Router)
- **Styling** : TailwindCSS v4

### 📡 Sources de données

| Transport | API | Source |
|-----------|-----|--------|
| **Train TER** | API SNCF officielle | [api.sncf.com](https://api.sncf.com) (clé requise) |
| **Bus T2C** | GTFS-RT temps réel | [transport.data.gouv.fr](https://proxy.transport.data.gouv.fr/resource/t2c-clermont-gtfs-rt-trip-update) |
| **Bus T2C** | GTFS statique | [opendata.clermontmetropole.eu](https://opendata.clermontmetropole.eu/api/v2/catalog/datasets/gtfs-smtc/alternative_exports/gtfs) |

## 📦 Installation

1. **Installer les dépendances** :

    ```bash
    npm install
    ```

2. **Configurer les variables d'environnement** :

    ```bash
    # Créer le fichier .env.local
    echo "SNCF_API_KEY=votre_clé_api_sncf" > .env.local
    ```

    > Obtenez votre clé sur [digital.sncf.com](https://www.digital.sncf.com/startup/api)

3. **Lancer le serveur de développement** :

    ```bash
    npm run dev
    ```

3. **Accéder à l'application** :
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

## 📱 Installer l'Application sur Mobile

L'application peut être installée comme une app native sur votre téléphone !

### 🍎 iPhone / iPad

1. Ouvrez **Safari** et allez sur [gertzatlive.desimone.fr](https://gertzatlive.desimone.fr)
2. Appuyez sur l'icône **Partager** (carré avec flèche vers le haut)
3. Faites défiler et appuyez sur **« Sur l'écran d'accueil »**
4. Nommez l'app (ex: "Gerzat Live") et appuyez sur **Ajouter**

### 🤖 Android

1. Ouvrez **Chrome** et allez sur [gertzatlive.desimone.fr](https://gertzatlive.desimone.fr)
2. Appuyez sur les **3 points** en haut à droite
3. Appuyez sur **« Installer l'application »** ou **« Ajouter à l'écran d'accueil »**
4. Confirmez l'installation

Une fois installée, l'application apparaît sur votre écran d'accueil avec sa propre icône et fonctionne comme une app native !
