"""Quote verification — the hallucination guard.

A model can return a fluent, plausible quote that does not appear in the
document. Storing one would mean asserting something about a legal document
that nobody can check. So every quote is verified against its source before
it goes anywhere, and the span is recorded so a person can click straight to
the passage.

Comparison is whitespace-insensitive: pdftotext leaves column padding and
line breaks inside sentences, so a faithful quote is often not a literal
substring of the source.
"""

import re

_WS = re.compile(r"\s+")


def normalise(s: str) -> str:
    return _WS.sub(" ", s).strip().lower()


def quote_is_real(quote: str, source: str) -> bool:
    """True if the quote appears in the source, ignoring whitespace and case."""
    if not quote or not quote.strip():
        return False
    return normalise(quote) in normalise(source)


def _normalised_with_map(source: str) -> tuple[str, list[int]]:
    """Normalise source, keeping the original index of each surviving character.

    Returns (normalised_text, index_map) where index_map[i] is the offset in
    `source` of the character at position i in `normalised_text`.
    """
    out: list[str] = []
    index_map: list[int] = []
    prev_space = True          # leading whitespace is dropped
    for i, ch in enumerate(source):
        if ch.isspace():
            if prev_space:
                continue
            out.append(" ")
            index_map.append(i)
            prev_space = True
        else:
            out.append(ch.lower())
            index_map.append(i)
            prev_space = False
    # Drop a trailing space so it matches normalise()
    while out and out[-1] == " ":
        out.pop()
        index_map.pop()
    return "".join(out), index_map


def quote_offsets(quote: str, source: str) -> tuple[int, int] | None:
    """Character span of the quote within the ORIGINAL source, or None.

    The span is inclusive of the first matched character and exclusive of the
    character after the last, so source[start:end] recovers the passage.
    """
    needle = normalise(quote)
    if not needle:
        return None

    haystack, index_map = _normalised_with_map(source)
    pos = haystack.find(needle)
    if pos == -1:
        return None

    start = index_map[pos]
    end = index_map[pos + len(needle) - 1] + 1
    return start, end