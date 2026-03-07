import requests

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': '*/* ',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br'
}
session = requests.Session()
# NSE requires us to hit the main page first to get cookies
try:
    session.get("https://www.nseindia.com", headers=headers, timeout=5)
    url = "https://www.nseindia.com/api/etf"
    response = session.get(url, headers=headers, timeout=5)
    print("Status:", response.status_code)
    if response.status_code == 200:
        data = response.json()
        print("Keys:", data.keys())
        if 'data' in data:
            print(f"Number of ETFs: {len(data['data'])}")
            print("First ETF:", data['data'][0].get('symbol', 'unknown'))
except Exception as e:
    print(f"Error fetching: {e}")
