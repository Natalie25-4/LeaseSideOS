from datetime import date

import pytest

from app.clauses.classify import extract_effective_date, extract_executed_date
from app.clauses.fixtures import load_fixture
from app.clauses.pipeline import run
from app.clauses.position import SourceDocument, resolve

AS_AT_2028 = date(2028, 1, 1)


def _doc(fixtures_dir, name, doc_type, doc_id, **kw):
    pages = load_fixture(str(fixtures_dir / name))
    return SourceDocument(
        document_id=doc_id,
        document_type=doc_type,
        clauses=run(pages),
        effective_date=kw.pop("effective_date", extract_effective_date(pages)),
        executed_date=kw.pop("executed_date", extract_executed_date(pages)),
        **kw,
    )


@pytest.fixture(scope="module")
def lease(fixtures_dir):
    return _doc(fixtures_dir, "lease_01.txt", "lease", "lease", effective_date=date(2024, 4, 1))


@pytest.fixture(scope="module")
def rent_2026(fixtures_dir):
    return _doc(fixtures_dir, "dov_rent_2026.txt", "deed_of_variation", "dov-rent-2026")


@pytest.fixture(scope="module")
def rent_2027(fixtures_dir):
    return _doc(fixtures_dir, "dov_rent_2027.txt", "deed_of_variation", "dov-rent-2027")


@pytest.fixture(scope="module")
def term_2026(fixtures_dir):
    return _doc(fixtures_dir, "dov_term_2026.txt", "deed_of_variation", "dov-term-2026")


def _rent(resolution):
    return resolution.value("rent")[0]["extracted_value"]["amount"]


# --- one variation, correct override -------------------------------------

def test_variation_overrides_the_original_rent(lease, rent_2027):
    r = resolve([lease, rent_2027], as_at=AS_AT_2028)
    assert _rent(r) == 160000.0
    assert r.clauses["rent"].source_document_type == "deed_of_variation"


def test_variation_does_not_touch_clauses_it_is_silent_about(lease, rent_2027):
    """THE critical one. A rent-only variation must leave every other clause
    exactly as the head lease stated. A naive 'newest document wins'
    implementation wipes these out."""
    r = resolve([lease, rent_2027], as_at=AS_AT_2028)
    for clause_type in ("term", "renewal", "rent_review", "outgoings", "permitted_use"):
        assert r.clauses[clause_type].source_document_id == "lease", clause_type
    assert r.value("term")[0]["extracted_value"]["expiry"] == "2030-03-31"


def test_original_clause_is_retained_not_deleted(lease, rent_2027):
    superseded = resolve([lease, rent_2027], as_at=AS_AT_2028).clauses["rent"].superseded
    assert len(superseded) == 1
    assert superseded[0]["extracted_value"]["amount"] == 145000.0


def test_current_value_reports_its_source(lease, rent_2027):
    r = resolve([lease, rent_2027], as_at=AS_AT_2028)
    assert r.clauses["rent"].source_document_id == "dov-rent-2027"
    assert r.clauses["rent"].effective_from == date(2027, 4, 1)


# --- multiple amendments, correct precedence -----------------------------

def test_latest_variation_wins(lease, rent_2026, rent_2027):
    r = resolve([lease, rent_2026, rent_2027], as_at=AS_AT_2028)
    assert _rent(r) == 160000.0


def test_full_supersession_chain_is_preserved_oldest_first(lease, rent_2026, rent_2027):
    r = resolve([lease, rent_2026, rent_2027], as_at=AS_AT_2028)
    amounts = [c["extracted_value"]["amount"] for c in r.clauses["rent"].superseded]
    assert amounts == [145000.0, 155000.0]


def test_two_variations_touching_different_clauses_both_apply(lease, rent_2027, term_2026):
    """2026 deed varies the term, 2027 deed varies the rent. Both must show."""
    r = resolve([lease, term_2026, rent_2027], as_at=AS_AT_2028)
    assert _rent(r) == 160000.0
    assert r.value("term")[0]["extracted_value"]["expiry"] == "2035-03-31"
    assert r.clauses["term"].source_document_id == "dov-term-2026"
    assert r.clauses["rent"].source_document_id == "dov-rent-2027"


def test_upload_order_does_not_affect_the_result(lease, rent_2026, rent_2027, term_2026):
    """Variations are routinely scanned and uploaded out of order."""
    forwards = resolve([lease, rent_2026, term_2026, rent_2027], as_at=AS_AT_2028)
    backwards = resolve([rent_2027, term_2026, rent_2026, lease], as_at=AS_AT_2028)
    assert _rent(forwards) == _rent(backwards)
    assert forwards.documents_applied == backwards.documents_applied


