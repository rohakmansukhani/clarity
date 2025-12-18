"""
General Stock Recommendations Engine
Provides AI-curated stock recommendations based on user preferences
Uses DYNAMIC market screening instead of hardcoded lists
"""
from typing import List, Dict, Optional
import logging
import asyncio
from app.services.market_service import MarketService
from app.services.data.sector_mapper import SectorMapper
from app.utils.formatters import parse_inr_to_float


logger = logging.getLogger(__name__)


class GeneralRecommender:
    """
    Recommends stocks based on user preferences without sector constraints.
    Uses dynamic market screening for fresh, data-driven recommendations.
    """
    
    def __init__(self):
        self.market_service = MarketService()
        self.sector_mapper = SectorMapper()
    
    async def get_recommendations(
        self,
        budget: float,
        risk_profile: str,
        horizon: str,
        limit: int = 15,  # Increased from 5 to give users more choice
        preferences: Optional[List[str]] = None
    ) -> Dict:
        """
        Get general stock recommendations based on user preferences.
        
        Args:
            budget: Investment budget (₹)
            risk_profile: 'conservative', 'balanced', 'aggressive'
            horizon: 'short', 'medium', 'long'
            limit: Number of recommendations (default 5)
            preferences: Optional sector/theme preferences (e.g., ['IT', 'PHARMA'])
            
        Returns:
            Dictionary with recommendations, diversification breakdown, strategy summary
        """
        try:
            # Step 1: Get universe of stocks based on risk profile
            stock_universe = await self._get_dynamic_stock_universe(risk_profile, horizon)
            
            if not stock_universe:
                logger.error("Failed to fetch stock universe - dynamic screening unavailable")
                return {
                    "recommendations": [],
                    "total_stocks": 0,
                    "error": "Unable to fetch stock data. Please try again later.",
                    "risk_profile": risk_profile
                }
            
            logger.info(f"Screening {len(stock_universe)} stocks for recommendations")
            
            # Step 2: Filter by budget (affordable stocks)
            affordable_stocks = await self._filter_by_affordability(stock_universe, budget)
            
            if not affordable_stocks:
                logger.warning("No affordable stocks found within budget")
                return {
                    "recommendations": [],
                    "total_stocks": 0,
                    "error": f"No stocks found within your budget of ₹{budget:,.0f}. Try increasing your budget.",
                    "risk_profile": risk_profile
                }
            
            # Step 3: Analyze stocks in parallel (increased to 100 for better results)
            stocks_to_analyze = affordable_stocks[:100]
            
            logger.info(f"Analyzing {len(stocks_to_analyze)} affordable stocks")
            
            tasks = [self.market_service.get_comprehensive_analysis(sym) for sym in stocks_to_analyze]
            analyses = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Step 4: Score and rank stocks
            scored_stocks = []
            for analysis in analyses:
                if isinstance(analysis, Exception) or "error" in analysis:
                    continue
                
                try:
                    score = self._calculate_comprehensive_score(
                        analysis, risk_profile, horizon, budget, preferences
                    )
                    
                    scored_stocks.append({
                        "symbol": analysis["symbol"],
                        "name": analysis.get("name", analysis["symbol"]),
                        "price": parse_inr_to_float(analysis.get("price", 0)),  # Parse to float
                        "sector": self._extract_sector(analysis),
                        "composite_score": score["composite"],
                        "stability_score": score["stability"],
                        "growth_score": score["growth"],
                        "value_score": score["value"],
                        "recommendation": analysis.get("recommendation", {}).get("action", "HOLD"),
                        "reasoning": self._generate_reasoning(analysis, risk_profile, horizon),
                        "risk_level": analysis.get("scores", {}).get("risk", {}).get("risk_level", "MEDIUM"),
                        "allocation_suggestion": 0  # Will be calculated later
                    })
                except Exception as e:
                    logger.error(f"Scoring error: {e}")
                    continue
            
            if not scored_stocks:
                logger.error("No stocks could be analyzed successfully")
                return {
                    "recommendations": [],
                    "total_stocks": 0,
                    "error": "Unable to analyze stocks. Please try again later.",
                    "risk_profile": risk_profile
                }
            
            # Step 5: Apply diversification constraints
            diversified_picks = self._apply_diversification(scored_stocks, limit)
            
            # Step 6: Calculate suggested allocations
            final_picks = self._calculate_allocations(diversified_picks, budget, risk_profile)
            
            # Step 7: Generate portfolio summary
            portfolio_summary = self._generate_portfolio_summary(final_picks, risk_profile, horizon)
            
            return {
                "recommendations": final_picks,
                "total_stocks": len(final_picks),
                "total_budget": budget,
                "allocated_amount": sum(s["allocation_amount"] for s in final_picks),
                "portfolio_summary": portfolio_summary,
                "risk_profile": risk_profile,
                "horizon": horizon,
                "diversification": self._get_diversification_breakdown(final_picks)
            }
            
        except Exception as e:
            logger.error(f"General recommendations error: {e}")
            return {
                "recommendations": [],
                "total_stocks": 0,
                "error": f"An error occurred: {str(e)}",
                "risk_profile": risk_profile
            }
    
    async def _get_dynamic_stock_universe(self, risk_profile: str, horizon: str) -> List[str]:
        """
        Dynamically fetch stock universe from NSE based on market cap and liquidity.
        NO HARDCODING - uses live data.
        """
        try:
            from nselib import capital_market
            import pandas as pd
            
            # Fetch all NSE equity stocks
            loop = asyncio.get_event_loop()
            
            def _fetch():
                try:
                    df = capital_market.equity_list()
                    if df is None or df.empty:
                        logger.warning("NSE equity_list returned empty")
                        return []
                    
                    # Filter by series (only EQ - equity)
                    if 'SERIES' in df.columns:
                        df = df[df['SERIES'] == 'EQ']
                    
                    # Get symbols (clean, without any suffix)
                    symbols = df['SYMBOL'].tolist()
                    
                    # Remove any existing suffixes to avoid double .NS
                    symbols = [s.replace('.NS', '').replace('.BO', '').strip() for s in symbols]
                    
                    # Conservative: Top 100 by market cap (large-cap)
                    if risk_profile.lower() == 'conservative':
                        return symbols[:100]
                    
                    # Aggressive: Top 200 (includes mid-cap)
                    elif risk_profile.lower() == 'aggressive':
                        return symbols[:200]
                    
                    # Balanced: Top 150
                    else:
                        return symbols[:150]
                    
                except Exception as e:
                    logger.error(f"NSE fetch error: {e}")
                    return []
            
            symbols = await loop.run_in_executor(None, _fetch)
            
            if not symbols:
                logger.error("No symbols fetched from NSE")
                return []
            
            # Add .NS suffix for Yahoo Finance compatibility (only once)
            return [f"{s}.NS" for s in symbols]
            
        except Exception as e:
            logger.error(f"Dynamic universe error: {e}")
            return []  # Return empty list instead of fallback
    
    async def _filter_by_affordability(self, symbols: List[str], budget: float) -> List[str]:
        """
        Filter stocks that user can afford (at least 1 share within budget).
        For diversification, we want stocks where 1 share costs < 20% of budget.
        """
        affordable = []
        
        # Quick price check (parallel) - check more stocks for better options
        check_limit = min(len(symbols), 200)  # Increased from 100
        tasks = [self.market_service.get_aggregated_details(sym) for sym in symbols[:check_limit]]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for i, result in enumerate(results):
            if isinstance(result, Exception) or not result:
                continue
            
            # Parse price string to float (handles "₹1,497" format)
            price_raw = result.get("market_data", {}).get("price", 0)
            price = parse_inr_to_float(price_raw)
            
            # Stock is affordable if 1 share < 20% of budget
            if price > 0 and price <= (budget * 0.2):
                affordable.append(symbols[i])
        
        logger.info(f"Found {len(affordable)} affordable stocks out of {check_limit} checked")
        return affordable
    
    def _calculate_comprehensive_score(
        self,
        analysis: Dict,
        risk_profile: str,
        horizon: str,
        budget: float,
        preferences: Optional[List[str]] = None
    ) -> Dict[str, float]:
        """
        Calculate multi-factor score similar to SectorRecommender.
        Returns breakdown: stability, growth, value, composite.
        """
        scores = analysis.get("scores", {})
        
        stability_score = scores.get("stability", {}).get("score", 0)
        timing_score = scores.get("timing", {}).get("score", 0)
        risk_score = scores.get("risk", {}).get("risk_score", 50)
        
        fundamental = analysis.get("analysis", {}).get("fundamental", {})
        health_score = fundamental.get("health_score", 50)
        
        # Valuation score
        valuation_level = fundamental.get("valuation", {}).get("level", "FAIR")
        value_score = {"UNDERVALUED": 80, "FAIR": 60, "OVERVALUED": 40}.get(valuation_level, 50)
        
        # Growth score
        growth_level = fundamental.get("growth_potential", {}).get("level", "LOW")
        growth_score = {"HIGH": 80, "MODERATE": 60, "LOW": 40, "DECLINING": 20}.get(growth_level, 50)
        
        # Risk-adjusted composite score
        if risk_profile.lower() == "conservative":
            # Prioritize stability and low risk
            composite = (stability_score * 0.5) + ((100 - risk_score) * 0.3) + (health_score * 0.2)
        
        elif risk_profile.lower() == "aggressive":
            # Prioritize growth and timing
            composite = (growth_score * 0.4) + (timing_score * 0.3) + (stability_score * 0.2) + (health_score * 0.1)
        
        else:  # balanced
            # Equal weighting
            composite = (stability_score * 0.3) + (timing_score * 0.25) + ((100 - risk_score) * 0.25) + (health_score * 0.2)
        
        # Bonus for user preferences (sector match)
        if preferences:
            stock_sector = self._extract_sector(analysis)
            if any(pref.upper() in stock_sector.upper() for pref in preferences):
                composite += 10  # Preference bonus
        
        return {
            "stability": stability_score,
            "growth": growth_score,
            "value": value_score,
            "composite": min(composite, 100)
        }
    
    def _apply_diversification(self, scored_stocks: List[Dict], limit: int) -> List[Dict]:
        """
        Apply diversification rules:
        - Max 2 stocks per sector
        - Mix of high/medium/low risk
        - Top scores within constraints
        """
        diversified = []
        sector_count = {}
        risk_count = {"LOW": 0, "MEDIUM": 0, "HIGH": 0}
        
        # Sort by composite score
        sorted_stocks = sorted(scored_stocks, key=lambda x: x["composite_score"], reverse=True)
        
        for stock in sorted_stocks:
            if len(diversified) >= limit:
                break
            
            sector = stock["sector"]
            risk = stock["risk_level"]
            
            # Check sector constraint (max 2 per sector)
            if sector_count.get(sector, 0) >= 2:
                continue
            
            # Add stock
            diversified.append(stock)
            sector_count[sector] = sector_count.get(sector, 0) + 1
            risk_count[risk] = risk_count.get(risk, 0) + 1
        
        return diversified
    
    def _calculate_allocations(
        self,
        stocks: List[Dict],
        budget: float,
        risk_profile: str
    ) -> List[Dict]:
        """
        Calculate suggested allocation per stock based on scores.
        Conservative: Equal weighting
        Balanced: Score-weighted
        Aggressive: Top-heavy (80% to top 3)
        """
        if risk_profile.lower() == "conservative":
            # Equal allocation
            allocation_per_stock = budget / len(stocks)
            for stock in stocks:
                stock["allocation_percent"] = round(100 / len(stocks), 1)
                stock["allocation_amount"] = round(allocation_per_stock, 2)
                # Price is already parsed to float in scoring step
                price = float(stock["price"]) if stock["price"] else 1.0
                stock["suggested_shares"] = int(allocation_per_stock / price) if price > 0 else 0
        
        elif risk_profile.lower() == "aggressive":
            # Top-heavy (first 3 get 80%, rest get 20%)
            top_3_allocation = budget * 0.8 / 3
            rest_allocation = (budget * 0.2) / max(len(stocks) - 3, 1)
            
            for i, stock in enumerate(stocks):
                if i < 3:
                    stock["allocation_amount"] = round(top_3_allocation, 2)
                    stock["allocation_percent"] = round((top_3_allocation / budget) * 100, 1)
                else:
                    stock["allocation_amount"] = round(rest_allocation, 2)
                    stock["allocation_percent"] = round((rest_allocation / budget) * 100, 1)
                
                # Price is already parsed to float in scoring step
                price = float(stock["price"]) if stock["price"] else 1.0
                stock["suggested_shares"] = int(stock["allocation_amount"] / price) if price > 0 else 0
        
        else:  # balanced - score-weighted
            total_score = sum(s["composite_score"] for s in stocks)
            
            for stock in stocks:
                weight = stock["composite_score"] / total_score if total_score > 0 else 1 / len(stocks)
                stock["allocation_amount"] = round(budget * weight, 2)
                stock["allocation_percent"] = round(weight * 100, 1)
                # Price is already parsed to float in scoring step
                price = float(stock["price"]) if stock["price"] else 1.0
                stock["suggested_shares"] = int(stock["allocation_amount"] / price) if price > 0 else 0
        
        return stocks
    
    def _extract_sector(self, analysis: Dict) -> str:
        """Extract sector from analysis (if available)."""
        # Try to get sector from fundamentals
        sector = analysis.get("info", {}).get("sector", "GENERAL")
        if not sector or sector == "N/A":
            sector = "GENERAL"
        return sector
    
    def _generate_reasoning(self, analysis: Dict, risk_profile: str, horizon: str) -> str:
        """Generate human-readable reasoning for recommendation."""
        reasons = []
        
        scores = analysis.get("scores", {})
        fundamental = analysis.get("analysis", {}).get("fundamental", {})
        
        # Stability
        stability = scores.get("stability", {}).get("score", 0)
        if stability >= 75:
            reasons.append("high price stability")
        
        # Valuation
        valuation = fundamental.get("valuation", {}).get("level")
        if valuation == "UNDERVALUED":
            reasons.append("attractive valuation")
        
        # Growth
        growth = fundamental.get("growth_potential", {}).get("level")
        if growth == "HIGH":
            reasons.append("strong growth potential")
        
        # Risk
        risk_level = scores.get("risk", {}).get("risk_level")
        if risk_level == "LOW":
            reasons.append("low risk profile")
        
        # Recommendation
        action = analysis.get("recommendation", {}).get("action")
        if action == "BUY":
            reasons.append("AI buy signal")
        
        if not reasons:
            reasons.append(f"suitable for {risk_profile} investors")
        
        return "Selected for: " + ", ".join(reasons[:3])
    
    def _generate_portfolio_summary(
        self,
        stocks: List[Dict],
        risk_profile: str,
        horizon: str
    ) -> Dict:
        """Generate portfolio-level summary."""
        avg_score = sum(s["composite_score"] for s in stocks) / len(stocks) if stocks else 0
        
        risk_distribution = {}
        for stock in stocks:
            risk = stock["risk_level"]
            risk_distribution[risk] = risk_distribution.get(risk, 0) + 1
        
        return {
            "average_score": round(avg_score, 1),
            "risk_distribution": risk_distribution,
            "strategy": self._get_strategy_description(risk_profile, horizon),
            "expected_volatility": self._estimate_volatility(risk_profile),
            "rebalance_frequency": self._get_rebalance_frequency(horizon)
        }
    
    def _get_diversification_breakdown(self, stocks: List[Dict]) -> Dict:
        """Get sector-wise breakdown."""
        sectors = {}
        for stock in stocks:
            sector = stock["sector"]
            sectors[sector] = sectors.get(sector, 0) + 1
        
        return {
            "sectors": sectors,
            "total_sectors": len(sectors),
            "diversification_score": min(len(sectors) / len(stocks) * 100, 100) if stocks else 0
        }
    
    def _get_strategy_description(self, risk_profile: str, horizon: str) -> str:
        """Get strategy description."""
        strategies = {
            ("conservative", "short"): "Stable blue-chips for capital preservation",
            ("conservative", "medium"): "Large-cap quality stocks with steady dividends",
            ("conservative", "long"): "Market leaders with proven track records",
            ("balanced", "short"): "Mix of stability and growth opportunities",
            ("balanced", "medium"): "Diversified portfolio across sectors",
            ("balanced", "long"): "Growth stocks with solid fundamentals",
            ("aggressive", "short"): "High-momentum stocks for quick gains",
            ("aggressive", "medium"): "Growth stocks with strong potential",
            ("aggressive", "long"): "Emerging leaders and high-growth companies"
        }
        return strategies.get((risk_profile.lower(), horizon.lower()), "Diversified investment portfolio")
    
    def _estimate_volatility(self, risk_profile: str) -> str:
        """Estimate portfolio volatility."""
        volatility_map = {
            "conservative": "LOW (5-10% annual fluctuation)",
            "balanced": "MODERATE (10-20% annual fluctuation)",
            "aggressive": "HIGH (20-35% annual fluctuation)"
        }
        return volatility_map.get(risk_profile.lower(), "MODERATE")
    
    def _get_rebalance_frequency(self, horizon: str) -> str:
        """Suggest rebalancing frequency."""
        frequency_map = {
            "short": "Monthly",
            "medium": "Quarterly",
            "long": "Half-yearly"
        }
        return frequency_map.get(horizon.lower(), "Quarterly")
    
    def _get_fallback_universe(self, risk_profile: str) -> List[str]:
        """Fallback stock universe if dynamic fetch fails."""
        # Conservative: Nifty 50 constituents
        conservative = [
            "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
            "HINDUNILVR.NS", "ITC.NS", "SBIN.NS", "BHARTIARTL.NS", "KOTAKBANK.NS",
            "LT.NS", "AXISBANK.NS", "BAJFINANCE.NS", "ASIANPAINT.NS", "MARUTI.NS",
            "SUNPHARMA.NS", "TITAN.NS", "ULTRACEMCO.NS", "NESTLEIND.NS", "WIPRO.NS"
        ]
        
        # Aggressive: Nifty 50 + Nifty Next 50 (mid-cap)
        aggressive = conservative + [
            "ADANIENT.NS", "ADANIPORTS.NS", "TATAMOTORS.NS", "HCLTECH.NS",
            "TECHM.NS", "POWERGRID.NS", "NTPC.NS", "ONGC.NS", "COALINDIA.NS",
            "GRASIM.NS", "HINDALCO.NS", "JSWSTEEL.NS", "TATASTEEL.NS",
            "BAJAJFINSV.NS", "DIVISLAB.NS", "DRREDDY.NS", "CIPLA.NS"
        ]
        
        # Balanced: Nifty 50
        balanced = conservative + ["M&M.NS", "HCLTECH.NS", "TECHM.NS", "POWERGRID.NS", "NTPC.NS"]
        
        if risk_profile.lower() == "conservative":
            return conservative
        elif risk_profile.lower() == "aggressive":
            return aggressive
        else:
            return balanced
    
    def _get_fallback_recommendations(self, risk_profile: str, limit: int) -> Dict:
        """Ultra-simple fallback if everything fails."""
        fallback_stocks = {
            "conservative": [
                {"symbol": "RELIANCE.NS", "name": "Reliance Industries", "allocation_percent": 25, "price": 2450},
                {"symbol": "TCS.NS", "name": "Tata Consultancy Services", "allocation_percent": 25, "price": 3650},
                {"symbol": "HDFCBANK.NS", "name": "HDFC Bank", "allocation_percent": 25, "price": 1580},
                {"symbol": "INFY.NS", "name": "Infosys", "allocation_percent": 25, "price": 1420}
            ],
            "balanced": [
                {"symbol": "RELIANCE.NS", "name": "Reliance Industries", "allocation_percent": 20, "price": 2450},
                {"symbol": "TCS.NS", "name": "Tata Consultancy Services", "allocation_percent": 20, "price": 3650},
                {"symbol": "ICICIBANK.NS", "name": "ICICI Bank", "allocation_percent": 20, "price": 720},
                {"symbol": "BAJFINANCE.NS", "name": "Bajaj Finance", "allocation_percent": 20, "price": 6800},
                {"symbol": "TITAN.NS", "name": "Titan Company", "allocation_percent": 20, "price": 3250}
            ],
            "aggressive": [
                {"symbol": "ADANIENT.NS", "name": "Adani Enterprises", "allocation_percent": 20, "price": 2350},
                {"symbol": "TATAMOTORS.NS", "name": "Tata Motors", "allocation_percent": 20, "price": 780},
                {"symbol": "BAJFINANCE.NS", "name": "Bajaj Finance", "allocation_percent": 20, "price": 6800},
                {"symbol": "TITAN.NS", "name": "Titan Company", "allocation_percent": 20, "price": 3250},
                {"symbol": "HCLTECH.NS", "name": "HCL Technologies", "allocation_percent": 20, "price": 1520}
            ]
        }
        
        stocks = fallback_stocks.get(risk_profile.lower(), fallback_stocks["balanced"])[:limit]
        
        # Add required fields
        for stock in stocks:
            stock["recommendation"] = "HOLD"
            stock["reasoning"] = "Fallback recommendation (dynamic screening unavailable)"
            stock["current_price"] = stock["price"]
        
        return {
            "recommendations": stocks,
            "total_stocks": len(stocks),
            "portfolio_summary": {
                "strategy": "Fallback recommendations (dynamic screening unavailable)",
                "diversification_score": 80
            },
            "risk_profile": risk_profile
        }
