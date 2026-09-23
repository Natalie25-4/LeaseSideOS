"""Exercise the real HTTP handler with Gemini/PDF dependencies replaced in tests only."""
import importlib.util
import json
from pathlib import Path
from types import ModuleType, SimpleNamespace
import unittest
from unittest.mock import Mock, patch

from fastapi.testclient import TestClient
from confidence_policy import FALLBACK_ANSWER


class AskFallbackTests(unittest.TestCase):
    def setUp(self):
        self.generate = Mock()
        extraction = ModuleType("clause_extraction")
        extraction.extract_clauses = Mock()
        extraction.client = SimpleNamespace(models=SimpleNamespace(generate_content=self.generate))
        pdf = ModuleType("pdf_extraction")
        pdf.extract_text_with_pages = Mock()
        spec = importlib.util.spec_from_file_location("fallback_test_api", Path(__file__).with_name("api.py"))
        module = importlib.util.module_from_spec(spec)
        with patch.dict("sys.modules", {"clause_extraction": extraction, "pdf_extraction": pdf}):
            spec.loader.exec_module(module)
        self.http = TestClient(module.app)
        self.addCleanup(self.http.close)
        self.request = {"question": "When does this lease expire?", "clauses": [
            {"category": "term", "page": 2, "text": "The term ends on 31 December 2027."}]}

    def reply(self, raw):
        self.generate.return_value = SimpleNamespace(text=raw)
        return self.http.post("/ask", json=self.request)

    def test_low_score_never_exposes_original_answer(self):
        response = self.reply(json.dumps({"answer": "Invented date", "confidence": 0.59,
                                          "sourcePage": 2, "sourceCategory": "term"}))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["answer"], FALLBACK_ANSWER)
        self.assertNotIn("Invented date", response.text)
        self.assertIsNone(response.json()["sourcePage"])

    def test_threshold_response_survives_code_fence(self):
        value = {"answer": "31 December 2027", "confidence": 0.6,
                 "sourcePage": 2, "sourceCategory": "term"}
        response = self.reply("```json\n" + json.dumps(value) + "\n```")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), value)
        self.assertIn(self.request["question"], self.generate.call_args.kwargs["contents"][1])

    def test_missing_invalid_or_unparseable_output_falls_back(self):
        for raw in ('{"answer":"Guess"}', '{"answer":"Guess","confidence":"93%"}',
                    '{"answer":"Guess","confidence":NaN}', '[]', 'not JSON', '', None):
            with self.subTest(raw=raw):
                response = self.reply(raw)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json()["answer"], FALLBACK_ANSWER)
                self.assertIsNone(response.json()["confidence"])

    def test_no_clauses_skips_gemini(self):
        self.request["clauses"] = []
        response = self.http.post("/ask", json=self.request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["answer"], FALLBACK_ANSWER)
        self.generate.assert_not_called()

    def test_provider_failure_remains_an_operational_error(self):
        self.generate.side_effect = RuntimeError("Provider unavailable")
        with patch("builtins.print"):
            response = self.http.post("/ask", json=self.request)
        self.assertEqual(response.status_code, 500)
        self.assertIn("error", response.json())


if __name__ == "__main__":
    unittest.main()
