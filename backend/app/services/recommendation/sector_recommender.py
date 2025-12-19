import logging
import asyncio
from app.services.market_service import MarketService
from app.services.data.sector_mapper import SectorMapper

logger = logging.getLogger(__name__)

class SectorRecommender:
    """
    Research-backed sector recommendations using dynamic stock discovery.
    NO hardcoded mappings - all stocks discovered from live NSE data.
    """
    
    def __init__(self):
        self.market_service = MarketService()
        self.sector_mapper = SectorMapper()
    
    async def get_top_picks(self, sector_query: str, limit: int = 5, criteria: str = "balanced") -> dict:
        """
        Get top stock recommendations for a sector.
        
        Args:
            sector_query: Sector name or keyword (e.g., "AUTO", "aluminum", "pharma")
            limit: Number of recommendations to return (default 5)
            criteria: Ranking criteria - "balanced", "stability", "growth", "value"
        
        Returns:
            Dictionary with top picks and analysis
        """
        try:
            # Step 1: Discover stocks in sector
            sector_data = await self.sector_mapper.search_sector_by_keyword(sector_query)
            
            if not sector_data.get('stocks'):
                return {
                    "error": f"No stocks found for '{sector_query}'",
                    "suggestion": "Try: AUTO, IT, BANK, PHARMA, FMCG, METAL, ENERGY",
                    "available_sectors": self.sector_mapper.get_available_sectors()
                }
            
            stocks = sector_data['stocks']
            matched_sector = sector_data['matched_sector']
            
            logger.info(f"Analyzing {len(stocks)} stocks in {matched_sector} sector")
            
            # Step 2: Analyze stocks (limit to top 20 for performance)
            stocks_to_analyze = stocks[:20]
            
            # Use Semaphore to limit concurrency (Memory Safety)
            # Reduced from 5 -> 3 based on 500MB constraint
            sem = asyncio.Semaphore(3)
            
            import gc
            
            async def limited_analyze(symbol):
                async with sem:
                    try:
                        result = await self.market_service.get_comprehensive_analysis(symbol)
                        return result
                    finally:
                        # Force garbage collection after EACH stock to free DataFrame memory immediately
                        gc.collect()
            
            tasks = [limited_analyze(sym) for sym in stocks_to_analyze]
            analyses = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Step 3: Score and rank
            results = []
            for analysis in analyses:
                if isinstance(analysis, Exception):
                    logger.warning(f"Analysis failed: {analysis}")
                    continue
                
                if "error" in analysis:
                    logger.warning(f"Analysis error for {analysis.get('symbol')}: {analysis['error']}")
                    continue
                
                try:
                    scored_stock = self._score_stock(analysis, criteria)
                    results.append(scored_stock)
                except Exception as e:
                    logger.error(f"Scoring error: {e}")
                    continue
            
            if not results:
                return {
                    "error": "Could not analyze stocks in this sector",
                    "sector": matched_sector,
                    "attempted": len(stocks_to_analyze)
                }
            
            # Step 4: Sort by composite score
            results.sort(key=lambda x: x['composite_score'], reverse=True)
            
            # Step 5: Generate sector overview
            sector_overview = self._generate_sector_overview(results)
            
            return {
                "sector": matched_sector,
                "query": sector_query,
                "top_picks": results[:limit],
                "total_analyzed": len(results),
                "total_in_sector": len(stocks),
                "sector_overview": sector_overview,
                "ranking_criteria": criteria
            }
            
        except Exception as e:
            logger.error(f"Sector Recommender Error: {e}")
            return {"error": str(e)}
    
    def _score_stock(self, analysis: dict, criteria: str) -> dict:
        """
        Calculate composite score based on criteria.
        """
        stability = analysis.get("scores", {}).get("stability", {}).get("score", 0)
        timing = analysis.get("scores", {}).get("timing", {}).get("score", 0)
        risk = analysis.get("scores", {}).get("risk", {}).get("risk_score", 50)
        
        fundamental = analysis.get("analysis", {}).get("fundamental", {})
        health_score = fundamental.get("health_score", 50)
        
        # ✅ FIXED: Weighted scoring based on criteria (matches test specification)
        if criteria == "stability":
            # Stability-focused: Prioritize low-risk, stable companies
            composite = (stability * 0.6) + ((100 - risk) * 0.3) + (health_score * 0.1)
            
        elif criteria == "growth":
            # Growth-focused: Prioritize timing signals and growth potential
            growth_level = fundamental.get("growth_potential", {}).get("level", "LOW")
            growth_bonus = {"HIGH": 30, "MODERATE": 15, "LOW": 0, "DECLINING": -20}.get(growth_level, 0)
            composite = (timing * 0.5) + (stability * 0.3) + ((100 - risk) * 0.2) + growth_bonus
            
        elif criteria == "value":
            # Value-focused: Prioritize undervalued companies with good fundamentals
            valuation_level = fundamental.get("valuation", {}).get("level", "FAIR")
            value_bonus = {"UNDERVALUED": 25, "FAIR": 10, "OVERVALUED": -15}.get(valuation_level, 0)
            composite = (health_score * 0.4) + (stability * 0.3) + ((100 - risk) * 0.3) + value_bonus
            
        else:  # balanced (DEFAULT)
            # ✅ CRITICAL FIX: Match test specification (40/30/30)
            composite = (stability * 0.4) + (timing * 0.3) + ((100 - risk) * 0.3)
        
        recommendation = analysis.get("recommendation", {})
        
        return {
            "symbol": analysis["symbol"],
            "name": analysis["symbol"],  # Would ideally fetch company name
            "price": analysis["price"],
            "price_raw": analysis.get("price_raw", 0),
            "composite_score": round(composite),
            "stability_score": stability,
            "timing_signal": analysis.get("scores", {}).get("timing", {}).get("signal"),
            "risk_level": analysis.get("scores", {}).get("risk", {}).get("risk_level"),
            "recommendation": recommendation.get("action", "HOLD"),
            "confidence": recommendation.get("confidence", "MEDIUM"),
            "reasoning": recommendation.get("reasoning", ""),
            "key_highlights": self._generate_highlights(analysis),
            "technical_signal": analysis.get("analysis", {}).get("technical", {}).get("signal", "NEUTRAL"),
            "fundamental_health": fundamental.get("valuation", {}).get("level", "FAIR"),
            "news_sentiment": analysis.get("analysis", {}).get("news", {}).get("sentiment", "NEUTRAL")
        }
    
    def _generate_highlights(self, analysis: dict) -> list:
        """Generate key highlights for a stock."""
        highlights = []
        
        scores = analysis.get("scores", {})
        analysis_data = analysis.get("analysis", {})
        
        # Stability
        stability_score = scores.get("stability", {}).get("score", 0)
        if stability_score >= 75:
            highlights.append(f"High stability ({stability_score}/100)")
        
        # Timing
        timing_signal = scores.get("timing", {}).get("signal")
        if timing_signal == "BUY":
            highlights.append("Strong buy signal")
        
        # Risk
        risk_level = scores.get("risk", {}).get("risk_level")
        if risk_level == "LOW":
            highlights.append("Low risk profile")
        
        # Fundamentals
        fund = analysis_data.get("fundamental", {})
        valuation = fund.get("valuation", {}).get("level")
        if valuation == "UNDERVALUED":
            highlights.append("Currently undervalued")
        
        # Growth
        growth = fund.get("growth_potential", {}).get("level")
        if growth == "HIGH":
            highlights.append("High growth potential")
        
        # News
        news_sentiment = analysis_data.get("news", {}).get("sentiment")
        if news_sentiment == "POSITIVE":
            highlights.append("Positive news sentiment")
        
        return highlights[:4]  # Top 4 highlights
    
    def _generate_sector_overview(self, results: list) -> dict:
        """Generate sector-level insights."""
        if not results:
            return {}
        
        # Average scores
        avg_stability = sum(r['stability_score'] for r in results) / len(results)
        avg_composite = sum(r['composite_score'] for r in results) / len(results)
        
        # Count recommendations
        buy_count = sum(1 for r in results if r['recommendation'] in ['BUY', 'STRONG BUY'])
        hold_count = sum(1 for r in results if r['recommendation'] == 'HOLD')
        
        # Sector health
        if avg_composite >= 70:
            health = "STRONG"
            outlook = "Positive sector outlook with multiple strong performers"
        elif avg_composite >= 55:
            health = "HEALTHY"
            outlook = "Stable sector with good opportunities"
        elif avg_composite >= 40:
            health = "MIXED"
            outlook = "Mixed signals - selective opportunities"
        else:
            health = "WEAK"
            outlook = "Sector facing challenges - caution advised"
        
        return {
            "sector_health": health,
            "outlook": outlook,
            "average_stability": round(avg_stability),
            "average_score": round(avg_composite),
            "buy_recommendations": buy_count,
            "hold_recommendations": hold_count,
            "total_stocks": len(results)
        }
