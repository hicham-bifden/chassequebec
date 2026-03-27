// ============================================================
// routes/deals.js — Toutes les routes liées aux deals/circulaires
//
// Ce fichier définit 3 endpoints:
//   GET /api/deals         → liste des deals avec filtres
//   GET /api/deals/stats   → statistiques globales
//   GET /api/deals/stores  → magasins avec nombre de deals
// ============================================================

import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// ----------------------------------------------------------
// GET /api/deals
// Retourne tous les deals actifs avec filtres optionnels.
//
// Paramètres URL acceptés:
//   ?store=superc        → filtre par magasin
//   ?category=viande     → filtre par catégorie
//   ?sort=pct            → tri (savings, price, pct, name)
//   ?search=poulet       → recherche dans le nom/marque
//   ?limit=50            → nombre max de résultats (défaut 100)
//
// Exemple: GET /api/deals?store=superc&sort=pct
// ----------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const { store, category, sort = 'savings', search, limit = 100 } = req.query;

    // Requête SQL de base — on joint 3 tables:
    //   deals     → les produits en rabais
    //   stores    → infos du magasin (nom, couleur)
    //   categories → infos de la catégorie (label, emoji)
    let sql = `
      SELECT
        d.id, d.name, d.brand, d.store_id,
        d.regular_price, d.sale_price, d.unit,
        d.valid_until, d.image_emoji, d.loyalty_points,
        s.name as store_name, s.color, s.text_color,
        c.id as category_id, c.label as category_label, c.emoji,
        ROUND(((d.regular_price - d.sale_price) / d.regular_price * 100)::numeric, 0) as saving_pct,
        (d.regular_price - d.sale_price) as saving_amount
      FROM deals d
      JOIN stores s ON d.store_id = s.id
      JOIN categories c ON d.category_id = c.id
      WHERE d.is_active = TRUE
    `;

    // Tableau des valeurs des paramètres SQL (évite les injections)
    const params = [];
    let paramCount = 1; // compteur pour $1, $2, $3...

    // Ajoute les filtres dynamiquement si fournis dans l'URL
    if (store && store !== 'all') {
      sql += ` AND d.store_id = $${paramCount++}`;
      params.push(store);
    }
    if (category && category !== 'all') {
      sql += ` AND d.category_id = $${paramCount++}`;
      params.push(category);
    }
    if (search) {
      // LOWER() pour une recherche insensible à la casse
      sql += ` AND (LOWER(d.name) LIKE $${paramCount} OR LOWER(d.brand) LIKE $${paramCount})`;
      params.push(`%${search.toLowerCase()}%`);
      paramCount++;
    }

    // Tri selon le paramètre ?sort=
    const orderMap = {
      savings: 'saving_amount DESC',  // meilleure économie en $
      price:   'd.sale_price ASC',    // prix le plus bas
      pct:     'saving_pct DESC',     // meilleur % de rabais
      name:    'd.name ASC',          // alphabétique
    };
    sql += ` ORDER BY ${orderMap[sort] || orderMap.savings}`;

    // Limite le nombre de résultats pour ne pas surcharger
    sql += ` LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    const result = await query(sql, params);

    // Réponse JSON avec le tableau de deals
    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (err) {
    console.error('[API] /deals error:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// ----------------------------------------------------------
// GET /api/deals/stats
// Retourne des chiffres globaux pour le tableau de bord.
//
// Exemple de réponse:
//   { total_deals: 42, total_stores: 5, avg_saving_pct: 28.3 }
// ----------------------------------------------------------
router.get('/stats', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        COUNT(*) as total_deals,
        COUNT(DISTINCT store_id) as total_stores,
        ROUND(AVG((regular_price - sale_price) / regular_price * 100)::numeric, 1) as avg_saving_pct,
        MAX(regular_price - sale_price) as max_saving
      FROM deals WHERE is_active = TRUE
    `);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// ----------------------------------------------------------
// GET /api/deals/stores
// Retourne la liste des magasins avec leur nombre de deals.
// Utilisé pour le menu déroulant de filtres.
//
// Exemple de réponse:
//   [{ id: "superc", name: "Super C", deal_count: 10 }, ...]
// ----------------------------------------------------------
router.get('/stores', async (req, res) => {
  try {
    const result = await query(`
      SELECT s.id, s.name, s.color, s.text_color,
             COUNT(d.id) as deal_count
      FROM stores s
      -- LEFT JOIN inclut les magasins même sans deals actifs
      LEFT JOIN deals d ON s.id = d.store_id AND d.is_active = TRUE
      GROUP BY s.id, s.name, s.color, s.text_color
      ORDER BY deal_count DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

export default router;
