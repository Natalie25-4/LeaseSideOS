"""Clause identification service.

Stateless by design: text in, clauses out. This service holds no database
connection and stores nothing, so it cannot corrupt the caller's data and
needs no credentials in deployment. The caller owns persistence.
"""

import logging

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from app.clauses.pipeline import run
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