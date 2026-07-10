# Security Policy

## 📦 Supported Versions

This project is a web application maintained on a rolling basis. Security fixes
are applied to the `main` branch and shipped with the next release.

| Version | Supported          |
| ------- | ------------------ |
| `3.7.x` | :white_check_mark: |
| `main`  | :white_check_mark: |
| `< 3.7` | :x:                |

## 🛡️ What This Project Touches

**Gerzat Live** is a Next.js web application and PWA. It:

- Fetches **public transit data** : T2C GTFS-RT (Trip Updates) and static GTFS, and SNCF / Navitia API for TER trains.
- Runs server-side API routes (`/api/*`) on a Node.js / Next.js host (typically Coolify / Nixpacks).
- Reads a single configuration secret, `SNCF_API_KEY`, from the environment.
- Does **not** collect or store end-user personal data — it only displays public transit schedules.

## 🔐 Reporting a Vulnerability

If you discover a security vulnerability, **please do not open a public issue.**

Instead, report it privately:

1. Go to **Security → Report a vulnerability** on the repository
   (<https://github.com/nickdesi/BusTrainGerzat/security/advisories/new>), or
2. Contact the maintainer directly via a GitHub Security Advisory.

You can expect an acknowledgement within a few days. Once confirmed, a patched
release will be published and you will be credited (unless you prefer to remain
anonymous).

## ✅ Safe-Usage Best Practices

- Keep `SNCF_API_KEY` in the deployment environment / `.env.local` — never commit it.
- Respect SNCF / Navitia and T2C rate limits; cache responses and avoid abusive polling.
- Keep dependencies up to date and rely on the CI quality gate (lint, tests, build).
- When self-hosting, keep the Next.js runtime and the underlying OS patched.
