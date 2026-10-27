from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import tempfile
import os
import traceback
import json

from pdf_extraction import extract_text_with_pages
from clause_extraction import extract_clauses, client
from confidence_policy import apply_confidence_policy, fallback_response

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class AskRequest(BaseModel):
    question: str
    clauses: list[dict]

ASK_PROMPT = """You are Clark, a commercial property lease assistant.

You will be given a question and a set of clauses already extracted from a lease, each with
its category, page number, and text.

Answer the question using ONLY the information in these clauses. If the clauses don't contain
enough information to answer confidently, say so rather than guessing.

Respond ONLY with valid JSON in this exact structure:

{
  "answer": "your answer here",
  "sourcePage": integer or null,
  "sourceCategory": "string or null",
  "confidence": float between 0 and 1
}
"""

@app.post("/ask")
async def ask(req: AskRequest):
    if not req.clauses:
        return fallback_response()
    try:
        clauses_text = "\n".join(
            f"[{c['category']} - page {c['page']}] {c['text']}" for c in req.clauses
        )

        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=[ASK_PROMPT, f"Clauses:\n{clauses_text}\n\nQuestion: {req.question}"],
        )

        raw = (response.text or "").strip()
        if raw.startswith("```"):
            raw = raw.strip("`").removeprefix("json").strip()

        try:
            result = json.loads(raw)
        except json.JSONDecodeError:
            return fallback_response()
        return apply_confidence_policy(result)

    except Exception as e:
        print(traceback.format_exc())
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.post("/extract")
async def extract(file: UploadFile = File(...)):
    contents = await file.read()

    if not contents.startswith(b"%PDF"):
        return JSONResponse(
            status_code=400,
            content={"error": f"Uploaded file doesn't look like a valid PDF. First bytes: {contents[:20]}"},
        )

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(contents)
            tmp_path = tmp.name

        pages = extract_text_with_pages(tmp_path)
        result = extract_clauses(pages)
        result["filename"] = file.filename
        return result

    except Exception as e:
        print(traceback.format_exc())
        return JSONResponse(status_code=500, content={"error": f"Extraction failed: {str(e)}"})

    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except PermissionError:
                pass
