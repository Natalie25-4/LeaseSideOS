def test_loads_five_pages(pages):
    assert len(pages) == 5


def test_page_numbers_start_at_one_and_increment(pages):
    assert [n for n, _ in pages] == [1, 2, 3, 4, 5]


def test_first_page_is_the_title_page(pages):
    assert "DEED OF LEASE" in pages[0][1]