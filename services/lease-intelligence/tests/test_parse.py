from datetime import date

import pytest

from app.clauses import parse


@pytest.mark.parametrize("text,expected", [
    ("$145,000.00", 145000.0),
    ("$1,200 per month", 1200.0),
    ("ONE HUNDRED AND FORTY FIVE THOUSAND DOLLARS ($145,000.00) plus GST", 145000.0),
    ("$60.00 plus GST per park per week", 60.0),
    ("$2,000,000.00 for any one event", 2000000.0),
    ("145000", 145000.0),
    ("no money here", None),
    ("", None),
])
def test_parse_money(text, expected):
    assert parse.parse_money(text) == expected


def test_parse_all_money_keeps_document_order():
    """A rent clause states the same obligation annually and monthly."""
    text = "annual rent of $145,000.00 plus GST, by equal monthly instalments of $12,083.33"
    assert parse.parse_all_money(text) == [145000.0, 12083.33]


@pytest.mark.parametrize("text,expected", [
    ("commencing on 1 April 2024", date(2024, 4, 1)),
    ("expiring on 31 March 2030", date(2030, 3, 31)),
    ("the 18th day of March 2024", date(2024, 3, 18)),
    ("no date", None),
])
def test_parse_date(text, expected):
    assert parse.parse_date(text) == expected


@pytest.mark.parametrize("text,expected", [
    ("a term of six (6) years", {"years": 6}),
    ("18 months", {"months": 18}),
    ("not less than three (3) months", {"months": 3}),
    ("nothing", None),
])
def test_parse_duration(text, expected):
    assert parse.parse_duration(text) == expected


def test_duration_ignores_a_count_that_has_no_time_unit():
    """'two (2) rights of renewal of three (3) years' holds two quantities.
    Only the one followed by a time unit is a duration."""
    text = "two (2) rights of renewal of three (3) years each"
    assert parse.parse_duration(text) == {"years": 3}
    assert parse.parse_renewal_count(text) == 2


@pytest.mark.parametrize("text,expected", [
    ("being 23.4% based on the ratio", 23.4),
    ("more than five percent (5%)", 5.0),
    ("none", None),
])
def test_parse_percent(text, expected):
    assert parse.parse_percent(text) == expected


@pytest.mark.parametrize("text,expected", [
    ("($145,000.00) plus GST", "plus_gst"),
    ("rent including GST", "inclusive"),
    ("the rent", "unstated"),
])
def test_parse_gst(text, expected):
    assert parse.parse_gst(text) == expected


@pytest.mark.parametrize("text,expected", [
    ("the annual rent of", "annual"),
    ("equal monthly instalments", "monthly"),
    ("per week", "weekly"),
    ("no period stated", None),
])
def test_parse_period(text, expected):
    assert parse.parse_period(text) == expected