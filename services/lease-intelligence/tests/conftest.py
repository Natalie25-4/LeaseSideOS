"""Shared test fixtures.

Paths resolve relative to the service root so the suite runs the same way
from any directory.
"""

import os
from pathlib import Path

import pytest

SERVICE_ROOT = Path(__file__).resolve().parent.parent
FIXTURE = SERVICE_ROOT / "fixtures" / "lease_01.txt"


@pytest.fixture(autouse=True, scope="session")
def _pin_provider():
    """Pin the provider before ANY fixture is built.

    Without this the suite reads CLARK_PROVIDER from .env, so results depend
    on local configuration and a misconfigured endpoint turns every assertion
    into a network timeout.

    Must be session-scoped. pytest builds higher-scoped fixtures first, so a
    function-scoped pin lands too late for module-scoped fixtures that extract
    clauses during setup — and monkeypatch is function-scoped only, which is
    why it can't be used here.
    """
    os.environ["CLARK_PROVIDER"] = "regex"
    yield


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


@pytest.fixture(scope="session")
def fixtures_dir():
    return SERVICE_ROOT / "fixtures"