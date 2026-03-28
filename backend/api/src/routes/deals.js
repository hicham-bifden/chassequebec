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
import { parseUnitPrice, calcPromoStatus } from '../utils/unitPrice.js';

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
    const { store, category, sort = 'savings', search, limit = 200 } = req.query;

    // Requête SQL avec historique de prix pour détection fausses promos
    let sql = `
      SELECT
        d.id, d.name, d.brand, d.store_id,
        d.regular_price, d.sale_price, d.unit,
        d.valid_until, d.image_emoji, d.image_url, d.product_url, d.loyalty_points,
        s.name as store_name, s.color, s.text_color,
        c.id as category_id, c.label as category_label, c.emoji,
        ROUND(((d.regular_price - d.sale_price) / d.regular_price * 100)::numeric, 0) as saving_pct,
        (d.regular_price - d.sale_price) as saving_amount,
        ph.avg_price    as hist_avg,
        ph.max_price    as hist_max,
        ph.data_points  as hist_points
      FROM deals d
      JOIN stores s ON d.store_id = s.id
      JOIN categories c ON d.category_id = c.id
      -- Historique des 4 dernières semaines pour détecter les fausses promos
      LEFT JOIN (
        SELECT deal_name, store_id,
               ROUND(AVG(price)::numeric, 2)   AS avg_price,
               ROUND(MAX(price)::numeric, 2)   AS max_price,
               COUNT(DISTINCT DATE(recorded_at)) AS data_points
        FROM price_history
        WHERE recorded_at >= NOW() - INTERVAL '28 days'
        GROUP BY deal_name, store_id
      ) ph ON LOWER(d.name) = LOWER(ph.deal_name) AND d.store_id = ph.store_id
      WHERE d.is_active = TRUE
    `;

    const params = [];
    let paramCount = 1;

    if (store && store !== 'all') {
      sql += ` AND d.store_id = $${paramCount++}`;
      params.push(store);
    }
    if (category && category !== 'all') {
      sql += ` AND d.category_id = $${paramCount++}`;
      params.push(category);
    }
    if (search) {
      sql += ` AND (LOWER(d.name) LIKE $${paramCount} OR LOWER(d.brand) LIKE $${paramCount})`;
      params.push(`%${search.toLowerCase()}%`);
      paramCount++;
    }

    const orderMap = {
      savings: 'saving_amount DESC',
      price:   'd.sale_price ASC',
      pct:     'saving_pct DESC',
      name:    'd.name ASC',
    };
    sql += ` ORDER BY ${orderMap[sort] || orderMap.savings}`;
    sql += ` LIMIT $${paramCount}`;
    params.push(Math.min(parseInt(limit) || 200, 1000));

    const result = await query(sql, params);

    // Enrichir chaque deal avec le prix unitaire et le statut promo
    const data = result.rows.map(row => {
      const up = parseUnitPrice(row.sale_price, row.unit, row.name, row.category_id);
      const promoStatus = calcPromoStatus(
        row.sale_price,
        row.hist_avg,
        row.hist_max,
        row.hist_points
      );
      // Change 7: generate Super C search link if product_url is empty
      let productUrl = row.product_url;
      if (row.store_id === 'superc' && !productUrl) {
        productUrl = 'https://www.superc.ca/recherche?query=' + encodeURIComponent(row.name);
      }
      return {
        ...row,
        product_url:  productUrl,
        unit_price:   up?.unitPrice  ?? null,
        unit_label:   up?.unitLabel  ?? null,
        unit_type:    up?.type       ?? null,
        promo_status: promoStatus,
        hist_avg:     row.hist_avg   ?? null,
      };
    });

    res.json({ success: true, count: data.length, data });
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
// Exclusions pour la comparaison: évite les faux positifs par produit
const COMPARE_EXCLUSIONS = {
  'lait':    ["lait de coco", "lait d'amande", "lait de soja", "lait d'avoine", "boisson végétale"],
  'banane':  ['pain', 'mélange pour', 'recette'],
  'beurre':  ["beurre d'arachide", 'beurre de pomme', 'beurre de noix'],
  'thon':    ['salade', 'thonidé'],
  'poulet':  ['saveur poulet', 'arôme poulet'],
};

