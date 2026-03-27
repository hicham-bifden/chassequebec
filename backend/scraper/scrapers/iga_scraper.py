"""
iga_scraper.py — Scraper pour la circulaire IGA (iga.net)

IGA utilise l'API Flipp Enterprise (flippenterprise.net).
Étapes:
  1. Récupérer la publication active (avec l'access_token Flipp)
  2. Récupérer tous les produits de cette publication
  3. Filtrer ceux qui ont un prix et les convertir au format DB
"""

import re
import requests
from .base_scraper import BaseScraper

FLIPP_BASE   = "https://dam.flippenterprise.net/flyerkit"
MERCHANT     = "igaquebec"
ACCESS_TOKEN = "692be3f8ba9e9247dc13d064cb89e7f9"
STORE_CODE   = "8253"   # IGA Montréal (utilisé pour cibler la bonne zone)

HEADERS = {
    "User-Agent":      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Accept":          "application/json",
    "Accept-Language": "fr-CA,fr;q=0.9",
    "Referer":         "https://www.iga.net/fr/circulaire",
}

# Correspondance catégorie Flipp IGA → notre format interne
CATEGORY_MAP = {
    "Viandes":                  "viande",
    "Boucherie":                "viande",
    "Poisson et fruits de mer": "viande",
    "Fruits et légumes":        "fruits-legumes",
    "Fruits":                   "fruits-legumes",
    "Légumes":                  "fruits-legumes",
    "Produits laitiers":        "produits-laitiers",
    "Fromages":                 "produits-laitiers",
    "Oeufs":                    "produits-laitiers",
    "Boulangerie":              "boulangerie",
    "Boissons":                 "boissons",
    "Surgelés":                 "surgeles",
    "Hygiène":                  "hygiene",
    "Beauté":                   "hygiene",
}

EMOJI_MAP = {
    "viande": "🥩", "fruits-legumes": "🥦", "produits-laitiers": "🥛",
    "boulangerie": "🍞", "boissons": "🧃", "surgeles": "🧊",
    "hygiene": "🧴", "epicerie": "🛒",
}


class IGAScraper(BaseScraper):
    """Scraper pour la circulaire IGA via l'API Flipp Enterprise."""

    def __init__(self):
        super().__init__("iga")

    def scrape(self) -> list[dict]:
        print("[iga] Démarrage du scraping via Flipp Enterprise...")
        try:
            pub_id, valid_from, valid_to = self._get_active_publication()
            if not pub_id:
                raise ValueError("Aucune publication IGA active trouvée")

            products = self._get_products(pub_id)
            deals = [d for p in products if (d := self._to_deal(p, valid_to)) is not None]

            print(f"[iga] {len(deals)} deals récupérés (publication {pub_id}, valide jusqu'au {valid_to})")
            return deals

        except Exception as e:
            print(f"[iga] Erreur API: {e} — utilisation des données mock")
            return self._mock_fallback()

    # ------------------------------------------------------------------
    def _get_active_publication(self) -> tuple[int | None, str, str]:
        """Retourne (pub_id, valid_from, valid_to) de la circulaire active."""
        url = (
            f"{FLIPP_BASE}/publications/{MERCHANT}"
            f"?languages[]=fr&locale=fr&access_token={ACCESS_TOKEN}"
            f"&show_storefronts=true&store_code={STORE_CODE}"
        )
        resp = requests.get(url, headers=HEADERS, timeout=15)
        resp.raise_for_status()

        pubs = resp.json()
        if not pubs:
            return None, "", ""

        pub = pubs[0]
        return (
            pub.get("id"),
            (pub.get("valid_from") or "")[:10],
            (pub.get("valid_to")   or "")[:10],
        )

    def _get_products(self, pub_id: int) -> list[dict]:
        """Récupère tous les produits d'une publication Flipp."""
        url = (
            f"{FLIPP_BASE}/publication/{pub_id}/products"
            f"?display_type=all&locale=fr&access_token={ACCESS_TOKEN}"
        )
        resp = requests.get(url, headers=HEADERS, timeout=20)
        resp.raise_for_status()
        return resp.json()

    def _to_deal(self, p: dict, valid_to: str) -> dict | None:
        """Convertit un produit Flipp IGA en deal pour notre DB."""
        name = (p.get("name") or "").strip()
        if not name or name.lower().startswith("scene") or len(name) < 3:
            return None

        sale_price = self._parse_price(p.get("price_text"))
        if sale_price is None:
            return None

        regular_price = self._parse_price(p.get("original_price"))
        if regular_price is None or regular_price <= sale_price:
            regular_price = round(sale_price * 1.25, 2)

        # Description du format (ex: "325 g", "kg", "2 x 500 g")
        unit = (p.get("description") or "").replace("\n", " ").strip()
        if len(unit) > 80:
            unit = unit[:80].rsplit(" ", 1)[0]

        # Catégorie depuis Flipp → notre format
        cats = p.get("item_categories") or []
        cat_name = cats[0].get("name", "") if isinstance(cats, list) and cats else ""
        category_id = CATEGORY_MAP.get(cat_name) or self.detect_category(name)

        # Image directement depuis l'API
        image_url = p.get("image_url") or ""

        return {
            "name":          name.title(),   # "ASPERGES VERTES" → "Asperges Vertes"
            "brand":         p.get("brand"),
            "store_id":      self.store_id,
            "category_id":   category_id,
            "regular_price": regular_price,
            "sale_price":    sale_price,
            "unit":          unit,
            "valid_until":   valid_to or self.get_valid_until(7),
            "image_emoji":   EMOJI_MAP.get(category_id, "🛒"),
            "image_url":     image_url,
            "loyalty_points": 0,
        }

    def _parse_price(self, raw) -> float | None:
        if raw is None:
            return None
        m = re.search(r"(\d+[.,]\d{2})", str(raw).replace(",", "."))
        return float(m.group(1).replace(",", ".")) if m else None

    def _mock_fallback(self) -> list[dict]:
        valid_until = self.get_valid_until(7)
        products = [
            ("Fraises du Québec", 5.99, 3.49, "454g", "fruits-legumes"),
            ("Bœuf haché extra-maigre", 7.49, 4.99, "500g", "viande"),
            ("Fromage cheddar fort", 8.99, 5.49, "400g", "produits-laitiers"),
            ("Lait 2% Natrel", 4.99, 3.99, "2L", "produits-laitiers"),
            ("Pain tranché blanc Gadoua", 3.49, 1.99, "675g", "boulangerie"),
            ("Tomates grappes", 4.99, 2.99, "kg", "fruits-legumes"),
        ]
        return [
            {"name": n, "brand": None, "store_id": self.store_id,
             "category_id": cat, "regular_price": reg, "sale_price": sale,
             "unit": unit, "valid_until": valid_until,
             "image_emoji": EMOJI_MAP.get(cat, "🛒"), "image_url": "", "loyalty_points": 0}
            for n, reg, sale, unit, cat in products
        ]
