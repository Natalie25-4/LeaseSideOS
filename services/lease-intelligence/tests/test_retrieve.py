import pytest

from app.clauses.retrieve import is_section_marker, shortlist

EXPECTED_TOP = {
    "rent": "3.1",
    "term": "2.1",
    "outgoings": "5.1",
    "permitted_use": "6.1",
}


@pytest.mark.parametrize("clause_type,expected", EXPECTED_TOP.items())
def test_top_candidate_is_the_right_clause(segments, clause_type, expected):
    hits = shortlist(segments, clause_type)
    assert hits, f"no candidates for {clause_type}"
    assert hits[0].number == expected


def test_correct_clause_is_always_somewhere_in_the_shortlist(segments):
    """Renewal ranks 2.3 above 2.2 — keyword frequency cannot tell a clause
    that GRANTS a right from one that merely REFERS to it. The granting
    clause must still be retrievable, because the pipeline tries each
    candidate in turn."""
    numbers = [s.number for s in shortlist(segments, "renewal")]
    assert "2.2" in numbers


def test_section_markers_are_excluded(segments):
    """'4. RENT REVIEW' carries the heading but none of the substance."""
    for clause_type in ("rent_review", "outgoings", "permitted_use"):
        for hit in shortlist(segments, clause_type):
            assert not is_section_marker(hit)


def test_zero_scoring_segments_are_not_returned(segments):
    """Better to return nothing than hand the model an irrelevant passage."""
    from app.clauses.retrieve import score
    for hit in shortlist(segments, "rent"):
        assert score(hit, "rent") > 0


def test_unknown_clause_type_returns_nothing(segments):
    assert shortlist(segments, "does_not_exist") == []