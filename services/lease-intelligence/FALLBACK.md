# Low-confidence fallback

The existing Python `/ask` endpoint applies `confidence_policy.py` to Gemini's
answer before returning it. The existing AskClarkPanel renders this answer; no
second chat page or placeholder API is needed.

- Scores below **0.6** suppress the tentative answer and its citation.
- Exactly 0.6 and higher retain a non-empty answer and its source fields.
- Missing, non-numeric, boolean, non-finite, or out-of-range scores fail closed.
- Empty clauses skip Gemini. Invalid JSON or an empty answer also fall back.
- Fallback text begins **I can't verify this**.
- Valid low scores remain in `confidence`; an unknown score is `null`, not a
  fabricated percentage. Consumers must check for a number before showing a badge.
- Provider/network failures remain HTTP errors rather than low-confidence answers.

The threshold matches the current badge's color cutoff as an initial policy;
it is not calibrated and needs team review against human-rated samples. A high
model confidence score does not prove an answer is correct. Confidence badge wiring
is still separate from this change.

## Verification

From this service directory, with FastAPI, python-multipart and httpx installed:

```sh
python -m unittest test_confidence_policy test_ask_fallback -v
```

Tests cover the real HTTP handler with a simulated Gemini response, including
threshold boundaries, invalid scores, missing clauses, fenced JSON and service
errors. They require no API key and do not call Gemini. Live Gemini evaluation
and human comparison are still needed before marking the Trello testing item done.
