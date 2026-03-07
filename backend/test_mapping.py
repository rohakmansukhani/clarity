from nselib import capital_market
from bse import BSE
import os

try:
    os.makedirs('bse_data', exist_ok=True)
    bse = BSE(download_folder='bse_data')
    bse_secs = bse.listSecurities()
    
    nse_df = capital_market.equity_list()
    nse_symbols = set(nse_df['SYMBOL'].tolist())
    
    bse_scrip_ids = {sec['scrip_id']: sec for sec in bse_secs if isinstance(sec, dict) and 'scrip_id' in sec}
    
    matches = nse_symbols.intersection(bse_scrip_ids.keys())
    print(f"Total NSE symbols: {len(nse_symbols)}")
    print(f"Total BSE scrip_ids: {len(bse_scrip_ids)}")
    print(f"Exact Matches: {len(matches)}")
    
    print("\nSample matches:")
    for sym in list(matches)[:5]:
        bse_info = bse_scrip_ids[sym]
        nse_info = nse_df[nse_df['SYMBOL'] == sym].iloc[0]
        print(f"NSE: {sym} ({nse_info['NAME OF COMPANY']}) <-> BSE: {bse_info['SCRIP_CD']} - {sym} ({bse_info['Scrip_Name']})")
        
except Exception as e:
    print(f"Error: {e}")
