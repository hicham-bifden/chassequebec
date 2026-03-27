// ============================================================
// routes/chat.js — Assistant IA ChasseQuébec (Groq, gratuit)
//
// POST /api/chat  { messages: [{role, content}], deals: [...] }
// → répond avec un message de l'assistant basé sur les deals actuels
//
// Clé gratuite sur : https://console.groq.com
// Modèle : llama-3.3-70b-versatile (rapide, gratuit, très bon)
// ============================================================

import { Router } from 'express';
import Groq from 'groq-sdk';
import { query } from '../db.js';

const router = Router();

// Construit le contexte deals à envoyer à l'IA (top 60 deals triés par économies)
async function getDealsContext() {
  try {
    const result = await query(`
      SELECT
        d.name, s.name AS store, c.label AS category,
        d.sale_price, d.regular_price, d.unit,
        ROUND(((d.regular_price - d.sale_price) / d.regular_price * 100)::numeric, 0) AS saving_pct
      FROM deals d
      JOIN stores s ON d.store_id = s.id
      JOIN categories c ON d.category_id = c.id
      WHERE d.is_active = TRUE
      ORDER BY (d.regular_price - d.sale_price) DESC
      LIMIT 80
    `);

    return result.rows.map(r =>
      `${r.name} (${r.store}) — ${r.sale_price}$ [−${r.saving_pct}%] ${r.unit ? `· ${r.unit}` : ''}`
    ).join('\n');
  } catch {
    return 'Données non disponibles.';
  }
}

const SYSTEM_PROMPT = (dealsContext) => `Tu es l'assistant épicerie de ChasseQuébec, une app québécoise qui agrège les circulaires IGA, Maxi, Metro, Super C et Costco.

Tu parles en français québécois, de façon concise et utile.
Tu aides les utilisateurs à économiser sur leur épicerie.

Voici les meilleures offres de la semaine en cours :
${dealsContext}

Règles :
- Réponds uniquement en français
- Sois concis (max 200 mots sauf si on te demande une liste)
- Si on demande un plan de repas ou une liste, utilise les deals ci-dessus
- Si on demande le prix d'un produit, cherche dans les deals fournis
- Si un produit n'est pas en promo, dis-le honnêtement
- Ne fabrique pas de prix ou de deals qui ne sont pas dans la liste`;

// ----------------------------------------------------------
// POST /api/chat
// Body: { messages: [{role: 'user'|'assistant', content: string}] }
// ----------------------------------------------------------
router.post('/', async (req, res) => {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(503).json({
      success: false,
      error: 'GROQ_API_KEY manquante. Ajoute-la dans backend/api/.env\nClé gratuite sur https://console.groq.com',
    });
  }

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ success: false, error: 'messages requis' });
  }

  try {
    const groq = new Groq({ apiKey });
    const dealsContext = await getDealsContext();

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT(dealsContext) },
        ...messages.slice(-10), // Max 10 messages d'historique
      ],
      max_tokens: 400,
      temperature: 0.5,
    });

    const reply = completion.choices[0]?.message?.content ?? 'Désolé, je n\'ai pas pu répondre.';
    res.json({ success: true, reply });

  } catch (err) {
    console.error('[API] /chat error:', err?.message);
    const msg = err?.status === 401
      ? 'Clé Groq invalide. Vérifie GROQ_API_KEY dans .env'
      : 'Erreur de l\'assistant IA.';
    res.status(500).json({ success: false, error: msg });
  }
});

export default router;