router.get('/compare', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Paramètre q requis (min 2 caractères)' });
    }

    const searchTerm = q.toLowerCase().trim();

    // Build exclusion conditions
    const exclusions = COMPARE_EXCLUSIONS[searchTerm] || [];
    let exclusionSQL = '';
    const params = [searchTerm];
    let paramCount = 2;
    for (const excl of exclusions) {
      exclusionSQL += ` AND LOWER(d.name) NOT LIKE $${paramCount}`;
      params.push(`%${excl.toLowerCase()}%`);
      paramCount++;
    }

    // Cherche tous les deals qui contiennent le mot-clé dans n'importe quel magasin
    // Utilise un regex avec word-boundary pour éviter les faux positifs
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
          AND LOWER(d.name) ~ ('(^|[\\s,\\-])' || $1 || '([\\s,\\-]|$|s )')
          ${exclusionSQL}
      )
      SELECT * FROM ranked
      WHERE rank <= 3
      ORDER BY store_id, rank
    `, params);

    if (result.rows.length === 0) {
      return res.json({ success: true, query: q, stores: [] });
    }

    // Ajoute le prix unitaire à chaque row
    const enriched = result.rows.map(row => {
      const up = parseUnitPrice(row.sale_price, row.unit, row.name, row.category_id);
      // Generate Super C search link if needed
      let productUrl = row.product_url;
      if (row.store_id === 'superc' && !productUrl) {
        productUrl = 'https://www.superc.ca/recherche?query=' + encodeURIComponent(row.name);
      }
      return { ...row, product_url: productUrl, unit_price: up?.unitPrice ?? null, unit_label: up?.unitLabel ?? null };
    });

    const byStore = {};
    for (const row of enriched) {
      if (!byStore[row.store_id]) {
        byStore[row.store_id] = {
          store_id:   row.store_id,
          store_name: row.store_name,
          color:      row.store_color,
          text_color: row.text_color,
          best:       null,
          others:     [],
        };
      }
      const entry = byStore[row.store_id];
      if (Number(row.rank) === 1) {
        entry.best = row;
      } else {
        entry.others.push(row);
      }
    }

    // Trie les magasins par prix croissant (le moins cher en premier)
    // Si la majorité des résultats ont un prix unitaire, trier par unit_price ASC
    const storeList = Object.values(byStore).filter(s => s.best !== null);
    const withUnitPrice = storeList.filter(s => s.best.unit_price !== null).length;
    const useUnitPriceSort = withUnitPrice > storeList.length / 2;

    const stores = storeList.sort((a, b) => {
      if (useUnitPriceSort) {
        const ua = Number(a.best.unit_price);
        const ub = Number(b.best.unit_price);
        if (ua && ub) return ua - ub;
      }
      return Number(a.best.sale_price) - Number(b.best.sale_price);
    });

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

// ----------------------------------------------------------
// GET /api/deals/liquidation
// Retourne les deals scorés 0-100 pour la page Liquidations.
//
// Score = composante prix (50pts) + mots-clés (30pts) + stock limité (20pts)
// Minimum pour apparaître : 20 pts. Trié par score DESC.
//
// Tiers:
//   🔴 Rouge  80-100 : vraie liquidation (prix + mot-clé + stock)
//   🟠 Orange 50-79  : bon deal avec historique ou mot-clé
//   🟢 Verte  20-49  : réduction standard ≥ 30% sur le prix régulier
// ----------------------------------------------------------
router.get('/liquidation', async (req, res) => {
  try {
    const result = await query(`
      WITH scored AS (
        SELECT
          d.id, d.name, d.brand, d.store_id,
          d.regular_price, d.sale_price, d.unit,
          d.valid_until, d.image_emoji, d.image_url, d.product_url,
          s.name        AS store_name,
          s.color, s.text_color,
          c.id          AS category_id,
          c.label       AS category_label,
          c.emoji,
          ROUND(((d.regular_price - d.sale_price) / d.regular_price * 100)::numeric, 0) AS saving_pct,
          (d.regular_price - d.sale_price) AS saving_amount,
          ph.avg_price   AS hist_avg,
          ph.data_points AS hist_points,

          -- Composante prix (50 pts max)
          -- Si historique dispo : % de réduction vs prix moyen historique
          -- Sinon : % de réduction vs prix régulier affiché
          CASE
            WHEN ph.avg_price IS NOT NULL AND ph.data_points >= 2
              THEN LEAST(50, GREATEST(0,
                     ROUND(((ph.avg_price - d.sale_price) / ph.avg_price * 50)::numeric, 1)
                   ))
            ELSE LEAST(50, GREATEST(0,
                   ROUND(((d.regular_price - d.sale_price) / d.regular_price * 50)::numeric, 1)
                 ))
          END AS price_score,

          -- Composante mots-clés liquidation (30 pts)
          CASE
            WHEN LOWER(d.name) ~* 'liquidat|clearance|fin de s[eé]rie|d[eé]marque|solde final'
              THEN 30 ELSE 0
          END AS keyword_score,

          -- Composante stock limité (20 pts)
          CASE
            WHEN LOWER(d.name || ' ' || COALESCE(d.unit, ''))
                 ~* 'stock limit|quantit[eé] limit|jusqu''[aà] [eé]puisement|dernier stock'
              THEN 20 ELSE 0
          END AS stock_score

        FROM deals d
        JOIN stores s ON d.store_id = s.id
        JOIN categories c ON d.category_id = c.id
        LEFT JOIN (
          SELECT deal_name, store_id,
                 ROUND(AVG(price)::numeric, 2)            AS avg_price,
                 COUNT(DISTINCT DATE(recorded_at))        AS data_points
          FROM price_history
          WHERE recorded_at >= NOW() - INTERVAL '28 days'
          GROUP BY deal_name, store_id
        ) ph ON LOWER(d.name) = LOWER(ph.deal_name) AND d.store_id = ph.store_id
        WHERE d.is_active = TRUE
      )
      SELECT *,
             ROUND((price_score + keyword_score + stock_score)::numeric, 1) AS score
      FROM scored
      WHERE (price_score + keyword_score + stock_score) >= 20
      ORDER BY score DESC
      LIMIT 500
    `);

    const data = result.rows.map(row => {
      const up = parseUnitPrice(row.sale_price, row.unit, row.name, row.category_id);
      return {
        ...row,
        unit_price:  up?.unitPrice ?? null,
        unit_label:  up?.unitLabel ?? null,
        unit_type:   up?.type      ?? null,
        score:       Number(row.score),
        price_score:   Number(row.price_score),
        keyword_score: Number(row.keyword_score),
        stock_score:   Number(row.stock_score),
      };
    });

    res.json({ success: true, count: data.length, data });
  } catch (err) {
    console.error('[API] /deals/liquidation error:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

export default router;
