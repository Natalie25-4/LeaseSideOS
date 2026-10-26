"""Output shapes for clause extraction.

Every value field is a STRING holding the text as written in the document.
Converting "$145,000.00" to 145000.0, or "six (6) years" to {"years": 6},
happens in parse.py — deterministic code we can unit-test — never in the model.
"""

from typing import Literal

from pydantic import BaseModel


class ClauseBase(BaseModel):
    found: bool
    quote: str | None = None             # must appear VERBATIM in the passage
    clause_reference: str | None = None  # e.g. "3.1"


class RentClause(ClauseBase):
    amount: str | None = None
    period: Literal["annual", "monthly", "weekly"] | None = None
    gst_treatment: Literal["plus_gst", "inclusive", "unstated"] | None = None


class TermClause(ClauseBase):
    commencement: str | None = None
    expiry: str | None = None
    duration: str | None = None


class RenewalClause(ClauseBase):
    renewal_count: str | None = None
    renewal_term: str | None = None
    notice_period: str | None = None


class RentReviewClause(ClauseBase):
    review_dates: str | None = None
    mechanism: Literal["cpi", "market", "fixed", "other"] | None = None
    cap: str | None = None


class OutgoingsClause(ClauseBase):
    tenant_proportion: str | None = None
    payment_frequency: str | None = None


class PermittedUseClause(ClauseBase):
    permitted_use: str | None = None
    consent_required: bool | None = None


SCHEMAS: dict[str, type[ClauseBase]] = {
    "rent": RentClause,
    "term": TermClause,
    "renewal": RenewalClause,
    "rent_review": RentReviewClause,
    "outgoings": OutgoingsClause,
    "permitted_use": PermittedUseClause,
}