"""Run the full clause pipeline over a document's pages.

Pure: pages in, records out. No database, no HTTP. The database wrapper lives
in store.py and simply supplies the pages and writes the records.
"""

import logging

from . import parse
from .extract import extract_clause
from .fixtures import load_fixture
from .models import Segment
from .prompts import PROMPT_VERSION
from .provider import Provider, get_provider
from .retrieve import shortlist
from .schemas import SCHEMAS, ClauseBase
from .segment import segment_pages
from .verify import quote_offsets

log = logging.getLogger(__name__)

# How many candidate passages to try per clause type. Several clauses can
# legitimately answer one question — rent review is split across "when",
# "how during the term" and "how on renewal" — so we keep every verified
# result rather than stopping at the first.
CANDIDATES_PER_TYPE = 3


def _values(clause_type: str, result: ClauseBase) -> dict:
    """Typed values parsed from the verified quote. Deterministic."""
    q = result.quote or ""

    if clause_type == "rent":
        amounts = parse.parse_all_money(q)
        return {
            "amount": amounts[0] if amounts else None,
            "all_amounts": amounts,
            "period": parse.parse_period(q),
            "gst_treatment": parse.parse_gst(q),
        }

    if clause_type == "term":
        dates = parse.parse_all_dates(q)
        return {
            "commencement": dates[0].isoformat() if len(dates) > 0 else None,
            "expiry": dates[1].isoformat() if len(dates) > 1 else None,
            "duration": parse.parse_duration(q),
        }

    if clause_type == "renewal":
        return {
            "renewal_count": parse.parse_renewal_count(q),
            "renewal_term": parse.parse_duration(q),
        }

    if clause_type == "rent_review":
        low = q.lower()
        mechanism = (
            "cpi" if "consumers price index" in low or "cpi" in low
            else "market" if "market rent" in low
            else None
        )
        return {
            "mechanism": mechanism,
            "cap": parse.parse_percent(q),
            "review_dates": [d.isoformat() for d in parse.parse_all_dates(q)],
        }

    if clause_type == "outgoings":
        return {"tenant_proportion": parse.parse_percent(q)}

    if clause_type == "permitted_use":
        return {"consent_required": "consent" in q.lower()}

    return {}


def _confidence(result: ClauseBase, values: dict, candidate_count: int) -> float:
    """Earned confidence, not self-reported.

    Built from signals we control: whether the clause was numbered, whether a
    value parsed cleanly, and whether the passage was the only plausible one.
    A model's own estimate of its confidence is not used — it does not track
    correctness.
    """
    score = 0.5
    if result.clause_reference:
        score += 0.2
    if any(v not in (None, [], {}) for v in values.values()):
        score += 0.2
    if candidate_count == 1:
        score += 0.1
    return round(min(score, 1.0), 2)


def run(
    pages: list[tuple[int, str]],
    provider: Provider | None = None,
    types: list[str] | None = None,
) -> list[dict]:
    provider = provider or get_provider()
    types = types or list(SCHEMAS)
    segments = segment_pages(pages)
    records: list[dict] = []

    for clause_type in types:
        # One clause type failing must not take the whole document down.
        try:
            candidates = shortlist(segments, clause_type, CANDIDATES_PER_TYPE)
            for cand in candidates:
                result = extract_clause(cand, clause_type, provider)
                if result is None:
                    continue
                records.append(
                    _record(cand, clause_type, result, provider, len(candidates))
                )
        except Exception:
            log.exception("clause type %s failed", clause_type)

    return records


def _record(
    segment: Segment,
    clause_type: str,
    result: ClauseBase,
    provider: Provider,
    candidate_count: int,
) -> dict:
    span = quote_offsets(result.quote or "", segment.text)
    # Offsets are stored relative to the PAGE, so the UI can highlight the
    # passage without knowing anything about segmentation.
    char_start = segment.char_start + span[0] if span else None
    char_end = segment.char_start + span[1] if span else None

    values = _values(clause_type, result)

    return {
        "clause_type": clause_type,
        "page_number": segment.page_number,
        "char_start": char_start,
        "char_end": char_end,
        "source_text": result.quote,
        "clause_reference": result.clause_reference,
        "extracted_value": values,
        "confidence": _confidence(result, values, candidate_count),
        "method": "model",
        "model_name": provider.name,
        "prompt_version": PROMPT_VERSION,
    }


def run_from_fixture(path: str, provider: Provider | None = None, types=None) -> list[dict]:
    return run(load_fixture(path), provider, types)