import asyncio
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "."))

from app.services.consensus_engine import ConsensusEngine

async def main():
    print("Initializing Consensus Engine...")
    engine = ConsensusEngine()
    
    symbol = "SBIN"
    print(f"Fetching Consensus for {symbol}...")
    
    result = await engine.get_consensus_price(symbol)
    
    print("\n--- CONSENSUS RESULT ---")
    print(f"Final Price: {result['price']}")
    print(f"Status:      {result['status']}")
    print(f"Variance:    {result['variance_pct']}%")
    print("Sources:")
    for source, price in result['sources'].items():
        print(f"  - {source}: {price}")

if __name__ == "__main__":
    asyncio.run(main())
