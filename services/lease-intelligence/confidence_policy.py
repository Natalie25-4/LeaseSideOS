"""Server-side policy for Clark answers; scores are model estimates, not guarantees."""

import math

# Matches the existing badge cutoff. Tune with reviewed lease/question samples.
CONFIDENCE_THRESHOLD = 0.6
FALLBACK_ANSWER = "I can't verify this from the available lease information. Please review the lease or provide more relevant clauses."


def fallback_response(confidence=None):
    return {
        "answer": FALLBACK_ANSWER,
        "sourcePage": None,
        "sourceCategory": None,
        "confidence": confidence,
    }


def apply_confidence_policy(result):
    """Fail closed on missing/invalid scores without exposing the tentative answer."""
    if not isinstance(result, dict):
        return fallback_response()
    score = result.get("confidence")
    if (
        isinstance(score, bool)
        or not isinstance(score, (int, float))
        or not 0 <= score <= 1
        or not math.isfinite(score)
    ):
        return fallback_response()
    answer = result.get("answer")
    if score < CONFIDENCE_THRESHOLD or not isinstance(answer, str) or not answer.strip():
        return fallback_response(score)
    return {
        "answer": answer,
        "sourcePage": result.get("sourcePage"),
        "sourceCategory": result.get("sourceCategory"),
        "confidence": score,
    }
