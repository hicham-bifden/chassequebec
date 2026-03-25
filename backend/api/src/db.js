import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('[DB] Erreur pool PostgreSQL:', err);
});

export const query = (text, params) => pool.query(text, params);
export default pool;
