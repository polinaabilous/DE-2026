# Exercise 1 · Clean an amount
# Write clean_amount(text) for the rules in lesson 3: 
# - None or blank text → None; 
# - otherwise a finite, non-negative Decimal rounded  half-up to 2 places. 
# - Raise ValueError (with the text in the message) for anything else.

from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

CENT = Decimal("0.01")

def clean_amount(text: str | None) -> Decimal | None:
    if text is None or text.strip() == "":
        return None
    
    try:
        value = Decimal(text.strip())
        if not value.is_finite():
            raise ValueError(f"amount is not finite: {text!r}")
        value = value.quantize(CENT, rounding=ROUND_HALF_UP)
    except InvalidOperation:
        raise ValueError(f"amount is not a number: {text!r}")
    
    if value < 0:
        raise ValueError(f"amount must be >= 0: {text!r}")

    return value
        

assert clean_amount(None) is None
assert clean_amount("   ") is None
assert clean_amount(" 0.00 ") == Decimal("0.00")      # zero is valid!
assert str(clean_amount("25")) == "25.00"
assert clean_amount("19.995") == Decimal("20.00")
for bad in ["abc", "-5", "NaN", "1e999999999"]:
    try:
        clean_amount(bad)
    except ValueError:
        pass
    else:
        raise AssertionError(f"{bad!r} should be rejected")