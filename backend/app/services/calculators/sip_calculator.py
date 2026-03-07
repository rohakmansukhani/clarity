from typing import Dict, Any

class SIPCalculator:
    """
    Financial Calculator for SIP and Lumpsum mutual fund investments.
    """
    
    @staticmethod
    def calculate_sip(monthly_amount: float, return_pct: float, tenure_years: int) -> Dict[str, Any]:
        """
        SIP Formula: M = P × ({[1 + i]^n – 1} / i) × (1 + i)
        
        Where:
        - M = Maturity amount
        - P = Monthly investment
        - i = Monthly rate (annual/12)
        - n = Number of months
        """
        months = tenure_years * 12
        monthly_rate = return_pct / 100 / 12

        if monthly_rate == 0:
            total_invested = monthly_amount * months
            return {
                "total_investment": total_invested,
                "maturity_value": total_invested,
                "wealth_gain": 0,
                "year_wise": []
            }

        maturity = monthly_amount * (
            ((1 + monthly_rate) ** months - 1) / monthly_rate
        ) * (1 + monthly_rate)

        total_invested = monthly_amount * months
        wealth_gain = maturity - total_invested
        
        # Calculate year-wise progression for visualizations
        year_wise = []
        current_invested = 0
        current_value = 0
        
        for year in range(1, tenure_years + 1):
            months_so_far = year * 12
            current_invested = monthly_amount * months_so_far
            current_value = monthly_amount * (
                ((1 + monthly_rate) ** months_so_far - 1) / monthly_rate
            ) * (1 + monthly_rate)
            
            year_wise.append({
                "year": year,
                "invested_amount": round(current_invested, 2),
                "wealth_gain": round(current_value - current_invested, 2),
                "total_value": round(current_value, 2)
            })

        return {
            "total_investment": round(total_invested, 2),
            "maturity_value": round(maturity, 2),
            "wealth_gain": round(wealth_gain, 2),
            "year_wise": year_wise
        }

    @staticmethod
    def calculate_lumpsum(amount: float, return_pct: float, tenure_years: int) -> Dict[str, Any]:
        """
        Lumpsum Formula: A = P(1 + r/100)^t
        """
        maturity = amount * ((1 + return_pct / 100) ** tenure_years)
        wealth_gain = maturity - amount
        
        # Calculate year-wise progression
        year_wise = []
        for year in range(1, tenure_years + 1):
            val = amount * ((1 + return_pct / 100) ** year)
            year_wise.append({
                "year": year,
                "invested_amount": round(amount, 2),
                "wealth_gain": round(val - amount, 2),
                "total_value": round(val, 2)
            })

        return {
            "total_investment": round(amount, 2),
            "maturity_value": round(maturity, 2),
            "wealth_gain": round(wealth_gain, 2),
            "year_wise": year_wise
        }
