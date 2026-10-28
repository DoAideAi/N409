"""A cell ref is attacker-controlled text, and `_col_index` read all of it.

Accumulating a 200,000-letter ref into a Python int took seven seconds — each
letter multiplies a number one digit longer than the last — and the inflated
budget lets one upload carry megabytes of them.
"""

import time

from app.documents import MAX_XLSX_COLS, _col_index


def test_ordinary_refs_still_resolve():
    assert _col_index("A1") == 0
    assert _col_index("Z9") == 25
    assert _col_index("AA1") == 26
    assert _col_index("BC12") == 54
    assert _col_index("SR1") == MAX_XLSX_COLS - 1


def test_a_ref_past_the_cap_still_lands_past_it():
    assert _col_index("SS1") >= MAX_XLSX_COLS
    assert _col_index("XFD1") >= MAX_XLSX_COLS


def test_a_megabyte_ref_is_not_read_letter_by_letter():
    started = time.perf_counter()
    assert _col_index("A" * 2_000_000 + "1") >= MAX_XLSX_COLS
    assert time.perf_counter() - started < 0.5


def test_no_letters_is_still_none():
    assert _col_index("12") is None
    assert _col_index("") is None
    assert _col_index(None) is None
