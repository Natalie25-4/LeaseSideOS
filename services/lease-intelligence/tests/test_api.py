import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
    assert "rent" in r.json()["clause_types"]


def test_extract_returns_clauses(pages):
    body = {"pages": [{"page_number": n, "text": t} for n, t in pages]}
    r = client.post("/clauses/extract", json=body)
    assert r.status_code == 200
    data = r.json()
    assert data["page_count"] == 5
    assert {c["clause_type"] for c in data["clauses"]} >= {"rent", "term", "renewal"}


def test_clause_types_filter(pages):
    body = {
        "pages": [{"page_number": n, "text": t} for n, t in pages],
        "clause_types": ["rent"],
    }
    r = client.post("/clauses/extract", json=body)
    assert r.status_code == 200
    assert {c["clause_type"] for c in r.json()["clauses"]} == {"rent"}


def test_empty_pages_is_rejected():
    assert client.post("/clauses/extract", json={"pages": []}).status_code == 422


def test_unknown_clause_type_is_rejected(pages):
    body = {
        "pages": [{"page_number": 1, "text": "x"}],
        "clause_types": ["mortgage"],
    }
    r = client.post("/clauses/extract", json=body)
    assert r.status_code == 422
    assert "mortgage" in r.json()["detail"]


def test_bad_page_number_is_rejected():
    body = {"pages": [{"page_number": 0, "text": "x"}]}
    assert client.post("/clauses/extract", json=body).status_code == 422


def test_unparseable_text_returns_empty_not_an_error():
    body = {"pages": [{"page_number": 1, "text": "nothing lease-like here"}]}
    r = client.post("/clauses/extract", json=body)
    assert r.status_code == 200
    assert r.json()["clauses"] == []