import logging
from typing import List, Dict, Any
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class NewsAnalyzer:
    """
    Analyzes news sentiment and impact on stock.
    """
    
    def analyze(self, news_items: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze news sentiment and frequency.
        """
        try:
            if not news_items:
                return {
                    "sentiment": "NEUTRAL",
                    "score": 0,
                    "recent_count": 0,
                    "summary": "No recent news"
                }
            
            # Count news by sentiment (simple keyword matching)
            positive = 0
            negative = 0
            neutral = 0
            
            for item in news_items:
                title = item.get('title', '').lower()
                sentiment = self._classify_sentiment(title)
                
                if sentiment == 'POSITIVE':
                    positive += 1
                elif sentiment == 'NEGATIVE':
                    negative += 1
                else:
                    neutral += 1
            
            # Calculate sentiment score (-100 to +100)
            total = len(news_items)
            score = ((positive - negative) / total) * 100 if total > 0 else 0
            
            # Overall sentiment
            if score > 30:
                overall = "POSITIVE"
            elif score < -30:
                overall = "NEGATIVE"
            else:
                overall = "NEUTRAL"
            
            return {
                "sentiment": overall,
                "score": round(score),
                "recent_count": total,
                "breakdown": {
                    "positive": positive,
                    "negative": negative,
                    "neutral": neutral
                },
                "summary": self._generate_summary(overall, total)
            }
            
        except Exception as e:
            logger.error(f"News Analysis Error: {e}")
            return {"error": str(e)}
    
    def _classify_sentiment(self, title: str) -> str:
        """Simple keyword-based sentiment classification."""
        positive_keywords = ['surges', 'gains', 'profit', 'growth', 'beats', 'strong', 'record', 'boost', 'rise', 'up']
        negative_keywords = ['falls', 'drops', 'loss', 'decline', 'weak', 'miss', 'cut', 'down', 'concern', 'crisis']
        
        pos_count = sum(1 for word in positive_keywords if word in title)
        neg_count = sum(1 for word in negative_keywords if word in title)
        
        if pos_count > neg_count:
            return 'POSITIVE'
        elif neg_count > pos_count:
            return 'NEGATIVE'
        else:
            return 'NEUTRAL'
    
    def _generate_summary(self, sentiment: str, count: int) -> str:
        """Generate human-readable summary."""
        if count == 0:
            return "No recent news coverage"
        elif sentiment == "POSITIVE":
            return f"{count} recent positive developments"
        elif sentiment == "NEGATIVE":
            return f"{count} recent concerns reported"
        else:
            return f"{count} recent news items, mixed sentiment"
