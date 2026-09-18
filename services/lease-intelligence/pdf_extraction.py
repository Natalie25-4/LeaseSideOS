import pdfplumber

def extract_text_with_pages(pdf_path: str ) -> list [dict]:
    """Returns a list of {page_number, text} for every page in the PDF."""
    pages = []
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages, start =1):
            text = page.extract_text() or ""
            pages.append({"page_number": i, "text": text})
        return pages