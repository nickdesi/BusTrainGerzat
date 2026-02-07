---
name: brainstorming
description: "À utiliser IMPÉRATIVEMENT avant tout travail créatif - création de fonctionnalités, composants, ou modification de comportement. Explore l'intention, les requis et le design avant l'implémentation."
---

# Transformer les Idées en Designs (Style Codelab)

## Aperçu

Ce workflow est conçu pour vous guider étape par étape, comme un Codelab, pour transformer des idées abstraites en spécifications techniques et designs concrets grâce à un dialogue collaboratif.

L'objectif est de structurer la pensée : d'abord comprendre (Cadrage), puis explorer (Divergence), choisir (Convergence), et enfin détailler (Conception).

---

## Étape 1 : Cadrage et Compréhension

**Objectif :** Définir précisément le problème et le contexte avant d'imaginer des solutions.

1. **Analyse du Contexte** : Examinez d'abord l'état actuel du projet (fichiers, docs, commits récents).
2. **Questionnement Itératif** :
    * **Règle d'Or : Une seule question par message.** Ne submergez pas l'utilisateur.
    * Privilégiez les questions à choix multiples (QCM) pour faciliter la réponse, mais les questions ouvertes sont acceptables si nécessaire.
    * Si un sujet est complexe, découpez-le en plusieurs questions séquentielles.
3. **Cible** : Clarifiez l'objectif, les contraintes et les critères de succès.

> **Astuce Gemini :** Si l'objectif est flou, reformulez ce que vous avez compris et demandez confirmation.

---

## Étape 2 : Divergence (Exploration)

**Objectif :** Générer plusieurs approches distinctes pour éviter la "fixation fonctionnelle".

1. **Proposer des Alternatives** : Présentez toujours **2 à 3 approches différentes** avec leurs compromis (avantages/inconvénients).
2. **Techniques d'Idéation** :
    * **Chemins Parallèles** : "Option A : Optimisée pour la rapidité de dev", "Option B : Optimisée pour la performance", "Option C : Approche minimaliste".
    * **Challengez les Hypothèses** : Demandez "Et si nous faisions l'inverse ?" ou "Est-ce vraiment nécessaire (YAGNI) ?".
3. **Recommandation** : Présentez les options de manière conversationnelle, mais indiquez clairement votre recommandation et pourquoi.

---

## Étape 3 : Convergence (Sélection)

**Objectif :** Choisir la meilleure solution et l'affiner.

1. **Sélection** : Validez l'approche retenue avec l'utilisateur.
2. **Déblocage** : Si la décision est difficile, utilisez des **Personas** :
    * *Point de vue Utilisateur* : "Cela simplifie-t-il leur vie ?"
    * *Point de vue Maintenance* : "Est-ce facile à maintenir dans 6 mois ?"
3. **Raffinement** : Ajustez l'option choisie en fonction des retours.

---

## Étape 4 : Conception Systématique

**Objectif :** Détailler la solution validée pour qu'elle soit prête à coder.

1. **Présentation Sequencée** : Ne présentez PAS tout le design d'un coup.
2. **La Règle des 300 mots** : Découpez le design en sections de 200 à 300 mots maximum.
3. **Validation Incrémentale** : À la fin de chaque section, demandez : *"Est-ce que cette partie vous semble correcte ?"*. Attendez la validation avant de passer à la suite.
4. **Contenu du Design** :
    * Architecture et Flux de données (Data Flow).
    * Nouveaux Composants / Modifications.
    * Gestion des Erreurs et Cas Limites.
    * Plan de Test.

---

## Étape 5 : Documentation et Finalisation

**Objectif :** Figer le design pour l'implémentation.

1. **Documentation** : Compilez le design validé dans un fichier Markdown : `docs/plans/YYYY-MM-DD-<sujet>-design.md`.
    * Utilisez le skill `elements-of-style:writing-clearly-and-concisely` si disponible.
2. **Commit** : Enregistrez ce document dans git.
3. **Transition** : Demandez *"Prêt pour la mise en place ?"*.
    * Utilisez `superpowers:using-git-worktrees` pour isoler le travail si nécessaire.
    * Utilisez `superpowers:writing-plans` pour créer le plan d'implémentation détaillé.

---

## Principes Clés (Résumé)

* **Une question à la fois** : La clarté avant la vitesse.
* **Incrémental** : Validez la conception section par section.
* **Alternatives** : Toujours proposer plusieurs choix.
* **YAGNI** : Supprimez impitoyablement ce qui n'est pas nécessaire.
* **Flexibilité** : Soyez prêt à revenir en arrière si le design ne "colle" pas.
