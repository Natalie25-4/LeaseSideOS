import re

from .models import Segment

# A line that starts a new clause: optional indent, a number like 3 or 3.1 or
# 3.1.2, then whitespace, then something else on the same line.
CLAUSE_START = re.compile(r"^[ \t]*(\d+(?:\.\d+)*)[.)]?[ \t]+(\S.*)$")

# Longest a trailing fragment can be and still count as a heading rather than
# the body of the clause.
MAX_HEADING_LEN = 60

# Cap for fallback segments on pages with no clause numbering.
MAX_FALLBACK_CHARS = 1500


def _looks_like_heading(rest: str) -> bool:
    """'Rent' is a heading. 'The Tenant shall pay...' is not."""
    if len(rest) > MAX_HEADING_LEN:
        return False
    if rest.rstrip().endswith((".", ";", ":")):
        return False
    words = rest.split()
    if not words or len(words) > 8:
        return False
    return rest.istitle() or rest.isupper()


def _is_clause_number(number: str, rest: str) -> bool:
    """Reject wrapped body text that happens to begin with a number.

    "412 square metres of net lettable area" is not clause 412.
    """
    parts = number.split(".")
    if int(parts[0]) > 99:
        return False
    # A bare number (no dot) only starts a clause if what follows is a heading.
    if len(parts) == 1 and not _looks_like_heading(rest):
        return False
    return True


def _split_page(page_number: int, text: str) -> list[Segment]:
    lines = text.splitlines(keepends=True)

    # (offset_of_line, number, rest_of_line)
    starts: list[tuple[int, str, str]] = []
    offset = 0
    for line in lines:
        m = CLAUSE_START.match(line)
        if m and _is_clause_number(m.group(1), m.group(2).strip()):
            starts.append((offset, m.group(1), m.group(2).strip()))
        offset += len(line)

    if not starts:
        return _split_fallback(page_number, text)

    segments: list[Segment] = []

    # Anything before the first numbered line is its own unnumbered segment.
    if starts[0][0] > 0:
        head = text[: starts[0][0]]
        if head.strip():
            segments.append(
                Segment(page_number, 0, starts[0][0], None, None, head)
            )

    for i, (start, number, rest) in enumerate(starts):
        end = starts[i + 1][0] if i + 1 < len(starts) else len(text)
        heading = rest if _looks_like_heading(rest) else None
        segments.append(
            Segment(page_number, start, end, number, heading, text[start:end])
        )

    return segments


def _split_fallback(page_number: int, text: str) -> list[Segment]:
    """No clause numbering on this page — split on blank lines, capped."""
    segments: list[Segment] = []
    offset = 0
    for block in re.split(r"(?<=\n)\s*\n", text):
        if not block:
            continue
        start = offset
        offset += len(block)
        if not block.strip():
            continue
        # Chop over-long blocks so a wall of text doesn't become one segment.
        for chunk_start in range(0, len(block), MAX_FALLBACK_CHARS):
            chunk = block[chunk_start : chunk_start + MAX_FALLBACK_CHARS]
            if chunk.strip():
                segments.append(
                    Segment(
                        page_number,
                        start + chunk_start,
                        start + chunk_start + len(chunk),
                        None,
                        None,
                        chunk,
                    )
                )
    return segments


def segment_pages(pages: list[tuple[int, str]]) -> list[Segment]:
    """Split each page into clause-level segments, preserving page and offsets."""
    out: list[Segment] = []
    for page_number, text in pages:
        out.extend(_split_page(page_number, text))
    return out