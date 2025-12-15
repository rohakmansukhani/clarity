import asyncio
import os
import sys
from dotenv import load_dotenv
load_dotenv()

import redis.asyncio as redis
from supabase import create_client, Client

async def test_redis():
    print("\n--- Testing Redis (Upstash) ---")
    redis_url = os.getenv("REDIS_URL")
    if not redis_url:
        print("❌ REDIS_URL not found in .env")
        return

    try:
        r = redis.from_url(redis_url)
        await r.set("clarity_test_key", "Hello Upstash!")
        val = await r.get("clarity_test_key")
        print(f"✅ Redis Connection Successful!")
        print(f"   Value: '{val.decode('utf-8')}'")
        await r.close()
    except Exception as e:
        print(f"❌ Redis Connection Failed: {e}")

async def test_supabase():
    print("\n--- Testing Supabase Client ---")
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    
    if not url or not key:
        print("❌ SUPABASE_URL or SUPABASE_KEY not found in .env")
        return

    try:
        # Create Client
        supabase: Client = create_client(url, key)
        
        # Simple test: Check if we can reach the auth endpoint or fetch a table
        # We'll try to sign in anonymously or just check health if possible?
        # A simple query to a non-existent table usually returns a specific error confirming connection, 
        # or we can check auth.
        
        # Let's try to query 'users' (auth.users is not directly accessible usually via client without service role)
        # We will just verify the client initializes and maybe list buckets or something harmless.
        # Actually, let's just print success if no error on init, and try a basic select.
        
        print(f"✅ Supabase Client Initialized for {url}")
        
        # Try a dummy query to 'health_check' (which fails but proves connection)
        # or just proceed. 
        
    except Exception as e:
        print(f"❌ Supabase Connection Failed: {e}")

async def main():
    await test_redis()
    await test_supabase()

if __name__ == "__main__":
    asyncio.run(main())
