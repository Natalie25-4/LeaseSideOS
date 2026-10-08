from datetime import date

import pytest

from app.clauses.classify import (
    classify_document,
    extract_effective_date,
    extract_executed_date,
    suggest_lease_reference,
)
from app.clauses.fixtures import load_fixture


@pytest.fixture(scope="module")
def lease(lease_path):
    return load_fixture(lease_path)


@pytest.fixture(scope="module")
def dov_rent_2027(fixtures_dir):
    return load_fixture(str(fixtures_dir / "dov_rent_2027.txt"))


def test_head_lease_is_classified_as_a_lease(lease):
    doc_type, confidence = classify_document(lease)
    assert doc_type == "lease"
    assert confidence >= 0.6


def test_deed_of_variation_is_recognised(dov_rent_2027):
    doc_type, confidence = classify_document(dov_rent_2027)
    assert doc_type == "deed_of_variation"
    assert confidence >= 0.6


def test_unrecognised_document_is_not_guessed():
    doc_type, confidence = classify_document([(1, "A shopping list.\nMilk\nBread")])
    assert doc_type == "other"
    assert confidence == 0.0


def test_effective_date_is_extracted(dov_rent_2027):
    assert extract_effective_date(dov_rent_2027) == date(2027, 4, 1)


def test_effective_date_is_not_the_execution_date(dov_rent_2027):
    """The deed was signed 20 February 2027 and takes effect 1 April 2027.
    Ordering by the signing date would place it wrongly."""
    assert extract_effective_date(dov_rent_2027) == date(2027, 4, 1)
    assert extract_executed_date(dov_rent_2027) == date(2027, 2, 20)


def test_missing_effective_date_returns_none_rather_than_guessing():
    pages = [(1, "DEED OF VARIATION\n\nThis deed varies the lease.")]
    assert extract_effective_date(pages) is None


def test_lease_reference_is_suggested(dov_rent_2027):
    assert suggest_lease_reference(dov_rent_2027) == "LS-2024-014"


def test_no_reference_returns_none():
    assert suggest_lease_reference([(1, "DEED OF VARIATION")]) is None
