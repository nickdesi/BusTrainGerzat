---
description: Master workflow to help users find the right tool.
---

# Master Router Workflow

**Use this when**: You don't know which workflow to use or need help choosing the right tool for the job.

## 1. Diagnostics

**Agent**: Ask the user: "What is your primary goal right now?"

## 2. Routing

Based on the answer, start the corresponding workflow:

### 🧠 Planning & Design

| User Goal | Workflow to Run |
| :--- | :--- |
| "New feature", "Brainstorming", "Concept" | `brainstorming` |
| "Design UI", "Mockup visuals" | `frontend-design` |
| "Complex task", "Multiple sub-tasks" | `parallel-orchestrator` |

### 🛠️ Building & Creating

| User Goal | Workflow to Run |
| :--- | :--- |
| "Create web artifact", "React Component" | `web-artifacts-builder` |
| "Create MCP Server", "Backend integration" | `mcp-builder` |

### 🔧 Maintenance & Quality

| User Goal | Workflow to Run |
| :--- | :--- |
| "Refactor code", "Cleanup" | `code-refactor` |
| "Fix bug", "Debug error", "Root cause" | `debugging-workflow` |
| "Security check", "Audit vulnerabilities" | `security-audit` |
| "Performance check", "Speed test" | `performance-audit` |

### 🚀 Operations & Release

| User Goal | Workflow to Run |
| :--- | :--- |
| "Test app", "Quality Assurance" | `webapp-testing` |
| "Release app", "Bump version" | `release-manager` |
| "Verify setup", "Environment check" | `setup-check` |

## 3. Skills (Méthodologies & Patterns)

Avant d'exécuter un workflow, vérifier si un **skill** est pertinent :

| Contexte | Skill à consulter |
| :--- | :--- |
| Tâches complexes, nouvelles features, refactoring | `test-driven-development` |
| Bug, erreur, crash, comportement inattendu | `systematic-debugging` |
| **Avant TOUT commit, PR, ou message de fin** | `verification-before-completion` |
| États UI, chargements, erreurs, formulaires | `react-ui-patterns` |
| Performance, re-renders, useEffect, images | `react-best-practices` |
| Design UI, Identité visuelle, "Waaaah effect" | `frontend-design` |
| Design System, CSS, accessibilité, fonts | `ui-ux-pro-max` |
| Backend, Auth, Base de données, Sécurité | `firebase` |
| Nettoyage de code, réduction de dette technique | `code-refactor` |
| Publication de version, CI/CD, Changelog | `release-manager` |

> **Règle**: Toujours lire le `SKILL.md` correspondant avant de commencer le travail.

## 4. MCP (Outils Externes)

Utiliser les **MCP servers** pour accéder à des ressources externes :

| Besoin | MCP à utiliser |
| :--- | :--- |
| Documentation API/librairie, exemples de code | `context7` |
| Recherche web, actualités tech | MCP de recherche disponible |

> **Règle `context7`**: Toujours l'utiliser pour la documentation de librairies, génération de code, ou configuration sans que l'utilisateur ait à le demander explicitement.

## 5. Fallback

If the request doesn't fit a specific workflow, help the user using standard agent capabilities or guide them to `brainstorming` if they need to clear up their requirements.
