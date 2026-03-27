"""
superc_scraper.py — Scraper pour la vraie circulaire Super C

Comment ça marche:
  1. On appelle l'API Metro Digital (qui alimente superc.ca)
  2. On récupère le flyerId de la semaine en cours
  3. On récupère toutes les pages de la circulaire
  4. On extrait les produits uniques (par SKU) avec leurs prix

L'API retourne les mêmes données que le site web officiel.
"""

import re
import requests
from datetime import date
from .base_scraper import BaseScraper

# URL de base de l'API Metro Digital (utilisée par superc.ca)
API_BASE = "https://metrodigital-apim.azure-api.net/api"

# Headers nécessaires pour l'API (trouvés en analysant les appels réseau du site)
API_HEADERS = {
    "ocp-apim-subscription-key": "021027e7c41548bcba5d2315a155816b",
    "x-api-version":             "3.0",
    "banner":                    "6141fa7157f8c212fc19dddc",
    "referer":                   "https://circulaire.superc.ca/",
    "accept":                    "application/json",
    "user-agent":                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "accept-language":           "fr-CA",
}

# Correspondance catégorie Super C → notre catégorie interne
CATEGORY_MAP = {
    "Viandes et charcuterie":           "viande",
    "Meat and Deli":                    "viande",
    "Fruits et légumes":                "fruits-legumes",
    "Produce":                          "fruits-legumes",
    "Produits laitiers et oeufs":       "produits-laitiers",
    "Dairy and Eggs":                   "produits-laitiers",
    "Boulangerie":                      "boulangerie",
    "Bakery":                           "boulangerie",
    "Boissons":                         "boissons",
    "Beverages":                        "boissons",
    "Surgelés":                         "surgeles",
    "Frozen":                           "surgeles",
    "Hygiène et beauté":                "hygiene",
    "Health and Beauty":                "hygiene",
    "Épicerie":                         "epicerie",
    "Grocery":                          "epicerie",
}

EMOJI_MAP = {
    "viande":          "🥩",
    "fruits-legumes":  "🥦",
    "produits-laitiers": "🥛",
    "boulangerie":     "🍞",
    "boissons":        "🧃",
    "surgeles":        "🧊",
    "hygiene":         "🧴",
    "epicerie":        "🛒",
}


