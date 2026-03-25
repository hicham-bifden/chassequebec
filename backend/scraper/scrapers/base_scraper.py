import requests
from bs4 import BeautifulSoup
from fake_useragent import UserAgent
from datetime import datetime, timedelta
from abc import ABC, abstractmethod

class BaseScraper(ABC):
    """Classe de base pour tous les scrapers de circulaires."""

    def __init__(self, store_id: str):
        self.store_id = store_id
        self.ua = UserAgent()
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": self.ua.random,
            "Accept-Language": "fr-CA,fr;q=0.9,en;q=0.8",
        })

    def get_page(self, url: str) -> BeautifulSoup | None:
        """Récupère une page et retourne un objet BeautifulSoup."""
        try:
            response = self.session.get(url, timeout=15)
            response.raise_for_status()
            return BeautifulSoup(response.text, "html.parser")
        except requests.RequestException as e:
            print(f"[{self.store_id}] Erreur HTTP: {e}")
            return None

    def get_valid_until(self, days: int = 7) -> str:
        """Retourne la date de fin de validité (défaut: 7 jours)."""
        return (datetime.now() + timedelta(days=days)).strftime("%Y-%m-%d")

    def detect_category(self, product_name: str) -> str:
        """Détecte automatiquement la catégorie depuis le nom du produit."""
        name = product_name.lower()
        if any(w in name for w in ["bœuf", "poulet", "porc", "veau", "saumon", "crevette", "viande"]):
            return "viande"
        if any(w in name for w in ["pomme", "banane", "tomate", "laitue", "fraise", "légume", "fruit"]):
            return "fruits-legumes"
        if any(w in name for w in ["lait", "fromage", "yogourt", "crème", "beurre"]):
            return "produits-laitiers"
        if any(w in name for w in ["pain", "baguette", "croissant", "bagel"]):
            return "boulangerie"
        if any(w in name for w in ["jus", "eau", "boisson", "café", "thé", "bière"]):
            return "boissons"
        if any(w in name for w in ["savon", "shampooing", "dentifrice", "déodorant"]):
            return "hygiene"
        if any(w in name for w in ["surgelé", "pizza", "glace"]):
            return "surgeles"
        return "epicerie"

    @abstractmethod
    def scrape(self) -> list[dict]:
        """Scrape les deals. À implémenter dans chaque sous-classe."""
        pass
