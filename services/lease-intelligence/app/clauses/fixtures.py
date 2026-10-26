from pathlib import Path

def load_fixture(path: str) -> list[tuple[int, str]]:
    """Returns [(page_number, text), ...] - the shape document_pages will give later."""
    raw = Path(path).read_text()
    return [(i, page) for i, page in enumerate(raw.split("\f"), start=1) if page.strip()]

