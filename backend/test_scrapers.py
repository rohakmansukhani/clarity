import asyncio
import sys
import os
import logging

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), "."))

# Configure logging to see errors
logging.basicConfig(level=logging.INFO)

from app.services.providers.google_finance import GoogleFinanceProvider
from app.services.providers.screener_service import ScreenerProvider
from app.services.providers.moneycontrol_service import MoneyControlProvider

async def test_scrapers():
    symbol = "RELIANCE"
    
    print(f"\n--- Testing Scrapers for {symbol} ---")
    
    # 1. Google Finance
    gf = GoogleFinanceProvider()
    print("\n[Google Finance]")
    price = await gf.get_latest_price(symbol)
    print(f"Price: {price}")
    
    # 2. Screener.in
    sc = ScreenerProvider()
    print("\n[Screener.in]")
    details = await sc.get_stock_details(symbol)
    print(f"Details: {details.keys() if details else 'None'}")
    if details:
        print(f"Market Cap: {details.get('market_cap', 'N/A')}")
        print(f"ROE: {details.get('roe', 'N/A')}")

    # 3. MoneyControl (News)
    mc = MoneyControlProvider()
    print("\n[MoneyControl/News]")
    news = await mc.get_news(symbol)
    print(f"News Count: {len(news)}")
    if news:
        print(f"Latest: {news[0]['title']}")

if __name__ == "__main__":
    asyncio.run(test_scrapers())
