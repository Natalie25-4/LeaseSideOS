"""Resolve the current contractual position from a lease and its variations.

The position is COMPUTED at read time, never written back over the original
clauses. A deed of variation is corrected, backdated or found void often
enough that a mutated row cannot be trusted; and the audit trail — "varied
from $145,000 by the deed of 1 April 2027" — is only expressible if both
values survive.
"""

from dataclasses import dataclass, field
from datetime import date

# Sorts before any real date, so a head lease with no stated effective date
# still orders first.
_EARLIEST = date.min


@dataclass
class SourceDocument:
    """A document and the clauses extracted from it."""

    document_id: str
    document_type: str                     # 'lease' | 'deed_of_variation' | ...
    clauses: list[dict] = field(default_factory=list)
    effective_date: date | None = None
    executed_date: date | None = None
    # Non-lease documents are excluded from resolution until a human confirms
    # the link. An unconfirmed guess must never change a rent figure.
    link_status: str = "confirmed"

    @property
    def is_lease(self) -> bool:
        return self.document_type == "lease"


@dataclass
class ResolvedClause:
    clause_type: str
    current: list[dict]                    # one or more records
    source_document_id: str
    source_document_type: str
    effective_from: date | None
    superseded: list[dict] = field(default_factory=list)   # oldest first


@dataclass
class Resolution:
    as_at: date
    clauses: dict[str, ResolvedClause]
    documents_applied: list[str]
    documents_excluded: list[tuple[str, str]]              # (id, reason)
    warnings: list[str]

    def value(self, clause_type: str):
        """Convenience for tests and callers: the current record list."""
        rc = self.clauses.get(clause_type)
        return rc.current if rc else None


def _sort_key(doc: SourceDocument):
    # Deterministic by construction. A contractual position that differs
    # between runs is unusable, and nobody notices until someone else does.
    return (
        doc.effective_date or _EARLIEST,
        doc.executed_date or _EARLIEST,
        doc.document_id,
    )


def _by_type(clauses: list[dict]) -> dict[str, list[dict]]:
    grouped: dict[str, list[dict]] = {}
    for c in clauses:
        grouped.setdefault(c["clause_type"], []).append(c)
    return grouped


def resolve(
    documents: list[SourceDocument],
    as_at: date | None = None,
) -> Resolution:
    """The contractual position as at a date.

    Only clause types PRESENT in a variation supersede anything. A deed that
    raises the rent and is silent on the term does not change the term —
    absence is not override.
    """
    as_at = as_at or date.today()

    applied: list[SourceDocument] = []
    excluded: list[tuple[str, str]] = []
    warnings: list[str] = []

    for doc in documents:
        if not doc.is_lease and doc.link_status != "confirmed":
            excluded.append((doc.document_id, f"link_status={doc.link_status}"))
            continue
        if not doc.is_lease and doc.effective_date is None:
            excluded.append((doc.document_id, "no effective_date"))
            warnings.append(
                f"{doc.document_id}: variation has no effective date and cannot be ordered"
            )
            continue
        if doc.effective_date and doc.effective_date > as_at:
            excluded.append((doc.document_id, f"effective {doc.effective_date} > as_at {as_at}"))
            continue
        applied.append(doc)

    applied.sort(key=_sort_key)

    lease_dates = [d.effective_date for d in applied if d.is_lease and d.effective_date]
    lease_start = min(lease_dates) if lease_dates else None

    seen_dates: dict[date, str] = {}
    resolved: dict[str, ResolvedClause] = {}

    for doc in applied:
        if not doc.is_lease:
            if lease_start and doc.effective_date and doc.effective_date < lease_start:
                warnings.append(
                    f"{doc.document_id}: effective {doc.effective_date} precedes lease "
                    f"commencement {lease_start}"
                )
            if doc.effective_date in seen_dates:
                warnings.append(
                    f"{doc.document_id} and {seen_dates[doc.effective_date]} share effective "
                    f"date {doc.effective_date}; order resolved deterministically but review"
                )
            if doc.effective_date:
                seen_dates[doc.effective_date] = doc.document_id
            if not doc.clauses:
                warnings.append(
                    f"{doc.document_id}: applied but no clauses were extracted from it"
                )

        for clause_type, records in _by_type(doc.clauses).items():
            previous = resolved.get(clause_type)
            history = list(previous.superseded) + previous.current if previous else []
            resolved[clause_type] = ResolvedClause(
                clause_type=clause_type,
                current=records,
                source_document_id=doc.document_id,
                source_document_type=doc.document_type,
                effective_from=doc.effective_date,
                superseded=history,
            )

    return Resolution(
        as_at=as_at,
        clauses=resolved,
        documents_applied=[d.document_id for d in applied],
        documents_excluded=excluded,
        warnings=warnings,
    )
