"""Clause identification service.

Stateless by design: text in, clauses out. This service holds no database
connection and stores nothing, so it cannot corrupt the caller's data and
needs no credentials in deployment. The caller owns persistence.
"""

import io
import logging
import re


from dotenv import load_dotenv
load_dotenv()

import pdfplumber
from fastapi import FastAPI, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

from datetime import date

from app.clauses.pipeline import run
from app.clauses.position import SourceDocument, resolve
from app.clauses.prompts import PROMPT_VERSION
from app.clauses.provider import get_provider
from app.clauses.schemas import SCHEMAS
from app.clauses.keywords import HEADING_HINTS, HEADING_WEIGHT, KEYWORDS
from app.clauses.schemas import ClauseBase

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


@app.post("/documents/pages")
async def document_pages(file: UploadFile = File(...)):
    """PDF in, pages out. Still stateless — nothing is written anywhere."""
    raw = await file.read()
    try:
        with pdfplumber.open(io.BytesIO(raw)) as pdf:
            if len(pdf.pages) > MAX_PAGES:
                raise HTTPException(
                    status_code=413, detail=f"too many pages (limit {MAX_PAGES})"
                )
            pages = [
                {"page_number": i, "text": p.extract_text() or ""}
                for i, p in enumerate(pdf.pages, start=1)
            ]
    except HTTPException:
        raise
    except Exception:
        logging.exception("pdf parse failed")
        raise HTTPException(status_code=422, detail="could not read this PDF")

    return {"filename": file.filename, "pages": pages, "page_count": len(pages)}


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
class StoredClause(BaseModel):
    clause_type: str
    page_number: int
    source_text: str
    clause_reference: str | None = None
    extracted_value: dict | None = None


class AnswerRequest(BaseModel):
    question: str
    clauses: list[StoredClause] = []
    pages: list[Page] | None = None


class LeaseAnswer(ClauseBase):
    """An answer plus a verbatim quote supporting it."""
    answer: str | None = None


ANSWER_SYSTEM = """You are Clark, a commercial property lease assistant.

Answer the question using ONLY the lease text provided. Do not rely on general
knowledge about leases, and do not assume terms that are not written here.

Also return `quote`: a span copied EXACTLY, character for character, from the
text you were given, which supports your answer. Do not paraphrase it and do
not join text from two places.

If the lease does not address the question, set found to false and say so.
Declining to answer is correct behaviour, not failure."""


