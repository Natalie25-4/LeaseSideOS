# Clause Retrieval — Findings (v1, keyword baseline)

Fixture: `fixtures/lease_01.txt` — synthetic ADLS-style deed, 5 pages, 51 segments.

## Result

| Clause type | Top candidate | Correct? |
|---|---|---|
| rent | 3.1 | Yes |
| term | 2.1 | Yes |
| renewal | 2.3 | No — 2.2 is the granting clause |
| rent_review | 4.3 | Partial — see below |
| outgoings | 5.1 | Yes |
| permitted_use | 6.1 | Yes |

4 of 6 correct on the top candidate; 6 of 6 have the correct clause somewhere
in the top-3 shortlist.

## Finding 1 — section headings outranked their own clauses

The first implementation scored `4. RENT REVIEW` above `4.2`, because a heading
match was weighted at 3 keyword hits and the heading segment contains no
competing text. Fixed with `is_section_marker()`: a segment with under 80
characters of body is a signpost, not a clause, and is excluded from candidates.

## Finding 2 — keyword scoring cannot distinguish granting from referring

For `renewal`, clause 2.3 ("If the Tenant exercises a right of renewal...")
outscores 2.2 ("The Tenant shall have two (2) rights of renewal..."), because
2.3 repeats the phrase more often. Frequency is a poor proxy for relevance in
legal text, where cross-references are common. Unfixed at v1; 2.2 remains in
the shortlist, so the pipeline mitigates it by trying candidates in order.

## Finding 3 — some clause types are inherently multi-part

Rent review is spread across three clauses: 4.1 (when), 4.2 (mechanism during
the term), 4.3 (mechanism on renewal). No single clause answers the question.
Renewal is similarly split between 2.2 (the grant) and 2.4 (final expiry).

Design consequence: the pipeline must store every candidate that yields a
result, not only the highest-scoring one. The `clauses` table already permits
multiple rows per (document, clause_type).

## Finding 4 — money figures are ambiguous within a document

This lease contains four dollar amounts: $145,000.00 (annual rent),
$12,083.33 (the same rent, monthly), $2,000,000.00 (public liability cover)
and $60.00 (car park licence fee). Retrieval filters out the insurance figure
by clause, but the car park fee is rent-like. Value parsing must be tested
against all four.

## Next

Measure this baseline properly against real leases once available from the
client, per clause type, using `evals/run.py`.