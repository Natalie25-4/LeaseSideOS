"""Turn quoted text into typed values.

Deterministic only — no model calls. Leases write the same value several ways
("ONE HUNDRED AND FORTY FIVE THOUSAND DOLLARS ($145,000.00)"), so the rule is:
prefer the numeral, ignore the words.
"""

import re
from datetime import date

MONTHS = {
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10, "november": 11,
    "december": 12,
}

_MONEY = re.compile(r"\$\s*([\d,]+(?:\.\d{1,2})?)")
_BARE_NUMBER = re.compile(r"\b(\d[\d,]{2,}(?:\.\d{1,2})?)\b")
_DATE = re.compile(
    r"\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:day\s+of\s+)?"
    r"(january|february|march|april|may|june|july|august|september|october|november|december)"
    r"\s+(\d{4})\b",
    re.IGNORECASE,
)
# "six (6) years" / "3 years" / "18 months" — prefer a parenthesised numeral.
_DURATION = re.compile(
    r"(?:\(\s*(\d+)\s*\)|\b(\d+)\b)\s*(year|month|week)s?\b", re.IGNORECASE
)
_PERCENT = re.compile(r"(?:\(\s*)?(\d+(?:\.\d+)?)\s*(?:%|per\s*cent)", re.IGNORECASE)


def parse_money(text: str) -> float | None:
    """First dollar amount in the text, or a bare number if no $ sign."""
    if not text:
        return None
    m = _MONEY.search(text)
    if m:
        return float(m.group(1).replace(",", ""))
    m = _BARE_NUMBER.search(text)
    if m:
        return float(m.group(1).replace(",", ""))
    return None


def parse_all_money(text: str) -> list[float]:
    """Every dollar amount, in order. A rent clause often states annual and
    monthly figures for the same obligation."""
    return [float(v.replace(",", "")) for v in _MONEY.findall(text or "")]


def parse_date(text: str) -> date | None:
    if not text:
        return None
    m = _DATE.search(text)
    if not m:
        return None
    day, month, year = int(m.group(1)), MONTHS[m.group(2).lower()], int(m.group(3))
    try:
        return date(year, month, day)
    except ValueError:
        return None


def parse_all_dates(text: str) -> list[date]:
    out = []
    for day, month, year in _DATE.findall(text or ""):
        try:
            out.append(date(int(year), MONTHS[month.lower()], int(day)))
        except ValueError:
            continue
    return out


def parse_duration(text: str) -> dict | None:
    """{"years": 6} / {"months": 18}. Prefers the numeral in brackets."""
    if not text:
        return None
    m = _DURATION.search(text)
    if not m:
        return None
    value = int(m.group(1) or m.group(2))
    unit = m.group(3).lower() + "s"
    return {unit: value}


def parse_percent(text: str) -> float | None:
    if not text:
        return None
    m = _PERCENT.search(text)
    return float(m.group(1)) if m else None


def parse_gst(text: str) -> str | None:
    if not text:
        return None
    low = text.lower()
    if "plus gst" in low:
        return "plus_gst"
    if "including gst" in low or "inclusive of gst" in low:
        return "inclusive"
    return "unstated"


def parse_period(text: str) -> str | None:
    if not text:
        return None
    low = text.lower()
    if "annual" in low or "per annum" in low or "yearly" in low:
        return "annual"
    if "monthly" in low or "per month" in low or "calendar month" in low:
        return "monthly"
    if "weekly" in low or "per week" in low:
        return "weekly"
    return None


# "two (2) rights of renewal" — a count, not a duration. Needs its own rule
# because parse_duration deliberately requires a time unit after the number.
_RENEWAL_COUNT = re.compile(
    r"(?:\(\s*(\d+)\s*\)|\b(\d+)\b)\s*(?:further\s+)?(?:rights?|terms?)\s+of\s+renewal",
    re.IGNORECASE,
)


def parse_renewal_count(text: str) -> int | None:
    if not text:
        return None
    m = _RENEWAL_COUNT.search(text)
    if not m:
        return None
    return int(m.group(1) or m.group(2))