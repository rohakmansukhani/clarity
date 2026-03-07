from nselib import capital_market

try:
    nse_df = capital_market.equity_list()
    names = nse_df['NAME OF COMPANY'].str.upper()
    symbols = nse_df['SYMBOL'].str.upper()
    
    etf_mask = names.str.contains('ETF|BEES|FUND', regex=True) | symbols.str.contains('ETF|BEES|FUND', regex=True)
    etfs = nse_df[etf_mask]
    
    print(f"Total NSE ETFs found: {len(etfs)}")
    if not etfs.empty:
        print(etfs[['SYMBOL', 'NAME OF COMPANY']].head(10))
        
except Exception as e:
    print(e)
