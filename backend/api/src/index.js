// ============================================================
// index.js — Point d'entrée principal de l'API ChasseQuébec
//
// Ce fichier crée le serveur Express et branche toutes les
// routes. Quand tu lances "npm run dev", c'est ce fichier
// qui démarre en premier.
// ============================================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dealsRouter from './routes/deals.js';
import chatRouter  from './routes/chat.js';

// Charge les variables du fichier .env (DATABASE_URL, PORT, etc.)
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS — autorise le frontend React (localhost:5173) à appeler l'API
// Sans ça, le navigateur bloquerait les requêtes par sécurité
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));

// Permet à Express de lire les corps JSON des requêtes POST/PUT
app.use(express.json());

// Route de santé — utile pour vérifier que l'API tourne
// Essaie: http://localhost:3001/api/health dans ton navigateur
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'ChasseQuébec API' });
});

// Monte toutes les routes /api/deals/* sur le router dédié
// Ex: GET /api/deals → deals.js gère la requête
app.use('/api/deals', dealsRouter);
app.use('/api/chat',  chatRouter);

// Attrape toutes les routes inconnues et retourne une erreur 404
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.path} introuvable` });
});

// Démarre le serveur sur le port défini (défaut: 3001)
app.listen(PORT, () => {
  console.log(`\n🚀 ChasseQuébec API démarrée sur http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   Deals:  http://localhost:${PORT}/api/deals\n`);
});
