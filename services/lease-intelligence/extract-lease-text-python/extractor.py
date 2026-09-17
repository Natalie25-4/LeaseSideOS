"""
Lease PDF text extraction.

User story: "As a developer, I want the Python service to extract raw text
from uploaded PDFs, so that the text can be processed for clause extraction."

Scope note (matches the project feasibility doc): this handles digitally
native PDFs now. Scanned/photographed leases need OCR, and the team hasn't
picked an OCR library yet - see `needs_ocr` below, which flags pages that
came back with little/no extractable text so the frontend/Clark pipeline
knows this lease needs the OCR path once it exists, instead of silently
returning an empty lease.
"""

from dataclasses import dataclass, field
import pdfplumber

# A page with fewer than this many extracted characters is treated as
# "probably scanned" rather than "genuinely a blank page" - tune this once
# you're testing against real leases (see the doc's "PDF extraction
# accuracy test": 3-5 real leases, mix of native + scanned).
MIN_CHARS_PER_PAGE = 20


@dataclass
class PageResult:
    page_number: int
    text: str
    char_count: int
    likely_scanned: bool


@dataclass
class ExtractionResult:
    full_text: str
    pages: list = field(default_factory=list)
    page_count: int = 0
    needs_ocr: bool = False


def extract_text_from_pdf(file_path: str) -> ExtractionResult:
    """Extract raw text from a PDF, page by page.

    Raises FileNotFoundError / pdfplumber exceptions for the caller (the API
    layer) to translate into a proper error response - this function stays
    focused on extraction, not HTTP concerns.
    """
    pages: list[PageResult] = []

    with pdfplumber.open(file_path) as pdf:
        for i, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            char_count = len(text.strip())
            pages.append(
                PageResult(
                    page_number=i,
                    text=text,
                    char_count=char_count,
                    likely_scanned=char_count < MIN_CHARS_PER_PAGE,
                )
            )

    full_text = "\n\n".join(p.text for p in pages if p.text)
    needs_ocr = any(p.likely_scanned for p in pages)

    return ExtractionResult(
        full_text=full_text,
        pages=pages,
        page_count=len(pages),
        needs_ocr=needs_ocr,
    )
