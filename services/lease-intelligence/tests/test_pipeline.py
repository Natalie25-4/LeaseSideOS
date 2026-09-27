import pytest

from app.clauses.pipeline import run
from app.clauses.provider import RegexProvider


@pytest.fixture(scope="module")
def records(pages):
    return run(pages, RegexProvider())


def test_finds_every_tier_one_clause_type(records):
    found = {r["clause_type"] for r in records}
    assert found == {
        "rent", "term", "renewal", "rent_review", "outgoings", "permitted_use",
    }


def test_every_record_carries_provenance(records):
    """A clause with no verifiable source is worse than no clause at all —
    it looks authoritative and cannot be checked."""
    for r in records:
        assert r["source_text"]
        assert r["page_number"] >= 1
        assert r["char_start"] is not None
        assert r["char_end"] > r["char_start"]


def test_spans_point_at_the_quoted_text(pages, records):
    by_page = dict(pages)
    for r in records:
        span = by_page[r["page_number"]][r["char_start"]:r["char_end"]]
        # Whitespace differs (the quote is normalised), so compare words.
        assert span.split()[:4] == r["source_text"].split()[:4], r["clause_type"]


def test_every_record_records_how_it_was_produced(records):
    for r in records:
        assert r["model_name"]
        assert r["prompt_version"]
        assert 0.0 <= r["confidence"] <= 1.0


def test_rent_is_extracted_correctly(records):
    rent = next(r for r in records if r["clause_type"] == "rent")
    assert rent["clause_reference"] == "3.1"
    assert rent["extracted_value"]["amount"] == 145000.0
    assert rent["extracted_value"]["period"] == "annual"
    assert rent["extracted_value"]["gst_treatment"] == "plus_gst"


def test_term_captures_both_dates(records):
    """The regex originally stopped at the first year, losing the expiry."""
    term = next(r for r in records if r["clause_type"] == "term")
    assert term["extracted_value"]["commencement"] == "2024-04-01"
    assert term["extracted_value"]["expiry"] == "2030-03-31"
    assert term["extracted_value"]["duration"] == {"years": 6}


def test_renewal_finds_the_granting_clause(records):
    renewal = next(r for r in records if r["clause_type"] == "renewal")
    assert renewal["clause_reference"] == "2.2"
    assert renewal["extracted_value"]["renewal_count"] == 2
    assert renewal["extracted_value"]["renewal_term"] == {"years": 3}


def test_outgoings_proportion_survives_the_decimal_point(records):
    """'being 23.4%' truncated at '23' while the sentence pattern treated a
    decimal point as a full stop."""
    out = next(r for r in records if r["clause_type"] == "outgoings")
    assert out["extracted_value"]["tenant_proportion"] == 23.4


def test_rent_review_returns_every_relevant_clause(records):
    """Rent review is split across three clauses: when (4.1), how during the
    term (4.2), and how on renewal (4.3). No single clause is the answer."""
    reviews = [r for r in records if r["clause_type"] == "rent_review"]
    assert len(reviews) == 3
    refs = {r["clause_reference"] for r in reviews}
    assert refs == {"4.1", "4.2", "4.3"}
    mechanisms = {r["extracted_value"]["mechanism"] for r in reviews}
    assert "cpi" in mechanisms and "market" in mechanisms


def test_one_failing_clause_type_does_not_abort_the_run(pages):
    class Exploding(RegexProvider):
        name = "exploding"

        def complete(self, system, user, schema):
            if schema.__name__ == "RentClause":
                raise RuntimeError("boom")
            return super().complete(system, user, schema)

    records = run(pages, Exploding())
    found = {r["clause_type"] for r in records}
    assert "rent" not in found
    assert "term" in found


def test_types_argument_limits_the_run(pages):
    records = run(pages, RegexProvider(), types=["rent"])
    assert {r["clause_type"] for r in records} == {"rent"}