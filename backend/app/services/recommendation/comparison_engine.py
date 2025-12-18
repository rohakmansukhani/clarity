import logging
import asyncio
from typing import List, Dict, Any
from app.services.market_service import MarketService

logger = logging.getLogger(__name__)

class ComparisonEngine:
    """
    Compares multiple stocks side-by-side using standardized metrics.
    """
    
    def __init__(self):
        self.market_service = MarketService()
    
    async def compare_stocks(self, symbols: List[str]) -> Dict[str, Any]:
        """
        Compare a list of stocks.
        """
        try:
            # Limit to 5 stocks for performance
            symbols = symbols[:5]
            
            # Fetch analysis in parallel
            tasks = [self.market_service.get_comprehensive_analysis(sym) for sym in symbols]
            analyses = await asyncio.gather(*tasks, return_exceptions=True)
            
            comparison_data = {}
            valid_analyses = []
            
            for i, result in enumerate(analyses):
                if isinstance(result, Exception) or "error" in result:
                    continue
                
                sym = symbols[i]
                valid_analyses.append(result)
                
                # Extract key metrics for comparison
                scores = result.get("scores", {})
                stability = scores.get("stability", {})
                timing = scores.get("timing", {})
                risk = scores.get("risk", {})
                fundamental = result.get("analysis", {}).get("fundamental", {})
                
                # Extract fundamentals
                fundamentals = result.get("raw_data", {}).get("fundamentals", {})
                
                # Calculate equity to debt ratio (useful for calculations even if not displayed)
                debt_to_equity = fundamentals.get("debt_to_equity", "N/A")
                equity_to_debt = "N/A"
                if isinstance(debt_to_equity, (int, float)) and debt_to_equity > 0:
                    equity_to_debt = round(1 / debt_to_equity, 2)
                
                comparison_data[sym] = {
                    "price": result.get("price"),
                    "composite_score": result.get("recommendation", {}).get("composite_score", 0),
                    "action": result.get("recommendation", {}).get("action", "HOLD"),
                    "stability_score": stability.get("score", 0),
                    "stability_label": stability.get("interpretation", "N/A"),
                    "timing_score": timing.get("score", 0),
                    "timing_signal": timing.get("signal", "NEUTRAL"),
                    "risk_score": risk.get("risk_score", 50),
                    "risk_level": risk.get("risk_level", "MEDIUM"),
                    "valuation": fundamental.get("valuation", {}).get("level", "FAIR"),
                    "health_score": fundamental.get("health_score", 50),
                    # Add fundamental metrics
                    "market_cap": fundamentals.get("market_cap", "N/A"),
                    "pe_ratio": fundamentals.get("pe", fundamentals.get("pe_ratio", "N/A")),
                    "roe": fundamentals.get("roe", "N/A"),
                    "debt_to_equity": debt_to_equity,
                    "equity_to_debt": equity_to_debt,  # Keep for calculations
                    "dividend_yield": fundamentals.get("dividend_yield", "N/A")
                }
            
            if not comparison_data:
                return {"error": "Could not compare stocks"}
            
            # Determine winners
            winners = self._determine_winners(valid_analyses, comparison_data)
            
            return {
                "comparison": comparison_data,
                "winners": winners,
                "summary": self._generate_summary(winners, comparison_data)
            }
            
        except Exception as e:
            logger.error(f"Comparison Error: {e}")
            return {"error": str(e)}
    
    def _determine_winners(self, analyses: List[dict], data: dict) -> Dict[str, str]:
        """Identify best stock for each category."""
        winners = {}
        
        try:
            # Best Overall (Composite Score)
            winners["best_overall"] = max(data.items(), key=lambda x: x[1]['composite_score'])[0]
            
            # Most Stable
            winners["most_stable"] = max(data.items(), key=lambda x: x[1]['stability_score'])[0]
            
            # Best Value (Lowest Risk Score for now as proxy, or check valuation)
            # Actually, let's use the one with 'UNDERVALUED' or highest health score if tied
            undervalued = [k for k, v in data.items() if v['valuation'] == 'UNDERVALUED']
            if undervalued:
                winners["best_value"] = max(undervalued, key=lambda k: data[k]['health_score'])
            else:
                 winners["best_value"] = max(data.items(), key=lambda x: x[1]['health_score'])[0]

            # Lowest Risk
            winners["lowest_risk"] = min(data.items(), key=lambda x: x[1]['risk_score'])[0]
            
            # Best Equity to Debt (highest ratio = better financial health)
            equity_to_debt_stocks = [(k, v['equity_to_debt']) for k, v in data.items() if isinstance(v['equity_to_debt'], (int, float))]
            if equity_to_debt_stocks:
                winners["best_equity_to_debt"] = max(equity_to_debt_stocks, key=lambda x: x[1])[0]
            
            return winners
        except Exception as e:
            logger.error(f"Winner calc error: {e}")
            return {}

    def _generate_summary(self, winners: dict, data: dict) -> str:
        """Generate a detailed text summary of the comparison."""
        best = winners.get('best_overall')
        if not best:
            return "Unable to generate summary."
        
        best_data = data[best]
        action = best_data['action']
        score = best_data['composite_score']
        valuation = best_data['valuation']
        risk = best_data['risk_level']
        
        # Build comprehensive summary
        summary_parts = []
        
        # Main recommendation
        summary_parts.append(
            f"{best} is the top pick with a {action} rating and composite score of {score:.1f}/100. "
            f"It's currently {valuation.lower()} with {risk.lower()} risk."
        )
        
        # Stability insight
        most_stable = winners.get('most_stable')
        if most_stable and most_stable != best:
            stable_score = data[most_stable]['stability_score']
            summary_parts.append(
                f"{most_stable} offers the highest stability (score: {stable_score:.1f}), "
                f"making it ideal for conservative investors."
            )
        
        # Value insight
        best_value = winners.get('best_value')
        if best_value:
            value_valuation = data[best_value]['valuation']
            if value_valuation == 'UNDERVALUED':
                summary_parts.append(
                    f"{best_value} presents the best value opportunity, currently undervalued."
                )
        
        # Risk insight
        lowest_risk = winners.get('lowest_risk')
        if lowest_risk and lowest_risk != best:
            risk_score = data[lowest_risk]['risk_score']
            summary_parts.append(
                f"{lowest_risk} has the lowest risk profile (risk score: {risk_score:.1f})."
            )
        
        return " ".join(summary_parts)
