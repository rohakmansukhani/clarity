from nselib.libutil import nse_urlfetch
import json

try:
    response = nse_urlfetch("https://www.nseindia.com/api/etf")
    if response.status_code == 200:
        data = response.json()
        print(f"Number of ETFs: len(data.get('data', [])) = {len(data.get('data', []))}")
        if 'data' in data and len(data['data']) > 0:
            print("First ETF extracted keys:", list(data['data'][0].keys()))
            print("First ETF:", json.dumps({k: data['data'][0][k] for k in ['symbol', 'companyName', 'lastPrice']}, indent=2))
        else:
            print(data)
    else:
        print(f"Failed with {response.status_code}")
except Exception as e:
    print(e)
