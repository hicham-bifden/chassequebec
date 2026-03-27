"""
metro_scraper.py — Scraper pour la vraie circulaire Metro (metro.ca)

Metro utilise la même API Metro Digital que Super C, mais avec:
  - Un banner ID différent: 62e3ee07ffe0e6f10778a56e
  - Une clé API différente: 0a112db32b2f42588b54063b05dfbc90
  - L'URL de pages utilise le store_id du magasin (pas un chain ID fixe)

Étapes:
  1. Récupérer le flyerId actif pour le store_id 373 (Metro Plus Domaine, Montréal)
  2. Récupérer toutes les pages de la circulaire
  3. Extraire les produits uniques avec leurs prix
"""

import re
import requests
from datetime import date
from .base_scraper import BaseScraper

API_BASE = "https://metrodigital-apim.azure-api.net/api"

# Identifiants de l'API Metro Digital pour Metro (différents de Super C)
API_HEADERS = {
    "ocp-apim-subscription-key": "0a112db32b2f42588b54063b05dfbc90",
    "x-api-version":             "3.0",
    "banner":                    "62e3ee07ffe0e6f10778a56e",
    "referer":                   "https://circulaire.metro.ca/",
    "accept":                    "application/json",
    "user-agent":                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "accept-language":           "fr-CA",
}

# Metro Plus Domaine, Montréal — store ID utilisé pour cibler Montréal
STORE_ID = 373

CATEGORY_MAP = {
    "Viandes et charcuterie":     "viande",
    "Meat and Deli":              "viande",
    "Fruit and Vegetables":       "fruits-legumes",
    "Fruits et légumes":          "fruits-legumes",
    "Dairy and Eggs":             "produits-laitiers",
    "Produits laitiers et oeufs": "produits-laitiers",
    "Bakery":                     "boulangerie",
    "Boulangerie":                "boulangerie",
    "Beverages":                  "boissons",
    "Boissons":                   "boissons",
    "Frozen":                     "surgeles",
    "Surgelés":                   "surgeles",
    "Health and Beauty":          "hygiene",
    "Hygiène et beauté":          "hygiene",
    "Grocery":                    "epicerie",
    "Épicerie":                   "epicerie",
}

EMOJI_MAP = {
    "viande":           "🥩",
    "fruits-legumes":   "🥦",
    "produits-laitiers": "🥛",
    "boulangerie":      "🍞",
    "boissons":         "🧃",
    "surgeles":         "🧊",
    "hygiene":          "🧴",
    "epicerie":         "🛒",
}


