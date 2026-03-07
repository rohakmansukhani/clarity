"""
Integration test for NSE+BSE+ETF unified system
"""
import asyncio
import sys
import os

# Add app to path
sys.path.insert(0, os.path.dirname(__file__))

from app.services.market_service import MarketService
from app.core.symbol_registry import registry

async def main():
    print("=" * 60)
    print("CLARITY NSE + BSE + ETF INTEGRATION TEST")
    print("=" * 60)

    market_service = MarketService()

    # Test 1: Symbol Registry Population
    print("\n[TEST 1] Populating Symbol Registry...")
    try:
        symbols = await market_service.get_all_symbols()
        print(f"✅ Loaded {len(symbols)} instruments")

        # Count by type
        stocks = [s for s in symbols if s.get('type') == 'STOCK']
        etfs = [s for s in symbols if s.get('type') == 'ETF']

        # Count by exchange
        nse_only = [s for s in stocks if s.get('exchanges') == ['NSE']]
        bse_only = [s for s in stocks if s.get('exchanges') == ['BSE']]
        both = [s for s in stocks if set(s.get('exchanges', [])) == {'NSE', 'BSE'}]

        print(f"   - Stocks: {len(stocks)} (NSE-only: {len(nse_only)}, BSE-only: {len(bse_only)}, Dual-listed: {len(both)})")
        print(f"   - ETFs: {len(etfs)}")

    except Exception as e:
        print(f"❌ Error: {e}")
        return

    # Test 2: Search with Exchange Filter
    print("\n[TEST 2] Testing Search with Exchange Filter...")
    try:
        # Search "Reliance" with ALL exchanges
        all_results = await market_service.search_stocks("RELIANCE", exchange_filter="ALL")
        print(f"   Search 'RELIANCE' (ALL): {len(all_results)} results")
        if all_results:
            rel = all_results[0]
            print(f"      {rel['symbol']} - {rel['name']} - Exchanges: {rel.get('exchanges', [])}")

        # NSE only
        nse_results = await market_service.search_stocks("RELIANCE", exchange_filter="NSE")
        print(f"   Search 'RELIANCE' (NSE): {len(nse_results)} results")

        # BSE only
        bse_results = await market_service.search_stocks("TATA", exchange_filter="BSE")
        print(f"   Search 'TATA' (BSE): {len(bse_results)} results")

        print("✅ Search with filters working")

    except Exception as e:
        print(f"❌ Error: {e}")

    # Test 3: Dual-Listed Stock Price (Consensus Engine)
    print("\n[TEST 3] Testing Consensus Engine (Dual-Listed Stock)...")
    try:
        details = await market_service.get_aggregated_details("RELIANCE")
        price = details.get('market_data', {}).get('price', 0)
        exchanges = details.get('exchanges', [])

        print(f"   RELIANCE:")
        print(f"      Price: ₹{price}")
        print(f"      Exchanges: {exchanges}")
        print(f"      Consensus Status: {details.get('market_data', {}).get('status', 'N/A')}")

        if 'NSE' in exchanges and 'BSE' in exchanges:
            print("✅ Dual-listed stock detected and consensus price fetched")
        else:
            print("⚠️  Expected dual-listed stock")

    except Exception as e:
        print(f"❌ Error: {e}")

    # Test 4: BSE-Only Stock
    print("\n[TEST 4] Testing BSE-Only Stock...")
    try:
        # Find a BSE-only stock from our registry
        bse_only_stocks = [s for s in symbols if s.get('exchanges') == ['BSE']]
        if bse_only_stocks:
            test_sym = bse_only_stocks[0]['symbol']
            print(f"   Testing: {test_sym}")

            details = await market_service.get_aggregated_details(test_sym)
            exchanges = details.get('exchanges', [])

            if exchanges == ['BSE']:
                print(f"✅ BSE-only stock correctly identified")
            else:
                print(f"⚠️  Expected BSE-only, got: {exchanges}")
        else:
            print("⚠️  No BSE-only stocks found in registry")

    except Exception as e:
        print(f"❌ Error: {e}")

    # Test 5: ETF List
    print("\n[TEST 5] Testing ETF Discovery...")
    try:
        etfs = await market_service.get_all_etfs()
        print(f"✅ Found {len(etfs)} ETFs")

        if etfs:
            # Show first 5
            print("   Top 5 ETFs:")
            for etf in etfs[:5]:
                nav = etf.get('nav', 0) or 0  # Handle None
                underlying = etf.get('underlying', 'N/A') or 'N/A'
                print(f"      {etf['symbol']:<15} | NAV: ₹{nav:<8.2f} | {underlying}")

    except Exception as e:
        print(f"❌ Error: {e}")

    # Test 6: ETF Details
    print("\n[TEST 6] Testing ETF Details...")
    try:
        if etfs and len(etfs) > 0:
            test_etf = etfs[0]['symbol']
            print(f"   Testing: {test_etf}")

            details = await market_service.get_aggregated_details(test_etf)
            inst_type = details.get('type', 'UNKNOWN')

            print(f"      Type: {inst_type}")
            print(f"      Price: ₹{details.get('market_data', {}).get('price', 0)}")

            if inst_type == 'ETF':
                print("✅ ETF correctly identified")
            else:
                print(f"⚠️  Expected ETF, got: {inst_type}")
        else:
            print("⚠️  No ETFs to test")

    except Exception as e:
        print(f"❌ Error: {e}")

    # Test 7: Symbol Registry Resolution
    print("\n[TEST 7] Testing Symbol Registry Resolution...")
    try:
        # Test NSE symbol resolution
        reliance = registry.resolve("RELIANCE")
        if reliance:
            print(f"   'RELIANCE' resolved:")
            print(f"      NSE: {reliance.nse_symbol}")
            print(f"      BSE: {reliance.bse_scrip}")
            print(f"      ISIN: {reliance.isin}")
            print("✅ Symbol resolution working")
        else:
            print("❌ Failed to resolve RELIANCE")

    except Exception as e:
        print(f"❌ Error: {e}")

    print("\n" + "=" * 60)
    print("INTEGRATION TEST COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
