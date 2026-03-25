# ChasseQuébec Backend — Sprint 3

## Prérequis
- PostgreSQL 15+ installé et démarré
- Python 3.11+
- Node.js 18+

## Setup PostgreSQL
```bash
createdb chassequebec
psql chassequebec < database/schema.sql
```

## Démarrer le scraper Python
```bash
cd scraper
pip install -r requirements.txt
cp .env.example .env  # édite DATABASE_URL
python main.py --once  # scrape une fois immédiatement
```

## Démarrer l'API Node.js
```bash
cd api
npm install
cp .env.example .env  # édite DATABASE_URL
npm run dev  # démarre sur localhost:3001
```

## Tester l'API
```bash
curl http://localhost:3001/api/health
curl http://localhost:3001/api/deals
curl "http://localhost:3001/api/deals?store=iga&sort=savings"
```