class SuperCScraper(BaseScraper):
    """Scraper pour la circulaire Super C via l'API Metro Digital."""

    def __init__(self):
        super().__init__("superc")

    # ------------------------------------------------------------------
    # Point d'entrée principal
    # ------------------------------------------------------------------
    def scrape(self) -> list[dict]:
        print("[superc] Démarrage du scraping via API Metro Digital...")
        try:
            flyer_id = self._get_current_flyer_id()
            if not flyer_id:
                raise ValueError("Aucun flyer actif trouvé")

            raw_products = self._get_flyer_products(flyer_id)
            deals = [self._to_deal(p) for p in raw_products if self._to_deal(p)]

            print(f"[superc] {len(deals)} deals récupérés depuis la vraie circulaire (flyer {flyer_id})")
            return deals

        except Exception as e:
            print(f"[superc] Erreur API: {e} — utilisation des données mock")
            return self._mock_fallback()

    # ------------------------------------------------------------------
    # Étape 1 : trouver le flyerId de la semaine
    # ------------------------------------------------------------------
    def _get_current_flyer_id(self) -> str | None:
        """Retourne le flyerId de la circulaire active aujourd'hui."""
        today = date.today().isoformat()
        url = f"{API_BASE}/flyers/447/bil?date={today}"
        resp = requests.get(url, headers=API_HEADERS, timeout=15)
        resp.raise_for_status()

        flyers = resp.json().get("flyers", [])
        if not flyers:
            return None
        # "title" contient l'ID numérique (ex: "82873")
        return flyers[0].get("title")

    # ------------------------------------------------------------------
    # Étape 2 : récupérer tous les produits de la circulaire
    # ------------------------------------------------------------------
    def _get_flyer_products(self, flyer_id: str) -> list[dict]:
        """Récupère les produits uniques depuis toutes les pages du flyer."""
        url = f"{API_BASE}/pages/{flyer_id}/447/bil/"
        resp = requests.get(url, headers=API_HEADERS, timeout=30)
        resp.raise_for_status()

        pages = resp.json()
        seen_skus = set()
        products = []

        seen_names = set()
        for page in pages:
            for block in page.get("blocks", []):
                for prod in block.get("products", []):
                    if not prod:
                        continue
                    sku = prod.get("sku")
                    name = (prod.get("productFr") or prod.get("productEn") or "").strip()
                    # Déduplique par SKU d'abord, puis par nom si SKU absent
                    key = sku if sku else name
                    if not key or key in seen_skus:
                        continue
                    seen_skus.add(key)
                    if name in seen_names:
                        continue
                    seen_names.add(name)
                    products.append(prod)

        return products

    # ------------------------------------------------------------------
    # Étape 3 : convertir un produit API → format standard de notre DB
    # ------------------------------------------------------------------
    def _to_deal(self, p: dict) -> dict | None:
        """Convertit un produit brut de l'API en deal pour notre base de données."""
        name = (p.get("productFr") or p.get("productEn") or "").strip()
        if not name:
            return None

        sale_price = self._parse_price(p.get("salePrice") or p.get("salePriceFr"))
        if sale_price is None:
            return None

        regular_price = self._parse_price(p.get("regularPrice") or p.get("regularPriceFr"))
        if regular_price is None or regular_price <= sale_price:
            # Si pas de prix régulier ou invalide, on estime +25%
            regular_price = round(sale_price * 1.25, 2)

        # Description du format (ex: "375 g", "kg", "sac 10 lb")
        unit = (p.get("bodyFr") or p.get("bodyEn") or "").strip()
        # Tronquer les descriptions trop longues
        if len(unit) > 60:
            unit = unit[:60].rsplit(",", 1)[0].strip()

        # Catégorie : priorité à la détection par nom pour les cas spécifiques
        cat_fr = p.get("mainCategoryFr") or p.get("mainCategoryEn") or ""
        cat_by_name = self.detect_category(name)
        cat_by_api  = CATEGORY_MAP.get(cat_fr)
        category_id = cat_by_name if cat_by_name != 'epicerie' else (cat_by_api or 'epicerie')

        # Date de validité depuis l'API (ou 7 jours par défaut)
        valid_until = self._parse_date(p.get("validTo")) or self.get_valid_until(7)

        # Image du produit (URL directe depuis l'API)
        image_url = p.get("productImage")

        return {
            "name": name,
            "brand": None,  # L'API Super C ne sépare pas marque/nom
            "store_id": self.store_id,
            "category_id": category_id,
            "regular_price": regular_price,
            "sale_price": sale_price,
            "unit": unit,
            "valid_until": valid_until,
            "image_emoji": EMOJI_MAP.get(category_id, "🛒"),
            "image_url":   image_url or "",
            "product_url": "",   # Super C ne fournit pas d'URL produit via l'API
            "loyalty_points": 0,
        }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _parse_price(self, raw) -> float | None:
        """Extrait le premier prix valide d'une chaîne comme '4,99' ou '4.99' ou 'de 5,99 à 6,99'."""
        if raw is None:
            return None
        text = str(raw).replace(",", ".")
        # Cherche le premier nombre décimal
        m = re.search(r"(\d+\.\d{2})", text)
        if m:
            return float(m.group(1))
        # Cherche un entier seul
        m = re.search(r"(\d+)", text)
        if m:
            return float(m.group(1))
        return None

    def _parse_date(self, raw: str | None) -> str | None:
        """Convertit '2026-04-01T04:00:00Z' → '2026-04-01'."""
        if not raw:
            return None
        return raw[:10]  # Garde juste YYYY-MM-DD

    # ------------------------------------------------------------------
    # Fallback si l'API est indisponible
    # ------------------------------------------------------------------
    def _mock_fallback(self) -> list[dict]:
        """Données Super C réalistes si l'API est temporairement inaccessible."""
        valid_until = self.get_valid_until(7)
        products = [
            ("Pâtes Catelli", 2.99, 1.49, "500g", "epicerie"),
            ("Bœuf haché extra-maigre", 16.99, 11.99, "kg", "viande"),
            ("Rôti de porc", 11.99, 7.99, "kg", "viande"),
            ("Carottes baby", 3.49, 1.99, "500g", "fruits-legumes"),
            ("Poitrines de poulet sans os", 9.99, 6.99, "kg", "viande"),
            ("Lait 2% Natrel", 5.49, 3.99, "2L", "produits-laitiers"),
            ("Pain blanc Gadoua", 3.49, 2.29, "675g", "boulangerie"),
            ("Fromage cheddar Kraft", 8.99, 5.99, "400g", "produits-laitiers"),
            ("Pommes Gala", 3.99, 2.49, "sac 3 lbs", "fruits-legumes"),
            ("Détergent Tide", 13.99, 8.99, "1.47L", "epicerie"),
        ]
        return [
            {
                "name": name, "brand": None,
                "store_id": self.store_id, "category_id": cat,
                "regular_price": reg, "sale_price": sale, "unit": unit,
                "valid_until": valid_until,
                "image_emoji": EMOJI_MAP.get(cat, "🛒"),
                "image_url": "",
                "product_url": "",
                "loyalty_points": 0,
            }
            for name, reg, sale, unit, cat in products
        ]
