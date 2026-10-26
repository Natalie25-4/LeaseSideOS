"""System prompt and per-type instructions.

PROMPT_VERSION is stored on every clause row. When the wording here changes,
bump it — otherwise you cannot tell which results came from which prompt, and
the evaluation history becomes meaningless.
"""

PROMPT_VERSION = "v1"

SYSTEM = """You locate clauses in New Zealand commercial lease documents.

Rules:
- Use ONLY the passage provided. Never use outside knowledge.
- `quote` must be copied EXACTLY from the passage, word for word.
- If the passage does not contain this clause, set found=false and leave all
  other fields null.
- Do not calculate, convert, reformat or summarise. Copy what is written.
- Transcribe values as they appear, including words, symbols and punctuation.
"""

INSTRUCTIONS: dict[str, str] = {
    "rent":          "Find the clause stating the rent payable by the tenant.",
    "term":          "Find the clause stating the term of the lease, its commencement and expiry.",
    "renewal":       "Find the clause granting the tenant rights of renewal.",
    "rent_review":   "Find the clause stating when and how the rent is reviewed.",
    "outgoings":     "Find the clause stating the outgoings the tenant must pay.",
    "permitted_use": "Find the clause stating what the premises may be used for.",
}


def build_user(clause_type: str, passage: str) -> str:
    return f"{INSTRUCTIONS[clause_type]}\n\nPassage:\n{passage}"