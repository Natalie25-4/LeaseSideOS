"""Clause identification service.

Stateless by design: text in, clauses out. This service holds no database
connection and stores nothing, so it cannot corrupt the caller's data and
needs no credentials in deployment. The caller owns persistence.
"""

import logging

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from datetime import date

from app.clauses.pipeline import run
from app.clauses.position import SourceDocument, resolve
from app.clauses.prompts import PROMPT_VERSION
from app.clauses.provider import get_provider
from app.clauses.schemas import SCHEMAS

logging.basicConfig(level=logging.INFO)

# Namespaced so the service can sit behind a shared reverse proxy without
# colliding with anyone else's routes.
app = FastAPI(title="Clark — Clause Identification", root_path="/clark")

MAX_PAGES = 500


class Page(BaseModel):
    page_number: int = Field(ge=1)
    text: str


class ExtractRequest(BaseModel):
    pages: list[Page]
    clause_types: list[str] | None = None


@app.get("/health")
def health():
    return {
        "status": "ok",
        "provider": get_provider().name,
        "prompt_version": PROMPT_VERSION,
        "clause_types": sorted(SCHEMAS),
    }


@app.post("/clauses/extract")
def extract_clauses(req: ExtractRequest):
    if not req.pages:
        raise HTTPException(status_code=422, detail="pages must not be empty")
    if len(req.pages) > MAX_PAGES:
        raise HTTPException(
            status_code=413, detail=f"too many pages (limit {MAX_PAGES})"
        )

    if req.clause_types:
        unknown = sorted(set(req.clause_types) - set(SCHEMAS))
        if unknown:
            raise HTTPException(
                status_code=422,
                detail=f"unknown clause_types: {unknown}. known: {sorted(SCHEMAS)}",
            )

    provider = get_provider()
    pages = [(p.page_number, p.text) for p in req.pages]

    try:
        clauses = run(pages, provider, req.clause_types)
    except Exception:
        logging.exception("extraction failed")
        raise HTTPException(status_code=500, detail="extraction failed")

    return {
        "clauses": clauses,
        "provider": provider.name,
        "prompt_version": PROMPT_VERSION,
        "page_count": len(pages),
    }


class PositionDocument(BaseModel):
    document_id: str
    document_type: str = "lease"
    pages: list[Page]
    effective_date: date | None = None
    executed_date: date | None = None
    link_status: str = "confirmed"


class ResolveRequest(BaseModel):
    documents: list[PositionDocument]
    as_at: date | None = None


@app.post("/position/resolve")
def resolve_position(req: ResolveRequest):
    """Current contractual position across a lease and its variations."""
    if not req.documents:
        raise HTTPException(status_code=422, detail="documents must not be empty")
    if not any(d.document_type == "lease" for d in req.documents):
        raise HTTPException(status_code=422, detail="exactly one head lease is required")

    provider = get_provider()
    sources = []
    for d in req.documents:
        pages = [(p.page_number, p.text) for p in d.pages]
        sources.append(
            SourceDocument(
                document_id=d.document_id,
                document_type=d.document_type,
                clauses=run(pages, provider),
                effective_date=d.effective_date,
                executed_date=d.executed_date,
                link_status=d.link_status,
            )
        )

    result = resolve(sources, as_at=req.as_at)

    return {
        "as_at": result.as_at.isoformat(),
        "clauses": {
            ct: {
                "current": rc.current,
                "source_document_id": rc.source_document_id,
                "source_document_type": rc.source_document_type,
                "effective_from": rc.effective_from.isoformat() if rc.effective_from else None,
                "superseded": rc.superseded,
            }
            for ct, rc in result.clauses.items()
        },
        "documents_applied": result.documents_applied,
        "documents_excluded": [
            {"document_id": i, "reason": r} for i, r in result.documents_excluded
        ],
        "warnings": result.warnings,
        "provider": provider.name,
        "prompt_version": PROMPT_VERSION,
    }
