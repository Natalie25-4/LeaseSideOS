"""
Extract Lease Text service.

A small standalone FastAPI service, isolated from the Node.js API by
design (see the project feasibility doc: "if the PDF/AI pipeline turns out
to need Python's stronger tooling, isolate that piece as a small separate
service the Node backend calls to, rather than rewriting the whole
application"). The Node upload-lease service stores the PDF and its lease
id; this service is called afterwards (by the Node API, or directly in
dev) with that PDF to get raw text back.

Run locally:
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8001

Try it:
    curl -F "file=@/path/to/lease.pdf" http://localhost:8001/extract
"""

import tempfile
import os

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse

from extractor import extract_text_from_pdf

app = FastAPI(title="Lease Text Extraction Service")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/extract")
async def extract(file: UploadFile = File(...)):
    if file.content_type != "application/pdf" and not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    # Write to a temp file - pdfplumber needs a path/file-like object, and we
    # don't want to hold the whole upload in memory for large leases.
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        result = extract_text_from_pdf(tmp_path)
    except Exception as exc:  # noqa: BLE001 - surfaced to the caller deliberately
        raise HTTPException(status_code=422, detail=f"Could not extract text: {exc}") from exc
    finally:
        os.remove(tmp_path)

    return JSONResponse(
        {
            "filename": file.filename,
            "page_count": result.page_count,
            "needs_ocr": result.needs_ocr,  # true => at least one page had ~no extractable text
            "full_text": result.full_text,
            "pages": [
                {
                    "page_number": p.page_number,
                    "char_count": p.char_count,
                    "likely_scanned": p.likely_scanned,
                    "text": p.text,
                }
                for p in result.pages
            ],
        }
    )
