import os
import json
from google import genai
from dotenv import load_dotenv

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

EXTRACTION_PROMPT = """You are Clark, a commerical property lease analsys assistant.

You will be given the full text of a lease, with page numbers marked as [PAGE n].

Extract the following clause categories if present: rent, term, renewal_option, rent_review, outgoings, permitted_use, termination_notice, maintenance_obligations.

For EVERY clause you find, you MUST cite the exact page number it came from. 
If you cannot find a clause for a category, do not invent one, omit it or mark it null.

Respond ONLY with valid JSON in this exact structure, nothing else:

{
   "clauses":[
   {
     "category": "string",
     "text": "the exact or near-exact clause text",
     "page": integer,
     "confidence": float between 0 and 1
   }
 ]
}
"""

def extract_clauses(lease_pages: list [dict]) -> dict:
    full_text="\n\n".join(
        f"[PAGE {p['page_number']}]\n{p['text']}" for p in lease_pages
    )

    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=[EXTRACTION_PROMPT, full_text],
    )

    raw = response.text.strip()
    if raw.startswith("```"):
        raw = raw.strip("`").removeprefix("json").strip()

    return json.loads(raw)