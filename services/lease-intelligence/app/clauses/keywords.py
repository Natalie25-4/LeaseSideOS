"""Search terms per clause type.

Legal documents are formulaic, so keyword matching performs far better here
than it would on ordinary prose. Measure this before reaching for embeddings.
"""

KEYWORDS: dict[str, list[str]] = {
    "rent": [
        "annual rent", "rent payable", "monthly instalments", "plus GST",
        "rent of", "shall pay to the landlord", "in advance",
    ],
    "term": [
        "term of", "commencing on", "expiring on", "commencement date",
        "expiry date", "final expiry", "sooner determined",
    ],
    "renewal": [
        "right of renewal", "rights of renewal", "further term",
        "renew this lease", "renewal date", "exercises a right of renewal",
    ],
    "rent_review": [
        "rent review", "market rent", "consumers price index", "cpi",
        "review date", "shall be reviewed", "registered valuer",
    ],
    "outgoings": [
        "outgoings", "operating expenses", "tenant's proportion",
        "proportion of", "body corporate levies", "rates and levies",
    ],
    "permitted_use": [
        "permitted use", "shall use the premises", "use of the premises",
        "for no other purpose", "business use",
    ],
}

HEADING_HINTS: dict[str, list[str]] = {
    "rent":          ["rent"],
    "term":          ["term"],
    "renewal":       ["renewal"],
    "rent_review":   ["rent review"],
    "outgoings":     ["outgoings"],
    "permitted_use": ["permitted use", "use"],
}

# A heading match is worth this many keyword hits.
HEADING_WEIGHT = 3