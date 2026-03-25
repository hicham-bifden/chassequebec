#!/usr/bin/env python3
"""
ChasseQuébec Scraper — Point d'entrée principal
Utilise les mock scrapers en dev, vrais scrapers en prod
"""
import os
import schedule
import time
from dotenv import load_dotenv
from scrapers.mock_scraper import MockScraper
from db import save_deals, get_all_deals

load_dotenv()

STORES = ["iga", "metro", "maxi", "superc", "costco"]

def run_all_scrapers():
    """Lance tous les scrapers et sauvegarde en DB."""
    print("\n🔍 Démarrage du scraping ChasseQuébec...")
    total = 0

    for store_id in STORES:
        try:
            scraper = MockScraper(store_id)
            deals = scraper.scrape()
            saved = save_deals(deals)
            total += saved
        except Exception as e:
            print(f"[{store_id}] Erreur: {e}")

    print(f"✅ Scraping terminé — {total} deals sauvegardés\n")

def show_stats():
    """Affiche les stats actuelles de la DB."""
    deals = get_all_deals()
    stores = {}
    for deal in deals:
        stores[deal["store_name"]] = stores.get(deal["store_name"], 0) + 1

    print("\n📊 Stats ChasseQuébec DB:")
    for store, count in sorted(stores.items()):
        print(f"  {store}: {count} deals")
    print(f"  Total: {len(deals)} deals actifs\n")

if __name__ == "__main__":
    import sys

    if "--once" in sys.argv:
        run_all_scrapers()
        show_stats()
    elif "--stats" in sys.argv:
        show_stats()
    else:
        # Mode scheduler — toutes les 168h (mercredi)
        run_all_scrapers()
        show_stats()
        schedule.every(168).hours.do(run_all_scrapers)
        print("⏰ Scheduler actif — prochain scraping dans 168h")
        while True:
            schedule.run_pending()
            time.sleep(60)
