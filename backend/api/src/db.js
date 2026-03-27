// ============================================================
// db.js — Connexion à la base de données PostgreSQL
//
// On utilise un "pool" de connexions : au lieu d'ouvrir et
// fermer une connexion à chaque requête SQL (lent), le pool
// garde plusieurs connexions ouvertes et les réutilise.
// ============================================================

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Crée le pool en lisant DATABASE_URL depuis le fichier .env
// Format: postgresql://utilisateur:motdepasse@hote:port/nomdb
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Si la connexion DB tombe, on log l'erreur sans crasher le serveur
pool.on('error', (err) => {
  console.error('[DB] Erreur pool PostgreSQL:', err);
});

// Fonction utilitaire pour exécuter une requête SQL
// Exemple: await query('SELECT * FROM deals WHERE id = $1', [id])
// Le $1 est un paramètre sécurisé (évite les injections SQL)
export const query = (text, params) => pool.query(text, params);

export default pool;
