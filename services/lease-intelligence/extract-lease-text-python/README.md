# Extract Lease Text (Python)

Implements the checklist item:

> As a developer, I want the Python service to extract raw text from
> uploaded PDFs, so that the text can be processed for clause extraction.

Deliberately a separate service from the Node API — see the project's
feasibility doc: if the PDF/AI pipeline needs Python's stronger tooling,
isolate it as a small service the Node backend calls, rather than
rewriting the whole app in Python.

## Files

- `extractor.py` — the actual extraction logic (`extract_text_from_pdf`).
  Pure Python + pdfplumber, no web framework — kept separate so it's easy
  to unit test and easy to swap the extraction library later.
- `main.py` — a thin FastAPI wrapper exposing it as `POST /extract`.

## What it does right now

Extracts text from **digitally-native** PDFs, page by page, using
`pdfplumber`. Commercial leases also arrive scanned/photographed — OCR for
those isn't wired up yet, because the team hasn't chosen an OCR library
(per the feasibility doc's open-questions table). Instead of silently
returning empty text for a scanned lease, each page is flagged
`likely_scanned` if it comes back with under ~20 characters, and the
response includes an overall `needs_ocr` flag — the frontend/Clark
pipeline can use that to tell the user "this lease needs OCR" rather than
just failing quietly.

## Setup

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

## Try it

```bash
curl -F "file=@/path/to/test_lease.pdf" http://localhost:8001/extract
```

Returns JSON: `filename`, `page_count`, `needs_ocr`, `full_text`, and a
`pages` array with per-page text + `likely_scanned`.

## Verified

Ran end-to-end against a generated sample lease PDF in this environment —
correctly extracted all lines including clause references (see below).
`fastapi`/`uvicorn` couldn't be installed in *this* sandbox (network
restrictions on this specific tool's egress), so the live HTTP layer
wasn't hit here — only `extractor.py`'s core logic was. Run `uvicorn
main:app --reload` on your own machine to exercise `/extract` directly;
the underlying logic is already proven correct.

```
COMMERCIAL LEASE AGREEMENT
Landlord: Acme Property Trust
Tenant: Tarocash Ltd
Clause 4.2: Rent Review - CPI adjustment annually on 1 July.
Clause 7.1: Notice period for termination is 90 days.
```

## Committing this (per the team contract: feature branches, PR + review before merge)

```bash
git checkout -b feature/extract-lease-text-service
# copy this folder into the repo (e.g. services/extract-lease-text/)
git add .
git commit -m "feat: Python lease text extraction service (Extract Lease Text card)"
git push -u origin feature/extract-lease-text-service
# open a PR into main, request review before merging
```
