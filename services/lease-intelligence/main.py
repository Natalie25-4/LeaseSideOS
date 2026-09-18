from pdf_extraction import extract_text_with_pages
from clause_extraction import extract_clauses

def process_lease(pdf_path: str) -> dict:
    pages = extract_text_with_pages(pdf_path)
    result = extract_clauses(pages)
    return result


if __name__ == "__main__":
    result = process_lease("sample_lease.pdf")
    print(result)