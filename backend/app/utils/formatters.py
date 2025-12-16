def format_inr(amount: float) -> str:
    """
    Format amount in Indian Rupee notation.
    
    Examples:
        50000 -> ₹50,000
        100000 -> ₹1.00 L
        10000000 -> ₹1.00 Cr
        100000000 -> ₹10.00 Cr
    """
    if amount >= 10_000_000:  # Crore
        return f"₹{amount/10_000_000:.2f} Cr"
    elif amount >= 100_000:  # Lakh
        return f"₹{amount/100_000:.2f} L"
    else:
        return f"₹{amount:,.0f}"  # Thousand separator


def format_percent(value: float, decimals: int = 2) -> str:
    """Format percentage with + or - sign."""
    sign = "+" if value >= 0 else ""
    return f"{sign}{value:.{decimals}f}%"
