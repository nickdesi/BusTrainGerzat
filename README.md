# T2C Real-time Tracker

Application Next.js pour suivre en temps réel la ligne 20 à l'arrêt Gerzat Champfleuri.

## Fonctionnalités

- **Temps réel** : Affiche les prochains passages avec les données GTFS-RT de T2C.
- **Mode Hybride** : Utilise les horaires théoriques (GTFS) si les données temps réel sont indisponibles.
- **Interface Moderne** : Design sombre, indicateurs de retard, et mise à jour automatique.

## Installation

1.  Installer les dépendances :
    ```bash
    npm install
    ```

2.  Lancer le serveur de développement :
    ```bash
    npm run dev
    ```

3.  Ouvrir [http://localhost:3000](http://localhost:3000) dans votre navigateur.

## Mise à jour des horaires théoriques

Les fichiers `src/app/api/realtime/static_schedule.json` (bus T2C) et `static_train_schedule.json` (trains SNCF) contiennent les horaires théoriques pour la semaine.
Pour les régénérer (nécessite Python 3) :

```bash
python3 generate_schedules.py
```