def _flatten(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip().lower()

_STOPWORDS = {
    "the", "and", "for", "are", "but", "not", "you", "all", "can", "her", "was",
    "one", "our", "out", "has", "had", "how", "its", "who", "did", "yes", "his",
    "this", "that", "with", "from", "they", "what", "when", "will", "there",
    "their", "would", "about", "which", "does", "doesn", "tenant", "landlord",
    "lease", "premises", "shall", "any", "must",
}


def _terms(question: str) -> set[str]:
    return {
        w for w in re.findall(r"[a-z']+", question.lower())
        if len(w) > 2 and w not in _STOPWORDS
    }


def _best_passages(question: str, pages: list[Page], top: int = 2):
    """Highest-overlap sentences from the lease, with their page numbers."""
    terms = _terms(question)
    if not terms:
        return []

    scored = []
    for page in pages:
        for raw in re.split(r"(?<=\.)(?!\d)\s+", page.text):
            sentence = re.sub(r"\s+", " ", raw).strip()
            if len(sentence) < 40:
                continue
            lowered = sentence.lower()
            score = sum(1 for t in terms if t in lowered)
            if score:
                scored.append((score, page.page_number, sentence))

    scored.sort(key=lambda row: (-row[0], row[1]))
    return scored[:top]

def _question_scores(question: str) -> dict[str, int]:
    """Which clause type is this question about? Same scoring idea as retrieval."""
    q = question.lower()
    scores: dict[str, int] = {}
    for clause_type, words in KEYWORDS.items():
        hits = sum(1 for kw in words if kw.lower() in q)
        for hint in HEADING_HINTS.get(clause_type, []):
            if hint.lower() in q:
                hits += HEADING_WEIGHT
                break
        if clause_type.replace("_", " ") in q:
            hits += HEADING_WEIGHT
        if hits:
            scores[clause_type] = hits
    return scores


@app.post("/clauses/answer")
def answer_question(req: AnswerRequest):
    """Answer from the lease. The model answers freely; the quote is checked
    against the source so the user is told whether the answer is traceable."""
    if not req.question.strip():
        raise HTTPException(status_code=422, detail="question must not be empty")
    if not req.clauses and not req.pages:
        raise HTTPException(status_code=422, detail="clauses or pages must be supplied")

    provider = get_provider()

    # ---------- model path: full document when we have it ----------
    if req.pages:
        context = "\n\n".join(f"[page {p.page_number}]\n{p.text}" for p in req.pages)
        user = f"LEASE DOCUMENT:\n\n{context}\n\nQUESTION: {req.question}"
    else:
        numbered = "\n\n".join(
            f"[{i}] {c.clause_type} (clause {c.clause_reference or '—'}, "
            f"page {c.page_number}):\n{c.source_text}"
            for i, c in enumerate(req.clauses, start=1)
        )
        user = f"CLAUSES:\n\n{numbered}\n\nQUESTION: {req.question}"

    result = provider.complete(ANSWER_SYSTEM, user, LeaseAnswer)

    if result is not None and result.found and result.answer:
        quote = (result.quote or "").strip()
        needle = _flatten(quote)

        page_number = None
        if needle:
            if req.pages:
                for p in req.pages:
                    if needle in _flatten(p.text):
                        page_number = p.page_number
                        break
            else:
                for c in req.clauses:
                    if needle in _flatten(c.source_text):
                        page_number = c.page_number
                        break

        verified = page_number is not None
        if not verified and needle:
            logging.warning("answer quote did not verify against the source")

        return {
            "answered": True,
            "answer": result.answer,
            "verified": verified,
            "clause_type": None,
            "citations": (
                [{
                    "clause_reference": result.clause_reference,
                    "page_number": page_number,
                    "source_text": quote,
                }]
                if verified else []
            ),
            "mode": "model",
            "provider": provider.name,
        }

    # ---------- deterministic fallback ----------
    if req.pages:
        hits = _best_passages(req.question, req.pages)
        if hits:
            quoted = " ".join(f'(page {pg}) "{text}"' for _, pg, text in hits)
            return {
                "answered": True,
                "answer": f"The lease says: {quoted}",
                "verified": True,
                "clause_type": None,
                "citations": [
                    {"clause_reference": None, "page_number": pg, "source_text": text}
                    for _, pg, text in hits
                ],
                "mode": "retrieval",
                "provider": provider.name,
            }
            
    scores = _question_scores(req.question)
    available = {c.clause_type for c in req.clauses}
    ranked = [ct for ct in sorted(scores, key=scores.get, reverse=True) if ct in available]

    if not ranked:
        return {
            "answered": False,
            "answer": (
                "I could not find anything in this lease that answers that question."
                + (
                    " Clauses held for this lease: "
                    + ", ".join(sorted(ct.replace("_", " ") for ct in available))
                    + "."
                    if available else ""
                )
            ),
            "verified": False,
            "clause_type": None,
            "citations": [],
            "mode": "deterministic",
            "provider": provider.name,
        }

    best = ranked[0]
    matches = [c for c in req.clauses if c.clause_type == best]
    label = best.replace("_", " ")

    if len(matches) == 1:
        answer = f'The {label} clause states: "{matches[0].source_text}"'
    else:
        parts = [
            f'Clause {c.clause_reference or "—"} (page {c.page_number}): "{c.source_text}"'
            for c in matches
        ]
        answer = f"This lease has {len(matches)} {label} clauses. " + " ".join(parts)

    return {
        "answered": True,
        "answer": answer,
        "verified": True,
        "clause_type": best,
        "citations": [
            {
                "clause_reference": c.clause_reference,
                "page_number": c.page_number,
                "source_text": c.source_text,
                "extracted_value": c.extracted_value,
            }
            for c in matches
        ],
        "mode": "deterministic",
        "provider": provider.name,
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