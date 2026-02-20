from jinja2 import Environment, FileSystemLoader, select_autoescape
import os
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

class EmailTemplateService:
    _env = None

    @classmethod
    def get_env(cls):
        if cls._env is None:
            # Base directory for templates
            template_dir = os.path.join(os.path.dirname(__file__), "email_templates")
            cls._env = Environment(
                loader=FileSystemLoader(template_dir),
                autoescape=select_autoescape(['html', 'xml'])
            )
        return cls._env

    @classmethod
    def render_alert(cls, context: Dict[str, Any]) -> str:
        """
        Renders the alert triggered email template.
        """
        try:
            template = cls.get_env().get_template("alert_triggered.html")
            
            # Default values for safety
            defaults = {
                "ticker": "STOCK",
                "trigger_title": "Alert Triggered",
                "current_price": "0.00",
                "initial_price": "0.00",
                "percent_change": "0.0",
                "technical_analysis": None,
                "fundamental_analysis": None,
                "tech_signal": "NEUTRAL",
                "tech_class": "signal-neutral",
                "expert_notes": "",
                "action_url": "https://clarity-invest.vercel.app/portfolio"
            }
            
            # Merge context with defaults
            full_context = {**defaults, **context}
            
            # Map technical signal to classes
            signal = full_context.get("tech_signal", "").upper()
            if "STRONG BUY" in signal or "BULLISH" in signal:
                full_context["tech_class"] = "signal-strong-buy"
            elif "STRONG SELL" in signal or "BEARISH" in signal:
                full_context["tech_class"] = "signal-strong-sell"
            elif "BUY" in signal:
                full_context["tech_class"] = "signal-buy"
            elif "SELL" in signal:
                full_context["tech_class"] = "signal-sell"
            else:
                full_context["tech_class"] = "signal-neutral"

            return template.render(**full_context)
        except Exception as e:
            logger.error(f"Error rendering alert email template: {e}")
            # Fallback to simple text if rendering fails
            return f"Alert triggered for {context.get('ticker')}. Current price: {context.get('current_price')}."
