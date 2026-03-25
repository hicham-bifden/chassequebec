import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// GET /api/deals — tous les deals actifs
router.get('/', async (req, res) => {
  try {
    const { store, category, sort = 'savings', search, limit = 100 } = req.query;

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
    params.push(parseInt(limit));

    const result = await query(sql, params);

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

// GET /api/deals/stats — statistiques globales
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

// GET /api/deals/stores — liste des magasins avec count
router.get('/stores', async (req, res) => {
  try {
    const result = await query(`
      SELECT s.id, s.name, s.color, s.text_color,
             COUNT(d.id) as deal_count
      FROM stores s
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
