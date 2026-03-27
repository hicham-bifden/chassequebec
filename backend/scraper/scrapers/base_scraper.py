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
        """Détecte automatiquement la catégorie depuis le nom du produit.
        Retourne 'epicerie' par défaut si rien ne correspond.
        """
        # Normalise les accents pour simplifier la détection
        import unicodedata
        name = unicodedata.normalize('NFD', product_name.lower())
        name = ''.join(c for c in name if unicodedata.category(c) != 'Mn')

        if any(w in name for w in [
            "boeuf", "poulet", "porc", "veau", "saumon", "crevette", "viande",
            "steak", "cote", "roti", "bifteck", "agneau", "jambon", "bacon",
            "dinde", "lapin", "canard", "poisson", "thon", "sardine", "morue",
            "tilapia", "coquille", "homard", "pétoncle", "pétoncles",
        ]):
            return "viande"

        if any(w in name for w in [
            "pomme", "banane", "tomate", "laitue", "fraise", "legume", "fruit",
            "orange", "citron", "raisin", "ananas", "mangue", "avocat",
            "brocoli", "carotte", "oignon", "poivron", "concombre", "celeri",
            "epinard", "asperge", "courgette", "navet", "patate", "pomme de terre",
            "bleuet", "framboise", "cerise", "peche", "poire", "kiwi",
        ]):
            return "fruits-legumes"

        if any(w in name for w in [
            "lait", "fromage", "yogourt", "creme", "beurre", "oeuf", "kefir",
            "ricotta", "mozzarella", "cheddar", "parmesan", "cottage",
        ]):
            return "produits-laitiers"

        if any(w in name for w in [
            "pain", "baguette", "croissant", "bagel", "muffin",
            "brioche", "focaccia", "ciabatta",
        ]):
            return "boulangerie"

        if any(w in name for w in [
            "jus", "boisson", "cafe", "the ", "biere", "vin ", "cidre",
            "limonade", "soda", "kombucha", "boisson vegetale",
        ]):
            return "boissons"

        # Hygiène & entretien — doit être AVANT la détection "epicerie"
        if any(w in name for w in [
            "lingette", "papier hygi", "essuie-tout", "essuie tout",
            "couche", "tampon", "rasoir", "dentifrice", "shampoo",
            "savon", "deodorant", "nettoyant", "detergent", "lessive",
            "mouchoir", "papier mouchoir", "serviette hygienique",
            "charmin", "cottonelle", "cashmere", "purex",
            "desinfectant", "antiseptique", "lotion", "creme hydratante",
            "gel douche", "mousse a raser", "apres-rasage",
        ]):
            return "hygiene"

        if any(w in name for w in ["surgele", "pizza", "glace", "frappe"]):
            return "surgeles"

        return "epicerie"

    def clean_unit(self, raw: str) -> str:
        """Nettoie le champ 'unit' (description format) provenant des APIs.

        Retire les mentions de prix réguliers (ex: 'Rég. 29,99$ à 38,99$'),
        les virgules de fin, et tronque à 80 caractères max.
        """
        import re
        text = (raw or "").replace("\n", " ").strip()
        # Retire 'Rég. X$ à Y$' ou 'Reg. X$' — déjà affiché séparément
        text = re.sub(r"[Rr]ég?\.?\s*\d+[,.]?\d*\s*\$?\s*(à|a|-|–)?\s*\d*[,.]?\d*\s*\$?", "", text)
        # Retire les prix isolés restants comme '29,99 $' ou '29.99$'
        text = re.sub(r"\d+[.,]\d{2}\s*\$", "", text)
        # Retire 'Sélection variée' (redondant pour l'affichage)
        text = re.sub(r"[Ss]élection\s+vari[eé]e\.?", "", text, flags=re.IGNORECASE)
        # Retire les mots de liaison orphelins en fin de chaîne (ex: "50 à 104 à")
        text = re.sub(r"\s+(à|a|ou|and|or|–|-)\s*$", "", text, flags=re.IGNORECASE)
        # Nettoyage final : espaces multiples, virgules/points en début/fin
        text = re.sub(r"\s{2,}", " ", text).strip(" ,.-–")
        if len(text) > 80:
            text = text[:80].rsplit(" ", 1)[0].strip(" ,")
        return text

    @abstractmethod
    def scrape(self) -> list[dict]:
        """Scrape les deals. À implémenter dans chaque sous-classe."""
        pass
