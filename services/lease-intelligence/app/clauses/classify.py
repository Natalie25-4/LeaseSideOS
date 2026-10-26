"""Recognise what a document is, and when it takes effect.

A deed of variation announces itself in its title and states its own
effective date. Both are needed before resolution can order anything.
"""

import re
from datetime import date

from .parse import parse_date

# Checked against the opening pages only — a head lease often *mentions*
# variations in its boilerplate, which would otherwise look like a match.
PAGES_TO_INSPECT = 2

TYPE_PATTERNS: list[tuple[str, str]] = [
    ("deed_of_variation", r"deed\s+of\s+variation"),
    ("deed_of_variation", r"variation\s+of\s+lease"),
    ("deed_of_variation", r"the\s+lease\s+is\s+varied"),
    ("renewal",           r"deed\s+of\s+renewal"),
    ("renewal",           r"renewal\s+of\s+lease"),
    ("assignment",        r"deed\s+of\s+assignment"),
    ("surrender",         r"deed\s+of\s+surrender"),
    ("side_letter",       r"\bside\s+letter\b"),
    ("lease",             r"deed\s+of\s+lease"),
    ("lease",             r"\bagreement\s+to\s+lease\b"),
]

# Ordered: an explicit "effect from" beats a bare "Variation Date means".
EFFECTIVE_DATE_PATTERNS = [
    r"takes?\s+effect\s+on\s+and\s+from\s+([^.,;\"\)]+)",
    r"with\s+effect\s+(?:on\s+and\s+)?from\s+([^.,;\"\)]+)",
    r"shall\s+take\s+effect\s+on\s+([^.,;\"\)]+)",
    r"effective\s+(?:on\s+and\s+)?from\s+([^.,;\"\)]+)",
    r"variation\s+date\s*[\"”]?\s*means\s+([^.,;\"\)]+)",
]

EXECUTED_DATE_PATTERNS = [
    r"this\s+deed\s+is\s+made\s+on\s+(?:the\s+)?([^.,;\"\)]+)",
    r"dated\s+(?:this\s+)?([^.,;\"\)]+)",
]

LEASE_REFERENCE = re.compile(r"\b([A-Z]{2,4}-\d{4}-\d{2,5})\b")


def _head(pages: list[tuple[int, str]], n: int = PAGES_TO_INSPECT) -> str:
    return "\n".join(text for _, text in pages[:n])


def classify_document(pages: list[tuple[int, str]]) -> tuple[str, float]:
    """(document_type, confidence). Unrecognised documents are 'other'.

    Confidence is low by design — this decides how a document is treated,
    so an uncertain classification should reach a human, not a pipeline.
    """
    head = _head(pages).lower()
    for doc_type, pattern in TYPE_PATTERNS:
        m = re.search(pattern, head, re.IGNORECASE)
        if not m:
            continue
        # A title near the very top is far stronger evidence than a passing
        # reference buried in the recitals.
        confidence = 0.9 if m.start() < 200 else 0.6
        return doc_type, confidence
    return "other", 0.0


def extract_effective_date(pages: list[tuple[int, str]]) -> date | None:
    """When the document's terms begin to apply.

    NOT the date it was signed. Variations are routinely backdated, and
    ordering by the wrong date produces the wrong contractual position.
    Returns None rather than guessing — an unordered variation must reach
    a human.
    """
    head = _head(pages)
    for pattern in EFFECTIVE_DATE_PATTERNS:
        for m in re.finditer(pattern, head, re.IGNORECASE):
            parsed = parse_date(m.group(1))
            if parsed:
                return parsed
    return None


def extract_executed_date(pages: list[tuple[int, str]]) -> date | None:
    """When the document was signed. Used only to break ties."""
    head = _head(pages)
    for pattern in EXECUTED_DATE_PATTERNS:
        for m in re.finditer(pattern, head, re.IGNORECASE):
            parsed = parse_date(m.group(1))
            if parsed:
                return parsed
    return None


def suggest_lease_reference(pages: list[tuple[int, str]]) -> str | None:
    """The head lease reference this document quotes, if any.

    A suggestion only. Linking a variation to the wrong lease corrupts the
    contractual position of two leases at once, so a human confirms.
    """
    m = LEASE_REFERENCE.search(_head(pages))
    return m.group(1) if m else None
