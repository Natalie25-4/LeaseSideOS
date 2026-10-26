"""Extract one clause type from one passage, with verification."""

import logging

from .models import Segment
from .prompts import SYSTEM, build_user
from .provider import Provider
from .schemas import SCHEMAS, ClauseBase
from .verify import quote_is_real

log = logging.getLogger(__name__)


def extract_clause(
    segment: Segment, clause_type: str, provider: Provider
) -> ClauseBase | None:
    """Return a verified clause, or None.

    None means one of: the provider found nothing, the response failed schema
    validation, or the quote could not be located in the passage. The last
    case is a fabrication and is logged.
    """
    schema = SCHEMAS[clause_type]
    user = build_user(clause_type, segment.text)

    result = provider.complete(SYSTEM, user, schema)
    if result is None or not result.found:
        return None

    if not quote_is_real(result.quote or "", segment.text):
        log.warning(
            "rejected fabricated quote for %s at clause %s: %r",
            clause_type, segment.number, result.quote,
        )
        return None

    if result.clause_reference is None:
        result.clause_reference = segment.number

    return result