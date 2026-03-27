// ============================================================
// routes/deals.js — Toutes les routes liées aux deals/circulaires
//
// Ce fichier définit 4 endpoints:
//   GET /api/deals           → liste des deals avec filtres
//   GET /api/deals/compare   → comparaison du même produit entre magasins
//   GET /api/deals/stats     → statistiques globales
//   GET /api/deals/stores    → magasins avec nombre de deals
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
        d.valid_until, d.image_emoji, d.image_url, d.product_url, d.loyalty_points,
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
// GET /api/deals/compare?q=poulet
// Compare le même produit (par mot-clé) dans tous les magasins.
//
// Pour chaque magasin qui a un produit correspondant, on retourne:
//   - le meilleur match (prix le plus bas)
//   - tous les autres matches trouvés
//
// Exemple: GET /api/deals/compare?q=lait
// → IGA: Lait Natrel 2L à 3.99$  ← le moins cher
//   Metro: Lait Natrel 4L à 5.99$
//   Maxi: Lait Natrel 2L à 4.29$
// ----------------------------------------------------------
router.get('/compare', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Paramètre q requis (min 2 caractères)' });
    }

    const search = `%${q.toLowerCase()}%`;

    // Cherche tous les deals qui contiennent le mot-clé dans n'importe quel magasin
    // ON PREND LES 3 MEILLEURS PAR MAGASIN (PARTITION BY store_id)
    const result = await query(`
      WITH ranked AS (
        SELECT
          d.id, d.name, d.brand, d.store_id,
          d.regular_price, d.sale_price, d.unit,
          d.valid_until, d.image_emoji, d.image_url, d.product_url,
          s.name      AS store_name,
          s.color     AS store_color,
          s.text_color,
          c.id        AS category_id,
          c.label     AS category_label,
          c.emoji,
          ROUND(((d.regular_price - d.sale_price) / d.regular_price * 100)::numeric, 0) AS saving_pct,
          (d.regular_price - d.sale_price) AS saving_amount,
          -- ROW_NUMBER numérote les deals par magasin, du moins cher au plus cher
          ROW_NUMBER() OVER (PARTITION BY d.store_id ORDER BY d.sale_price ASC) AS rank
        FROM deals d
        JOIN stores s ON d.store_id = s.id
        JOIN categories c ON d.category_id = c.id
        WHERE d.is_active = TRUE
          AND LOWER(d.name) LIKE $1
      )
      SELECT * FROM ranked
      WHERE rank <= 3
      ORDER BY store_id, rank
    `, [search]);

    if (result.rows.length === 0) {
      return res.json({ success: true, query: q, stores: [] });
    }

    // Regroupe les résultats par magasin
    // Ex: { superc: { store_name: "Super C", best: {...}, others: [...] } }
    const byStore = {};
    for (const row of result.rows) {
      if (!byStore[row.store_id]) {
        byStore[row.store_id] = {
          store_id:   row.store_id,
          store_name: row.store_name,
          color:      row.store_color,
          text_color: row.text_color,
          best:       null,   // deal le moins cher pour ce magasin
          others:     [],     // autres deals trouvés dans ce magasin
        };
      }
      const entry = byStore[row.store_id];
      if (Number(row.rank) === 1) {
        entry.best = row;     // rank=1 = le moins cher du magasin
      } else {
        entry.others.push(row);
      }
    }

    // Trie les magasins par prix croissant (le moins cher en premier)
    // On filtre les magasins sans best (ne devrait pas arriver, mais sécurité)
    const stores = Object.values(byStore)
      .filter(s => s.best !== null)
      .sort((a, b) => Number(a.best.sale_price) - Number(b.best.sale_price));

    res.json({ success: true, query: q, stores });
  } catch (err) {
    console.error('[API] /deals/compare error:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// ----------------------------------------------------------
// GET /api/deals/history?name=poulet&store=iga
// Retourne l'historique de prix d'un produit pour un magasin donné.
// Les entrées sont groupées par jour pour éviter les doublons intra-journée.
//
// Exemple: GET /api/deals/history?name=Lait%202%25&store=iga
// → [{ date: "2026-03-20", price: 3.99 }, { date: "2026-03-27", price: 4.29 }, ...]
// ----------------------------------------------------------
router.get('/history', async (req, res) => {
  try {
    const { name, store } = req.query;
    if (!name || !store) {
      return res.status(400).json({ success: false, error: 'Paramètres name et store requis' });
    }

    const result = await query(`
      SELECT
        DATE(recorded_at) AS date,
        MIN(price) AS price
      FROM price_history
      WHERE LOWER(deal_name) LIKE $1
        AND store_id = $2
      GROUP BY DATE(recorded_at)
      ORDER BY DATE(recorded_at) ASC
      LIMIT 52
    `, [`%${name.toLowerCase()}%`, store]);

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[API] /deals/history error:', err);
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