def test_ordering_is_by_effective_date_not_execution_date(lease):
    """Signed later, effective earlier. Effective date must win."""
    early_effect = SourceDocument(
        "signed-late", "deed_of_variation",
        clauses=[{"clause_type": "rent", "extracted_value": {"amount": 1.0}}],
        effective_date=date(2025, 1, 1), executed_date=date(2027, 12, 1),
    )
    late_effect = SourceDocument(
        "signed-early", "deed_of_variation",
        clauses=[{"clause_type": "rent", "extracted_value": {"amount": 2.0}}],
        effective_date=date(2026, 1, 1), executed_date=date(2024, 12, 1),
    )
    r = resolve([lease, early_effect, late_effect], as_at=AS_AT_2028)
    assert _rent(r) == 2.0


def test_same_effective_date_resolves_deterministically(lease):
    a = SourceDocument("dov-a", "deed_of_variation",
                       clauses=[{"clause_type": "rent", "extracted_value": {"amount": 10.0}}],
                       effective_date=date(2026, 4, 1), executed_date=date(2026, 1, 1))
    b = SourceDocument("dov-b", "deed_of_variation",
                       clauses=[{"clause_type": "rent", "extracted_value": {"amount": 20.0}}],
                       effective_date=date(2026, 4, 1), executed_date=date(2026, 1, 1))
    first = resolve([lease, a, b], as_at=AS_AT_2028)
    second = resolve([lease, b, a], as_at=AS_AT_2028)
    assert _rent(first) == _rent(second)
    assert any("share effective date" in w for w in first.warnings)


# --- as-at behaviour ------------------------------------------------------

def test_future_dated_variation_is_excluded(lease, rent_2027):
    r = resolve([lease, rent_2027], as_at=date(2026, 1, 1))
    assert _rent(r) == 145000.0
    assert "dov-rent-2027" not in r.documents_applied


def test_future_dated_variation_applies_at_its_effective_date(lease, rent_2027):
    assert _rent(resolve([lease, rent_2027], as_at=date(2027, 3, 31))) == 145000.0
    assert _rent(resolve([lease, rent_2027], as_at=date(2027, 4, 1))) == 160000.0


def test_as_at_before_any_variation_returns_the_original(lease, rent_2026, rent_2027):
    r = resolve([lease, rent_2026, rent_2027], as_at=date(2025, 1, 1))
    assert _rent(r) == 145000.0
    assert r.documents_applied == ["lease"]


# --- safety ---------------------------------------------------------------

def test_unconfirmed_link_is_excluded(lease, fixtures_dir):
    """An unconfirmed guess must never change a rent figure."""
    unconfirmed = _doc(fixtures_dir, "dov_rent_2027.txt", "deed_of_variation",
                       "dov-unconfirmed", link_status="suggested")
    r = resolve([lease, unconfirmed], as_at=AS_AT_2028)
    assert _rent(r) == 145000.0
    assert ("dov-unconfirmed", "link_status=suggested") in r.documents_excluded


def test_variation_with_no_effective_date_is_excluded_and_warned(lease):
    orphan = SourceDocument(
        "dov-undated", "deed_of_variation",
        clauses=[{"clause_type": "rent", "extracted_value": {"amount": 999.0}}],
        effective_date=None,
    )
    r = resolve([lease, orphan], as_at=AS_AT_2028)
    assert _rent(r) == 145000.0
    assert any("no effective date" in w for w in r.warnings)


def test_variation_with_no_clauses_changes_nothing_but_is_recorded(lease):
    empty = SourceDocument("dov-empty", "deed_of_variation", clauses=[],
                           effective_date=date(2026, 4, 1))
    r = resolve([lease, empty], as_at=AS_AT_2028)
    assert _rent(r) == 145000.0
    assert "dov-empty" in r.documents_applied
    assert any("no clauses were extracted" in w for w in r.warnings)


def test_variation_before_lease_commencement_is_flagged(lease):
    early = SourceDocument(
        "dov-too-early", "deed_of_variation",
        clauses=[{"clause_type": "rent", "extracted_value": {"amount": 1.0}}],
        effective_date=date(2023, 1, 1),
    )
    r = resolve([lease, early], as_at=AS_AT_2028)
    assert any("precedes lease commencement" in w for w in r.warnings)


def test_resolution_does_not_mutate_the_input(lease, rent_2027):
    before = lease.clauses[0]["extracted_value"].copy()
    resolve([lease, rent_2027], as_at=AS_AT_2028)
    assert lease.clauses[0]["extracted_value"] == before


def test_lease_alone_resolves_to_itself(lease):
    r = resolve([lease], as_at=AS_AT_2028)
    assert _rent(r) == 145000.0
    assert r.clauses["rent"].superseded == []
    assert r.warnings == []
