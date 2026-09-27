"""Shared test fixtures.

Paths resolve relative to the service root so the suite runs the same way
from any directory.
"""

from pathlib import Path

import pytest

SERVICE_ROOT = Path(__file__).resolve().parent.parent
FIXTURE = SERVICE_ROOT / "fixtures" / "lease_01.txt"


@pytest.fixture(scope="session")
def lease_path() -> str:
    assert FIXTURE.exists(), f"missing test fixture: {FIXTURE}"
    return str(FIXTURE)


@pytest.fixture(scope="session")
def pages(lease_path):
    from app.clauses.fixtures import load_fixture
    return load_fixture(lease_path)


@pytest.fixture(scope="session")
def segments(pages):
    from app.clauses.segment import segment_pages
    return segment_pages(pages)