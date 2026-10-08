"""Model providers behind one interface.

The rest of the pipeline never imports a vendor SDK. Swapping providers is a
one-line change here, and `name` is recorded on every stored clause so results
stay comparable across providers and versions.
"""

import os
import re
import logging
log = logging.getLogger(__name__)
from typing import Protocol

from .schemas import ClauseBase


class Provider(Protocol):
    name: str

    def complete(self, system: str, user: str, schema: type[ClauseBase]) -> ClauseBase | None:
        """Return a validated schema instance, or None if nothing usable came back."""
        ...


class RegexProvider:
    """Deterministic baseline. No model, no cost, no network.

    This is the control condition for evaluation: whatever a model scores,
    it has to beat these numbers to justify its cost and its opacity.
    """

    name = "regex-v1"

    # `SENT` matches "anything up to the end of the sentence", where a full
    # stop only ends a sentence if it is NOT a decimal point. Without this,
    # "being 23.4%" is cut off at "23" and the percentage is lost.
    SENT = r"(?:[^.]|\.(?=\d))*"

    PATTERNS: dict[str, str] = {
        "RentClause":
            r"annual rent of {S}?\$[\d,]+(?:\.\d{{2}})?{S}?(?:plus|including) GST",
        "TermClause":
            r"for a term of {S}?years{S}",
        "RenewalClause":
            r"(?:shall have|granted) {S}?rights? of renewal{S}",
        "RentReviewClause":
            r"(?:Rent shall be (?:reviewed|increased)){S}",
        "OutgoingsClause":
            r"(?:shall pay|pay) the Tenant's proportion of{S}",
        "PermittedUseClause":
            r"shall use the Premises {S}",
    }

    def complete(self, system, user, schema):
        raw = self.PATTERNS.get(schema.__name__)
        pattern = raw.format(S=self.SENT) if raw else None
        if not pattern:
            return schema(found=False)
        m = re.search(pattern, user, re.IGNORECASE | re.DOTALL)
        if not m:
            return schema(found=False)
        # Collapse the whitespace pdftotext leaves behind, but keep the words.
        quote = re.sub(r"\s+", " ", m.group(0)).strip()
        return schema(found=True, quote=quote)

class AzureProvider:
    """Azure OpenAI. Structured output via the OpenAI SDK's parse helper,
    which validates into our pydantic schema directly.
    """

    def __init__(self):
        from openai import OpenAI          # imported lazily: the regex and
                                            # stub providers must work with
                                            # no SDK installed
        endpoint = os.environ["AZURE_OPENAI_ENDPOINT"].rstrip("/")
        self.deployment = os.environ["AZURE_OPENAI_DEPLOYMENT"]
        self.client = OpenAI(
            base_url=f"{endpoint}/openai/v1/",
            api_key=os.environ["AZURE_OPENAI_API_KEY"],
        )

    @property
    def name(self) -> str:
        # Recorded on every clause row, so results stay comparable.
        return f"azure:{self.deployment}"

    def complete(self, system, user, schema):
        try:
            completion = self.client.beta.chat.completions.parse(
                model=self.deployment,      # DEPLOYMENT name, not model name
                temperature=0,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                response_format=schema,
            )
        except Exception:
            log.exception("azure call failed")
            return None

        message = completion.choices[0].message
        if getattr(message, "refusal", None):
            log.warning("model refused: %s", message.refusal)
            return None
        return message.parsed            # already a validated schema instance

class StubProvider:
    """Canned responses, including deliberately wrong ones.

    Used to test the pipeline without a network call, and to prove the
    quote verifier rejects a fabricated quote.
    """

    name = "stub"

    def __init__(self, responses: dict[str, dict]):
        self.responses = responses

    def complete(self, system, user, schema):
        data = self.responses.get(schema.__name__)
        if data is None:
            return schema(found=False)
        return schema(**data)


def get_provider(name: str | None = None) -> Provider:
    name = name or os.getenv("CLARK_PROVIDER", "regex")
    if name == "regex":
        return RegexProvider()
    if name == "stub":
        return StubProvider({})
    if name == "azure": 
        return AzureProvider() 
    # "anthropic" is registered in Phase 9.
    raise ValueError(f"unknown provider: {name!r}")