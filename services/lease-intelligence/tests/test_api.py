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


def _body(fixtures_dir):
    from app.clauses.fixtures import load_fixture
    def pages(name):
        return [{"page_number": n, "text": t}
                for n, t in load_fixture(str(fixtures_dir / name))]
    return {
        "as_at": "2028-01-01",
        "documents": [
            {"document_id": "lease", "document_type": "lease",
             "effective_date": "2024-04-01", "pages": pages("lease_01.txt")},
            {"document_id": "dov-2027", "document_type": "deed_of_variation",
             "effective_date": "2027-04-01", "pages": pages("dov_rent_2027.txt")},
        ],
    }


def test_resolve_applies_the_variation(fixtures_dir):
    r = client.post("/position/resolve", json=_body(fixtures_dir))
    assert r.status_code == 200
    data = r.json()
    rent = data["clauses"]["rent"]
    assert rent["current"][0]["extracted_value"]["amount"] == 160000.0
    assert rent["source_document_type"] == "deed_of_variation"
    assert rent["superseded"][0]["extracted_value"]["amount"] == 145000.0


def test_resolve_leaves_silent_clauses_alone(fixtures_dir):
    data = client.post("/position/resolve", json=_body(fixtures_dir)).json()
    assert data["clauses"]["term"]["source_document_id"] == "lease"


def test_resolve_reports_its_reasoning(fixtures_dir):
    data = client.post("/position/resolve", json=_body(fixtures_dir)).json()
    assert data["documents_applied"] == ["lease", "dov-2027"]
    assert "warnings" in data


def test_resolve_requires_a_head_lease(fixtures_dir):
    body = _body(fixtures_dir)
    body["documents"] = [d for d in body["documents"] if d["document_type"] != "lease"]
    assert client.post("/position/resolve", json=body).status_code == 422


def test_resolve_rejects_empty_documents():
    assert client.post("/position/resolve", json={"documents": []}).status_code == 422
