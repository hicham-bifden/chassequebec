from datetime import datetime, timedelta
from .base_scraper import BaseScraper
import random

MOCK_PRODUCTS = {
    "iga": [
        ("Bœuf haché extra-maigre", "Exceldor", 7.49, 4.99, "500g", "🥩", 150),
        ("Fraises du Québec", None, 5.99, 3.49, "454g", "🍓", 0),
        ("Fromage cheddar fort", "Armstrong", 8.99, 5.49, "400g", "🧀", 100),
        ("Lait 2% Natrel", "Natrel", 4.99, 3.99, "2L", "🥛", 0),
        ("Pain tranché blanc", "Gadoua", 3.49, 1.99, "675g", "🍞", 0),
        ("Tomates grappes", None, 4.99, 2.99, "kg", "🍅", 0),
    ],
    "metro": [
        ("Poulet entier frais", "Flamingo", 12.99, 7.99, "kg", "🍗", 200),
        ("Bananes", None, 1.99, 1.29, "kg", "🍌", 0),
        ("Yogourt grec", "Oikos", 6.99, 4.49, "750g", "🥛", 80),
        ("Lait 2% Natrel", "Natrel", 5.49, 3.99, "4L", "🥛", 0),
        ("Détergent Tide", "Tide", 12.99, 7.99, "1.5L", "🧺", 0),
        ("Jus d'orange Tropicana", "Tropicana", 6.99, 4.49, "1.75L", "🧃", 0),
    ],
    "maxi": [
        ("Poitrine de poulet", "Flamingo", 9.99, 5.99, "kg", "🍗", 0),
        ("Céréales Cheerios", "General Mills", 7.49, 4.99, "520g", "🥣", 0),
        ("Pizza Dr. Oetker", "Dr. Oetker", 7.99, 4.99, "2x390g", "🍕", 0),
        ("Pommes Gala", None, 4.99, 2.99, "3 lbs", "🍎", 0),
        ("Beurre d'arachide", "Skippy", 5.99, 3.99, "500g", "🥜", 0),
    ],
    "superc": [
        ("Pâtes Catelli", "Catelli", 2.99, 1.49, "500g", "🍝", 0),
        ("Bœuf haché extra-maigre", None, 16.99, 11.99, "kg", "🥩", 0),
        ("Rôti de porc", None, 11.99, 7.99, "kg", "🥩", 0),
        ("Carottes baby", None, 3.49, 1.99, "500g", "🥕", 0),
    ],
    "costco": [
        ("Pizza surgelée Dr. Oetker", "Dr. Oetker", 14.99, 9.99, "2x800g", "🍕", 0),
        ("Fromage cheddar Kraft", "Kraft", 22.99, 16.99, "2kg", "🧀", 0),
        ("Lait 2% Natrel", "Natrel", 7.49, 5.99, "4L", "🥛", 0),
        ("Saumon atlantique", None, 24.99, 17.99, "kg", "🐟", 0),
    ],
}

class MockScraper(BaseScraper):
    """Scraper de données mockées réalistes pour le développement."""

    def __init__(self, store_id: str):
        super().__init__(store_id)

    def scrape(self) -> list[dict]:
        products = MOCK_PRODUCTS.get(self.store_id, [])
        deals = []
        valid_until = self.get_valid_until(7)

        for product in products:
            name, brand, regular_price, sale_price, unit, emoji, points = product
            deals.append({
                "name": name,
                "brand": brand,
                "store_id": self.store_id,
                "category_id": self.detect_category(name),
                "regular_price": regular_price,
                "sale_price": sale_price,
                "unit": unit,
                "valid_until": valid_until,
                "image_emoji": emoji,
                "image_url": "",
                "loyalty_points": points,
            })

        print(f"[{self.store_id}] {len(deals)} deals générés (mock)")
        return deals
