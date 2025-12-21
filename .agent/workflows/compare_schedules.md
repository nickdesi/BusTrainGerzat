---
description: Vérifier la cohérence des horaires de bus avec la liste officielle
---

# Processus de Double Vérification des Horaires

Ce workflow permet de comparer les horaires actuellement chargés dans l'application (`static_schedule.json`) avec une liste officielle fournie sous forme de texte (copié-collé d'un PDF T2C).

## Prérequis

1. Avoir le fichier texte des horaires officiels (ex: `user_schedule.txt`).
2. Le fichier doit contenir les sections "DU LUNDI AU VENDREDI", "LE SAMEDI", "LE DIMANCHE".

## Étapes

1. **Placer le fichier texte** à la racine du projet ou dans un dossier accessible.
2. **Exécuter le script de vérification** :

```bash
python3 scripts/verify_schedule.py user_schedule.txt
```

**Analyser le rapport** :

- ✅ : L'horaire est bien présent dans l'application.
- ❌ : L'horaire est MANQUANT dans l'application.

## Mise à jour des horaires (si erreur)

Si des horaires sont manquants, il faut soit :

- Relancer la génération GTFS si les données sources ont été mises à jour.
- Utiliser un script de patch (`update_schedule.py`) pour injecter les horaires manquants.

## Exemple de sortie

```text
📅 Verification for 20251222 (MF)
  ➡️ Direction 0 (Gerzat -> Aubiere):
    ❌ MISSING: 05:53 (AUBIÈRE Pl. des Ramacles)
  ✅ All other trips verified.
```
