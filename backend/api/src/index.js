import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dealsRouter from './routes/deals.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'ChasseQuébec API' });
});

app.use('/api/deals', dealsRouter);

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.path} introuvable` });
});

app.listen(PORT, () => {
  console.log(`\n🚀 ChasseQuébec API démarrée sur http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   Deals:  http://localhost:${PORT}/api/deals\n`);
});
