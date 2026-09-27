from app.clauses.verify import normalise, quote_is_real, quote_offsets

SRC = "The Tenant shall pay the annual rent of $145,000.00 plus GST."


def test_accepts_a_real_quote():
    assert quote_is_real("the annual rent of $145,000.00", SRC)


def test_rejects_a_fabricated_quote():
    assert not quote_is_real("the annual rent of $200,000.00", SRC)


def test_ignores_whitespace_differences():
    """pdftotext wraps sentences with column padding, so a faithful quote is
    often not a literal substring."""
    assert quote_is_real("the  annual   rent  of $145,000.00", SRC)


def test_rejects_empty_and_blank_quotes():
    assert not quote_is_real("", SRC)
    assert not quote_is_real("   ", SRC)


def test_offsets_recover_the_original_text():
    start, end = quote_offsets("the annual rent of $145,000.00", SRC)
    assert SRC[start:end] == "the annual rent of $145,000.00"


def test_offsets_work_across_line_breaks():
    wrapped = "the annual rent of ONE HUNDRED AND\n     FORTY FIVE THOUSAND DOLLARS"
    start, end = quote_offsets(
        "the annual rent of ONE HUNDRED AND FORTY FIVE THOUSAND DOLLARS", wrapped
    )
    assert wrapped[start:end] == wrapped
    assert normalise(wrapped[start:end]).startswith("the annual rent")


def test_offsets_return_none_when_absent():
    assert quote_offsets("not in here at all", SRC) is None