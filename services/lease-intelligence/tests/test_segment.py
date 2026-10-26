from app.clauses.segment import segment_pages

SYNTHETIC = """1. DEFINITIONS
In this lease the following terms apply.

2.1 Rent
The Tenant shall pay the annual rent of $145,000.00 plus GST.

2.2 Outgoings
The Tenant shall pay its proportion of outgoings."""


def test_splits_on_clause_numbers():
    segs = segment_pages([(1, SYNTHETIC)])
    assert [s.number for s in segs] == ["1", "2.1", "2.2"]


def test_detects_headings():
    segs = segment_pages([(1, SYNTHETIC)])
    assert segs[0].heading == "DEFINITIONS"
    assert segs[1].heading == "Rent"


def test_offsets_are_truthful_on_synthetic():
    for s in segment_pages([(1, SYNTHETIC)]):
        assert SYNTHETIC[s.char_start:s.char_end] == s.text


def test_offsets_are_truthful_on_every_real_page(pages, segments):
    by_page = dict(pages)
    for s in segments:
        assert by_page[s.page_number][s.char_start:s.char_end] == s.text, (
            f"offset mismatch on page {s.page_number} clause {s.number}"
        )


def test_segments_do_not_overlap_within_a_page(segments):
    for page in {s.page_number for s in segments}:
        spans = sorted(
            (s.char_start, s.char_end) for s in segments if s.page_number == page
        )
        for (_, end), (next_start, _) in zip(spans, spans[1:]):
            assert next_start >= end, f"overlapping segments on page {page}"


def test_wrapped_numbers_are_not_treated_as_clauses(segments):
    """'412 square metres of net lettable area' is not clause 412."""
    numbers = [s.number for s in segments if s.number]
    assert all(int(n.split(".")[0]) <= 99 for n in numbers)
    assert "412" not in numbers


def test_finds_all_top_level_headings(segments):
    headings = [s.heading for s in segments if s.heading]
    assert "RENT" in headings
    assert "TERM" in headings
    assert "QUIET ENJOYMENT" in headings
    assert len(headings) == 12


def test_page_with_no_numbering_falls_back_to_paragraphs():
    text = "A wall of prose.\n\nAnother paragraph entirely.\n\nAnd a third."
    segs = segment_pages([(1, text)])
    assert len(segs) >= 2
    assert all(s.number is None for s in segs)