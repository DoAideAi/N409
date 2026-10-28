"""A risk-free rate large enough to overflow the simulation's exponent.

Found by boundary fuzzing (C101 pass 12, round R435, method M1). The Monte Carlo
allocation exponentiates `(r − σ²/2)·t + σ√t·z` per draw and `−r·t` for the
discount; `math.exp` raises OverflowError instead of saturating, so a
`risk_free_rate` of 400 (typed as whole percent) or -1000 answered 500 with
nothing named. It is now the same 422 the debt endpoints give an overflow.
"""

import pytest
from fastapi.testclient import TestClient

from app.engine.compute import compute
from app.engine.errors import EngineInputError
from app.main import app

PARAMS = {
    "weight_asset": 0.0,
    "weight_opm": 0.6,
    "weight_income": 0.15,
    "weight_market": 0.25,
    "dloc": 0.1,
    "dlom_method": "finnerty",
    "exit_timeline": "2029-06-30",
    "allocation_method": "monte_carlo",
}
INPUTS = {
    "valuation_date": "2026-06-30",
    "shares_outstanding_common": 7_000_000,
    "options_outstanding": 1_000_000,
    "shares_outstanding_preferred": 2_000_000,
    "liquidation_preference": 5_000_000,
    "volatility": 0.6,
    "risk_free_rate": 0.042,
    "cash": 1_500_000,
    "debt": 200_000,
    "last_round_post_money": 20_000_000,
    "income": {"free_cash_flows": [-500_000, 250_000, 1_200_000], "discount_rate": 0.3, "terminal_growth": 0.03},
    "market": {"metric": 4_000_000, "multiples": [6.0, 4.0]},
    "share_classes": [
        {"name": "Common", "kind": "common", "shares": 8_000_000.0},
        {"name": "Series A", "kind": "preferred", "shares": 4_000_000.0, "preference": 2e7},
    ],
}


@pytest.mark.parametrize("rate", [400, 800, 1e4, -1000])
def test_an_exponent_that_leaves_the_doubles_is_refused_not_a_500(rate):
    with pytest.raises(EngineInputError, match="overflowed a double"):
        compute(PARAMS, {**INPUTS, "risk_free_rate": rate})


def test_the_refusal_says_rates_are_fractions():
    with pytest.raises(EngineInputError, match=r"4% is 0\.04"):
        compute(PARAMS, {**INPUTS, "risk_free_rate": 400})


@pytest.mark.parametrize("rate", [0.0, 0.042, 5, 50])
def test_a_large_but_representable_rate_still_runs(rate):
    out = compute(PARAMS, {**INPUTS, "risk_free_rate": rate})
    assert out["results"]["fmv_per_share"] >= 0


def test_an_overflowing_rate_answers_422_over_http():
    res = TestClient(app).post(
        "/engine/v1/compute", json={"params": PARAMS, "inputs": {**INPUTS, "risk_free_rate": 400}}
    )
    assert res.status_code == 422
    assert "overflowed a double" in res.json()["detail"]
