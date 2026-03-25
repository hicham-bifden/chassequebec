# ChasseQuébec 🛒

> La plateforme québécoise pour comparer les circulaires et ne plus jamais payer trop cher votre épicerie.

![Version](https://img.shields.io/badge/version-0.1.0-orange)
![License](https://img.shields.io/badge/license-MIT-green)
![Status](https://img.shields.io/badge/status-Sprint%201%20%E2%80%94%20Landing%20Page-blue)
![Made in Quebec](https://img.shields.io/badge/Made%20in-Qu%C3%A9bec%20%F0%9F%8D%81-blue)

## Aperçu

ChasseQuébec agrège automatiquement les circulaires de **IGA, Metro, Maxi, Provigo, Super C** et 4 autres chaînes québécoises. L'app compare les prix au 100g entre magasins, intègre les programmes de fidélité locaux (Optimum, Scene+, Air Miles) et génère une liste d'achats optimisée sur plusieurs magasins.

**Économies estimées : ~2 400 $/an par famille québécoise.**

## Démonstration live

[chassequebec.github.io](https://TON-USERNAME.github.io/chassequebec) ← GitHub Pages Sprint 1

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | HTML5 sémantique, Tailwind CSS, CSS Animations |
| Interactivité | TypeScript (src) → JavaScript ES6 (prod) |
| Animations | GSAP 3 + ScrollTrigger, CSS @keyframes |
| Scraping | Python 3, BeautifulSoup, Celery *(Sprint 3)* |
| Backend | Node.js, Express, REST API *(Sprint 3)* |
| Base de données | PostgreSQL + MongoDB *(Sprint 3-4)* |
| API avancée | GraphQL *(Sprint 5)* |
| Mobile | Kotlin Android *(Sprint 6)* |
| DevOps | Docker, GitHub Actions CI/CD *(Sprint 7)* |

## Roadmap des sprints

- [x] **Sprint 1** — Landing page HTML/CSS/Tailwind/TS + GitHub Pages
- [ ] **Sprint 2** — Dashboard React + liste d'achats interactive
- [ ] **Sprint 3** — Scraper Python + API REST Node.js + PostgreSQL
- [ ] **Sprint 4** — Historique prix + MongoDB + algorithme anti-fausse-solde
- [ ] **Sprint 5** — GraphQL + optimiseur multi-magasins + points fidélité
- [ ] **Sprint 6** — App mobile Kotlin + alertes push mercredi
- [ ] **Sprint 7** — Docker, CI/CD, déploiement Railway, tests Jest

## Installation locale

```bash
git clone https://github.com/TON-USERNAME/chassequebec.git
cd chassequebec

# Ouvre directement dans le navigateur
open src/index.html

# Ou avec un serveur local
npx serve src
```

### Compiler le TypeScript (optionnel Sprint 1)

```bash
npm install -g typescript
tsc src/assets/js/main.ts --target ES2020 --outDir src/assets/js
```

## Structure du projet

```
chassequebec/
├── src/
│   ├── index.html              # Landing page principale
│   └── assets/
│       ├── css/
│       │   └── custom.css      # Animations CSS + styles custom
│       ├── js/
│       │   ├── main.ts         # Source TypeScript
│       │   └── main.js         # Compilé (utilisé en prod)
│       └── images/
├── docs/                       # GitHub Pages (copie de src/)
├── .gitignore
├── LICENSE
└── README.md
```

## Convention de commits

Ce projet suit [Conventional Commits](https://www.conventionalcommits.org/) :

```
feat: add hero section with Tailwind responsive layout
fix: correct mobile menu toggle animation
chore: update README with sprint 2 status
docs: add API documentation for /deals endpoint
```

## Contribuer

Pull requests bienvenues. Pour les changements majeurs, ouvrez d'abord une issue.

## Licence

MIT © 2025 — Fait au Québec
