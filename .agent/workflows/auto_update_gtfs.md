---
description: Automatisation de la mise à jour des données GTFS
---

# Mise à jour Automatique des GTFS

Ce workflow permet de vérifier si les données officielles sur `transport.data.gouv.fr` contiennent les nouveaux horaires (notamment la fiche du 20 décembre 2025).

## Le Problème

Les données officielles (GTFS) sont souvent mises à jour avec un délai par rapport aux fiches PDF distribuées. Actuellement, notre application utilise des données corrigées manuellement pour inclure les bus manquants.

## La Solution

Le script `scripts/check_gtfs_update.py` :

1. Télécharge le dernier GTFS officiel.
2. Cherche un trajet "sentinelle" connu (ex: Départ 05h53 de Gerzat Champfleuri).
3. **SI** le trajet existe : Il remplace nos données locales et vous invite à régénérer le JSON.
4. **SINON** : Il ne fait rien et signale que les données sont encore anciennes.

## Utilisation

Via npm (si configuré) ou directement :

```bash
python3 scripts/check_gtfs_update.py
```

### Résultat attendu (Données pas à jour)

```text
⚠️ New GTFS does NOT contain the 05:53 departure. It is likely still old.
(Exit Code 1)
```

### Résultat attendu (Données à jour)

```text
✅ New GTFS contains the 05:53 departure! It seems Up-To-Date.
🔄 Updating local GTFS data...
✅ GTFS Data updated. Please regenerate static JSON.
```

Si la mise à jour est effectuée, lancez ensuite :

```bash
python3 generate_static_json.py
```