class MetroScraper(BaseScraper):
    """Scraper pour la circulaire Metro via l'API Metro Digital."""

    def __init__(self):
        super().__init__("metro")

    def scrape(self) -> list[dict]:
        print("[metro] Démarrage du scraping via API Metro Digital...")
        try:
            flyer_id, valid_to = self._get_current_flyer()
            if not flyer_id:
                raise ValueError("Aucun flyer Metro actif trouvé")

            raw_products = self._get_flyer_products(flyer_id)
            deals = [d for p in raw_products if (d := self._to_deal(p, valid_to)) is not None]

            print(f"[metro] {len(deals)} deals récupérés depuis la vraie circulaire (flyer {flyer_id})")
            return deals

        except Exception as e:
            print(f"[metro] Erreur API: {e} — utilisation des données mock")
            return self._mock_fallback()

    def _get_current_flyer(self) -> tuple[str | None, str]:
        """Retourne (flyerId, valid_to) du flyer Metro actif pour Montréal."""
        today = date.today().isoformat()
        resp = requests.get(
            f"{API_BASE}/flyers/{STORE_ID}/bil?date={today}",
            headers=API_HEADERS, timeout=15
        )
        resp.raise_for_status()

        flyers = resp.json().get("flyers", [])
        if not flyers:
            return None, ""

        flyer = flyers[0]
        flyer_id = flyer.get("title")  # ex: "82852"
        valid_to = (flyer.get("endDate") or "")[:10]
        return flyer_id, valid_to

    def _get_flyer_products(self, flyer_id: str) -> list[dict]:
        """Récupère les produits uniques depuis toutes les pages du flyer."""
        url = f"{API_BASE}/pages/{flyer_id}/{STORE_ID}/bil/"
        resp = requests.get(url, headers=API_HEADERS, timeout=30)
        resp.raise_for_status()

        pages = resp.json()
        seen_skus  = set()
        seen_names = set()
        products   = []

        for page in pages:
            for block in page.get("blocks", []) or []:
                for prod in block.get("products", []) or []:
                    if not prod:
                        continue
                    sku  = prod.get("sku")
                    name = (prod.get("productFr") or prod.get("productEn") or "").strip()
                    key  = sku if sku else name
                    if not key or key in seen_skus:
                        continue
                    seen_skus.add(key)
                    if name in seen_names:
                        continue
                    seen_names.add(name)
                    products.append(prod)

        return products

    def _to_deal(self, p: dict, valid_to: str) -> dict | None:
        """Convertit un produit Metro en deal pour notre DB."""
        name = (p.get("productFr") or p.get("productEn") or "").strip()
        if not name:
            return None

        sale_price = self._parse_price(p.get("salePrice") or p.get("salePriceFr"))
        if sale_price is None:
            return None

        regular_price = self._parse_price(p.get("regularPrice") or p.get("regularPriceFr"))
        if regular_price is None or regular_price <= sale_price:
            regular_price = round(sale_price * 1.25, 2)

        unit = (p.get("bodyFr") or p.get("bodyEn") or "").strip()
        if len(unit) > 80:
            unit = unit[:80].rsplit(",", 1)[0].strip()

        cat_fr      = p.get("mainCategoryFr") or p.get("mainCategoryEn") or ""
        category_id = CATEGORY_MAP.get(cat_fr) or self.detect_category(name)
        image_url   = p.get("productImage") or ""
        end_date    = self._parse_date(p.get("validTo")) or valid_to or self.get_valid_until(7)

        return {
            "name":           name,
            "brand":          None,
            "store_id":       self.store_id,
            "category_id":    category_id,
            "regular_price":  regular_price,
            "sale_price":     sale_price,
            "unit":           unit,
            "valid_until":    end_date,
            "image_emoji":    EMOJI_MAP.get(category_id, "🛒"),
            "image_url":      image_url,
            "product_url":    "",   # Metro Digital API ne fournit pas d'URL produit
            "loyalty_points": 0,
        }

    def _parse_price(self, raw) -> float | None:
        if raw is None:
            return None
        text = str(raw).replace(",", ".")
        m = re.search(r"(\d+\.\d{2})", text)
        if m:
            return float(m.group(1))
        m = re.search(r"(\d+)", text)
        return float(m.group(1)) if m else None

    def _parse_date(self, raw: str | None) -> str | None:
        if not raw:
            return None
        return raw[:10]

    def _mock_fallback(self) -> list[dict]:
        valid_until = self.get_valid_until(7)
        products = [
            ("Poulet entier frais", 12.99, 7.99, "kg", "viande"),
            ("Bananes", 1.99, 1.29, "kg", "fruits-legumes"),
            ("Yogourt grec Oikos", 6.99, 4.49, "750g", "produits-laitiers"),
            ("Lait 2% Natrel", 5.49, 3.99, "4L", "produits-laitiers"),
            ("Jus d'orange Tropicana", 6.99, 4.49, "1.75L", "boissons"),
            ("Détergent Tide", 12.99, 7.99, "1.5L", "epicerie"),
        ]
        return [
            {"name": n, "brand": None, "store_id": self.store_id,
             "category_id": cat, "regular_price": reg, "sale_price": sale,
             "unit": unit, "valid_until": valid_until,
             "image_emoji": EMOJI_MAP.get(cat, "🛒"), "image_url": "", "product_url": "", "loyalty_points": 0}
            for n, reg, sale, unit, cat in products
        ]
