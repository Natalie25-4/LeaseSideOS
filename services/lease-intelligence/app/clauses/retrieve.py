from .keywords import HEADING_HINTS, HEADING_WEIGHT, KEYWORDS
from .models import Segment

# A segment with less body than this is a section marker ("4. RENT REVIEW"),
# not a clause. It carries the heading but none of the substance, so it must
# not outrank the sub-clause that actually states the terms.
MIN_BODY_CHARS = 80


def is_section_marker(segment: Segment) -> bool:
    body = segment.text.strip()
    if segment.heading:
        body = body.replace(segment.heading, "", 1)
    # Drop the leading clause number too.
    if segment.number:
        body = body.replace(segment.number, "", 1)
    return len(body.strip()) < MIN_BODY_CHARS


def score(segment: Segment, clause_type: str) -> int:
    """How strongly this segment looks like the given clause type."""
    text = segment.text.lower()
    total = sum(1 for kw in KEYWORDS.get(clause_type, []) if kw.lower() in text)

    heading = (segment.heading or "").lower()
    if heading:
        for hint in HEADING_HINTS.get(clause_type, []):
            if hint.lower() in heading:
                total += HEADING_WEIGHT
                break

    return total


def shortlist(segments: list[Segment], clause_type: str, top_n: int = 3) -> list[Segment]:
    """The top N segments that look like this clause type, best first.

    Segments scoring zero are excluded — better to return nothing than to
    hand the model an irrelevant passage and invite a fabricated answer.
    """
    candidates = [s for s in segments if not is_section_marker(s)]
    scored = [(score(s, clause_type), i, s) for i, s in enumerate(candidates)]
    hits = [(sc, i, s) for sc, i, s in scored if sc > 0]
    hits.sort(key=lambda t: (-t[0], t[1]))   # score desc, document order as tiebreak
    return [s for _, _, s in hits[:top_n]]