
import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.services.data.sector_mapper import SectorMapper
from app.services.ai_service import AIService

async def test_sector_fallback():
    print("\n--- Testing Sector Mapper Fallback ---")
    mapper = SectorMapper()
    
    # Test internal method directly to bypass Redis cache requirement of public method
    print("Testing _scrape_nse_index_constituents('NIFTY AUTO')...")
    stocks = mapper._scrape_nse_index_constituents("NIFTY AUTO")
    
    if stocks and "MARUTI" in stocks:
        print(f"✅ Sector Fallback works! Found {len(stocks)} stocks including MARUTI.")
    else:
        print(f"❌ Sector Fallback failed. Stocks found: {stocks}")
        sys.exit(1)

async def test_ai_service_init():
    print("\n--- Testing AI Service Init ---")
    try:
        ai = AIService()
        # Check if tools are loaded
        if len(ai.tools) > 0:
            print(f"✅ AI Service initialized with {len(ai.tools)} tools.")
        else:
            print("❌ AI Service tools missing.")
            sys.exit(1)
    except Exception as e:
        print(f"❌ AI Service Init failed: {e}")
        sys.exit(1)

async def main():
    await test_sector_fallback()
    await test_ai_service_init()
    print("\n--- Round 2 Verification Passed ---")

if __name__ == "__main__":
    asyncio.run(main())
