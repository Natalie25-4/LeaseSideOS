from app.clauses.extract import extract_clause
from app.clauses.models import Segment
from app.clauses.provider import RegexProvider, StubProvider

SEG = Segment(
    page_number=1, char_start=0, char_end=60, number="3.1", heading="Rent",
    text="The Tenant shall pay the annual rent of $145,000.00 plus GST.",
)


def test_rejects_a_fabricated_quote():
    """The hallucination guard. A model can return a fluent quote that does
    not appear in the document; storing one would mean asserting something
    about a legal document that nobody can verify."""
    liar = StubProvider({"RentClause": {"found": True, "quote": "the annual rent of $999,999.00"}})
    assert extract_clause(SEG, "rent", liar) is None


def test_accepts_a_verified_quote():
    honest = StubProvider({"RentClause": {"found": True, "quote": "the annual rent of $145,000.00"}})
    assert extract_clause(SEG, "rent", honest) is not None


def test_returns_none_when_provider_finds_nothing():
    assert extract_clause(SEG, "rent", StubProvider({})) is None


def test_falls_back_to_the_segment_clause_number():
    honest = StubProvider({"RentClause": {"found": True, "quote": "the annual rent of $145,000.00"}})
    assert extract_clause(SEG, "rent", honest).clause_reference == "3.1"


def test_regex_provider_finds_the_rent():
    result = extract_clause(SEG, "rent", RegexProvider())
    assert result is not None
    assert "145,000.00" in result.quote