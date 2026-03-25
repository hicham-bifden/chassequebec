import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

def get_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

def save_deals(deals: list[dict]) -> int:
    """Sauvegarde les deals scrapés. Retourne le nombre d'insérés."""
    conn = get_connection()
    cur = conn.cursor()
    count = 0
    try:
        # Désactive les anciens deals du même magasin
        if deals:
            store_id = deals[0]["store_id"]
            cur.execute(
                "UPDATE deals SET is_active = FALSE WHERE store_id = %s",
                (store_id,)
            )

        for deal in deals:
            cur.execute("""
                INSERT INTO deals (name, brand, store_id, category_id,
                    regular_price, sale_price, unit, valid_until,
                    image_emoji, loyalty_points)
                VALUES (%(name)s, %(brand)s, %(store_id)s, %(category_id)s,
                    %(regular_price)s, %(sale_price)s, %(unit)s, %(valid_until)s,
                    %(image_emoji)s, %(loyalty_points)s)
            """, deal)

            # Historique des prix
            cur.execute("""
                INSERT INTO price_history (deal_name, store_id, price)
                VALUES (%s, %s, %s)
            """, (deal["name"], deal["store_id"], deal["sale_price"]))

            count += 1

        conn.commit()
        print(f"[DB] {count} deals sauvegardés pour {deals[0]['store_id'] if deals else 'N/A'}")
    except Exception as e:
        conn.rollback()
        print(f"[DB] Erreur: {e}")
        raise
    finally:
        cur.close()
        conn.close()
    return count

def get_all_deals() -> list[dict]:
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("""
            SELECT d.*, s.name as store_name, s.color, s.text_color,
                   c.label as category_label, c.emoji as category_emoji
            FROM deals d
            JOIN stores s ON d.store_id = s.id
            JOIN categories c ON d.category_id = c.id
            WHERE d.is_active = TRUE
            ORDER BY (d.regular_price - d.sale_price) DESC
        """)
        return [dict(row) for row in cur.fetchall()]
    finally:
        cur.close()
        conn.close()
