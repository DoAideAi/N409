"""A convertible whose maturity is too short for the tree to see a price move.

Found by boundary fuzzing (C101 pass 12, round R435, method M1). With
`maturity_years=1e-300` the step is `dt = t/n`, `σ·√dt` is far below a double's
resolution at 1.0, `u = e^{σ√dt}` rounds to exactly 1 and so does `d = 1/u`.
The risk-neutral probability divides by `u − d`, which is zero, and the
request answered 500 with a ZeroDivisionError instead of a refusal.
"""

import pytest
from fastapi.testclient import TestClient

from app.engine.debt_valuation import convertible_note, value_instrument
from app.engine.errors import EngineInputError
from app.main import app

NOTE = {
    "face": 1_000_000.0,
    "coupon_rate": 0.05,
    "frequency": 2,
    "maturity_years": 5.0,
    "conversion_ratio": 100.0,
    "stock_price": 8.0,
    "volatility": 0.3,
    "risk_free_rate": 0.04,
    "credit_spread": 0.03,
}


@pytest.mark.parametrize("maturity", [1e-300, 1e-200, 1e-100, 1e-50])
def test_a_maturity_below_the_trees_resolution_is_refused_not_a_zero_division(maturity):
    with pytest.raises(EngineInputError, match="too short"):
        convertible_note(**{**NOTE, "maturity_years": maturity})


def test_the_refusal_names_the_way_to_say_a_note_has_matured():
    with pytest.raises(EngineInputError, match="enter 0"):
        value_instrument("convertible", {**NOTE, "maturity_years": 1e-300})


@pytest.mark.parametrize("maturity", [1e-9, 1e-5, 1 / 365, 5.0])
def test_a_short_but_real_maturity_still_prices(maturity):
    out = convertible_note(**{**NOTE, "maturity_years": maturity})
    assert out["fair_value"] > 0


def test_zero_maturity_is_still_the_degenerate_redemption():
    out = convertible_note(**{**NOTE, "maturity_years": 0.0})
    assert out["fair_value"] == pytest.approx(1_000_000.0)
    assert out["option_value"] == 0.0


def test_a_tiny_maturity_answers_422_over_http():
    res = TestClient(app).post(
        "/engine/v1/debt-valuation",
        json={"instrument_type": "convertible", "params": {**NOTE, "maturity_years": 1e-300}},
    )
    assert res.status_code == 422
    assert "too short" in res.json()["detail"]
