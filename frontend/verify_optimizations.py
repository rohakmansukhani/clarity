import requests
import json

BASE_URL = "http://localhost:8000/api/v1"
FRONTEND_URL = "http://localhost:3000"

def test_backend_status():
    try:
        r = requests.get(f"{BASE_URL}/market/status")
        if r.status_code == 200:
            print("✅ Backend Status: OK")
        else:
            print(f"❌ Backend Status Failed: {r.status_code}")
    except Exception as e:
        print(f"❌ Backend is DOWN: {e}")

def test_search_optimization():
    try:
        r = requests.get(f"{BASE_URL}/stocks/search", params={"q": "RELIANCE"})
        if r.status_code == 200:
            data = r.json()
            if len(data) > 0 and data[0]['symbol'] == 'RELIANCE':
                print("✅ Search Optimization: OK (Found RELIANCE)")
            else:
                print("⚠️ Search Optimization: OK but RELIANCE not top result")
        else:
            print(f"❌ Search Failed: {r.status_code}")
    except Exception as e:
        print(f"❌ Search Error: {e}")

def test_backtest_refactor():
    try:
        payload = {
            "ticker": "RELIANCE",
            "date": "2024-01-01",
            "investment_amount": 100000
        }
        r = requests.post(f"{BASE_URL}/market/backtest", json=payload)
        if r.status_code == 200:
            data = r.json()
            if "pnl" in data and "history" in data:
                print("✅ Backtest Refactor: OK")
            else:
                print("❌ Backtest Refactor: Missing keys")
        else:
            print(f"❌ Backtest Failed: {r.status_code} - {r.text}")
    except Exception as e:
        print(f"❌ Backtest Error: {e}")

def test_frontend():
    try:
        r = requests.get(FRONTEND_URL)
        if r.status_code == 200:
            print("✅ Frontend: OK (Server reachable)")
        else:
            print(f"❌ Frontend Error: {r.status_code}")
    except Exception as e:
        print(f"❌ Frontend Unreachable: {e}")

if __name__ == "__main__":
    print("--- Verifying Optimizations ---")
    test_backend_status()
    test_search_optimization()
    test_backtest_refactor()
    test_frontend()
