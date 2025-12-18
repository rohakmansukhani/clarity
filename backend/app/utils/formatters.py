import re


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


def parse_inr_to_float(value) -> float:
    """
    Convert INR formatted string to float.
    
    Examples:
        "₹1,497" -> 1497.0
        "₹2.34 L" -> 234000.0
        "₹1.50 Cr" -> 15000000.0
        1497.5 -> 1497.5 (passthrough)
        None -> 0.0
    """
    if value is None:
        return 0.0
    
    # Already a number
    if isinstance(value, (int, float)):
        return float(value)
    
    # Convert to string
    value_str = str(value).strip()
    
    # Remove rupee symbol and whitespace
    value_str = value_str.replace('₹', '').replace(',', '').strip()
    
    # Handle Lakhs/Crores
    if 'Cr' in value_str or 'cr' in value_str:
        num = float(re.sub(r'[^\d.]', '', value_str))
        return num * 10000000  # 1 Crore = 1,00,00,000
    
    elif 'L' in value_str or 'l' in value_str:
        num = float(re.sub(r'[^\d.]', '', value_str))
        return num * 100000  # 1 Lakh = 1,00,000
    
    # Plain number
    try:
        return float(value_str)
    except ValueError:
        return 0.0


def format_percent(value: float, decimals: int = 2) -> str:
    """Format percentage with + or - sign."""
    sign = "+" if value >= 0 else ""
    return f"{sign}{value:.{decimals}f}%"
