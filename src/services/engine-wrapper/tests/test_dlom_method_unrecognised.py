"""A `dlom_method` that is not a method — a 500 for some, a silent 0% for others.

Found by boundary fuzzing (C101 pass 12, round R435, method M1). Two faults on
the same field:

* `"dlom_method": []` (or `{}`) reached `method in MODEL_DLOM_METHODS`, a
  frozenset membership test, which hashes its operand and raised
  ``TypeError: unhashable type``. The pre-flight is the first thing the compute
  route runs, so the request answered 500.
* Any *string* that was not a method — a typo (`"finerty"`) or the wrong case
  (`"FINNERTY"`) — fell through the dispatch to `dlom or 0.0` and concluded on a
  0% marketability discount: HTTP 200, no warning, common priced about 27% high.
  `dlom_methods` has always refused an unknown leg; the single-method spelling
  now refuses too. Only an *absent* (or null) method means "use the dlom I gave".
"""

import pytest
from fastapi.testclient import TestClient

from app.engine.compute import compute
from app.engine.dlom import is_model_dlom_method, selects_model_dlom
from app.engine.errors import EngineInputError
from app.main import app

client = TestClient(app, raise_server_exceptions=False)

PARAMS = {
    "weight_asset": 0.0,
    "weight_opm": 0.6,
    "weight_income": 0.15,
    "weight_market": 0.25,
    "dloc": 0.1,
    "exit_timeline": "2029-06-30",
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
}

NOT_A_METHOD = ["finerty", "FINNERTY", "Finnerty ", "", "black_scholes", 5, True, [], {}, [None], [[]]]


@pytest.mark.parametrize("bad", NOT_A_METHOD, ids=repr)
def test_compute_refuses_a_dlom_method_that_is_not_a_method(bad):
    with pytest.raises(EngineInputError, match="dlom_method must be one of"):
        compute({**PARAMS, "dlom_method": bad}, INPUTS)


@pytest.mark.parametrize("bad", NOT_A_METHOD, ids=repr)
def test_the_compute_route_answers_a_non_method_with_422_never_500(bad):
    res = client.post("/engine/v1/compute", json={"params": {**PARAMS, "dlom_method": bad}, "inputs": INPUTS})
    assert res.status_code == 422, res.text


@pytest.mark.parametrize("bad", NOT_A_METHOD, ids=repr)
def test_the_validate_route_reports_a_non_method_against_its_field_never_500(bad):
    # The pre-flight answers 200 with `ok: false` and the issues; what matters is
    # that it answers at all, and names the field.
    res = client.post("/engine/v1/validate", json={"params": {**PARAMS, "dlom_method": bad}, "inputs": INPUTS})
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["ok"] is False
    assert [e["field"] for e in body["errors"]] == ["params.dlom_method"]


def test_the_refusal_names_the_field_and_the_valid_methods():
    res = client.post("/engine/v1/validate", json={"params": {**PARAMS, "dlom_method": "finerty"}, "inputs": INPUTS})
    message = res.json()["errors"][0]["message"]
    assert "finnerty" in message and "qualitative" in message and "finerty" in message


def test_an_oversized_method_name_is_bounded_in_the_message():
    with pytest.raises(EngineInputError) as err:
        compute({**PARAMS, "dlom_method": "x" * 100_000}, INPUTS)
    assert len(str(err.value)) < 1_000


@pytest.mark.parametrize("absent", [{}, {"dlom_method": None}])
def test_an_absent_or_null_method_still_means_use_the_dlom_supplied(absent):
    out = compute({**PARAMS, **absent, "dlom": 0.3}, INPUTS)
    assert out["results"]["discounts"]["dlom"] == pytest.approx(0.3)


@pytest.mark.parametrize("method", ["chaffee", "finnerty", "ghaidarov", "longstaff"])
def test_the_real_models_still_run(method):
    out = compute({**PARAMS, "dlom_method": method}, INPUTS)
    assert 0.0 < out["results"]["discounts"]["dlom"] < 1.0


def test_qualitative_still_takes_its_figure():
    out = compute({**PARAMS, "dlom_method": "qualitative", "dlom": 0.25}, INPUTS)
    assert out["results"]["discounts"]["dlom"] == pytest.approx(0.25)


@pytest.mark.parametrize("value", [[], {}, [None], 5, None, "abc", True])
def test_the_model_predicate_is_total_over_any_json_value(value):
    assert is_model_dlom_method(value) is False
    assert selects_model_dlom({"dlom_method": value}) is False
    assert selects_model_dlom({"dlom_methods": [{"method": value, "weight": 1.0}]}) is False


def test_the_model_predicate_still_sees_a_model_inside_a_blend():
    assert is_model_dlom_method("finnerty") is True
    assert selects_model_dlom({"dlom_methods": [{"method": "finnerty", "weight": 0.5}]}) is True
