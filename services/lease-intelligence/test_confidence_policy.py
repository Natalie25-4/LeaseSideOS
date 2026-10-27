import unittest

from confidence_policy import apply_confidence_policy, FALLBACK_ANSWER


class ConfidencePolicyTests(unittest.TestCase):
    def answer(self, score):
        return {"answer": "The lease expires tomorrow.", "sourcePage": 2,
                "sourceCategory": "term", "confidence": score}

    def test_low_score_suppresses_answer_and_citation(self):
        for score in (0, 0.4, 0.599999):
            with self.subTest(score=score):
                result = apply_confidence_policy(self.answer(score))
                self.assertEqual(result["answer"], FALLBACK_ANSWER)
                self.assertIsNone(result["sourcePage"])
                self.assertIsNone(result["sourceCategory"])
                self.assertEqual(result["confidence"], score)

    def test_threshold_and_high_scores_preserve_answer(self):
        for score in (0.6, 0.93, 1):
            with self.subTest(score=score):
                self.assertEqual(apply_confidence_policy(self.answer(score)), self.answer(score))

    def test_invalid_scores_are_unknown_not_fabricated(self):
        for score in (None, True, False, "0.9", -1, 93, float("nan"), float("inf"), [], {}):
            with self.subTest(score=score):
                result = apply_confidence_policy(self.answer(score))
                self.assertEqual(result["answer"], FALLBACK_ANSWER)
                self.assertIsNone(result["confidence"])

    def test_missing_score_and_non_object_results(self):
        for value in ({"answer": "Unsupported claim"}, None, [], "answer", 9):
            with self.subTest(value=value):
                self.assertEqual(apply_confidence_policy(value)["answer"], FALLBACK_ANSWER)

    def test_invalid_answer_falls_back_even_with_high_score(self):
        for answer in (None, "", "  ", 123, []):
            value = self.answer(0.9)
            value["answer"] = answer
            self.assertEqual(apply_confidence_policy(value)["answer"], FALLBACK_ANSWER)


if __name__ == "__main__":
    unittest.main()
