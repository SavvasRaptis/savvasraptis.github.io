from __future__ import annotations

import os
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient

import scviewer_api.main as api_main
from scviewer_api.settings import Settings

RE_KM = 6378.137
L1_X_KM = 1_500_000.0


@pytest.fixture(autouse=True)
def _isolated_cache(tmp_path, monkeypatch):
    monkeypatch.setattr(
        api_main,
        "settings",
        Settings(
            cache_dir=tmp_path / "cache",
            allowed_origins=("https://savvasraptis.github.io",),
            chunk_days=31,
        ),
    )


def _fake_track(spacecraft, start: str, end: str, step: str, **kwargs):
    # Near-L1 synthetic path for smoke tests.
    start_dt = datetime.fromisoformat(start.replace("Z", "+00:00"))
    end_dt = datetime.fromisoformat(end.replace("Z", "+00:00"))
    out = []
    cursor = start_dt
    while cursor <= end_dt:
        out.append(
            {
                "t": cursor.isoformat().replace("+00:00", "Z"),
                "x": L1_X_KM + 20_000.0,
                "y": 5_000.0,
                "z": -3_000.0,
            }
        )
        cursor += timedelta(hours=1 if step.endswith("h") else 24)
    return out


def test_catalog_schema():
    client = TestClient(api_main.app)
    response = client.get("/catalog")
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)
    assert any(item["id"] == "DSCOVR" for item in payload)
    for field in ("id", "name", "horizons_id", "group", "symbol"):
        assert field in payload[0]


def test_positions_contract_and_l1_sanity(monkeypatch):
    monkeypatch.setattr("scviewer_api.main.gse_track_for_spacecraft", _fake_track)
    client = TestClient(api_main.app)

    response = client.get(
        "/positions",
        params={
            "ids": "IMAP,ACE,WIND",
            "start": "2025-01-01T00:00:00Z",
            "end": "2025-01-02T00:00:00Z",
            "step": "1h",
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert set(payload.keys()) == {"IMAP", "ACE", "WIND"}

    for sc_id in ("IMAP", "ACE", "WIND"):
        series = payload[sc_id]
        assert len(series) > 0
        sample = series[0]
        assert all(k in sample for k in ("t", "x", "y", "z"))
        assert sample["t"].endswith("Z")

        # Requested smoke sanity: spacecraft should be within 100 Re from L1.
        dx = sample["x"] - L1_X_KM
        dy = sample["y"]
        dz = sample["z"]
        dist_re = (dx * dx + dy * dy + dz * dz) ** 0.5 / RE_KM
        assert dist_re <= 100.0


def test_planets_contract(monkeypatch):
    monkeypatch.setattr("scviewer_api.main.gse_track_for_planet", lambda *args, **kwargs: _fake_track(None, *args[1:4], **kwargs))
    client = TestClient(api_main.app)

    response = client.get(
        "/planets",
        params={
            "ids": "MERCURY,VENUS,MARS",
            "start": "2025-01-01T00:00:00Z",
            "end": "2025-01-02T00:00:00Z",
            "step": "1h",
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert set(payload.keys()) == {"MERCURY", "VENUS", "MARS"}
    for series in payload.values():
        assert len(series) > 0
        sample = series[0]
        assert all(k in sample for k in ("t", "x", "y", "z"))
        assert sample["t"].endswith("Z")


def test_positions_year_csv(monkeypatch):
    monkeypatch.setattr("scviewer_api.main.gse_track_for_spacecraft", _fake_track)
    client = TestClient(api_main.app)

    response = client.get("/positions/year", params={"ids": "DSCOVR", "year": 2025, "step": "1h"})
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")

    lines = response.text.strip().splitlines()
    assert lines[0] == "epoch_utc,x_km,y_km,z_km,id"
    assert len(lines) > 1
    first_row = lines[1].split(",")
    assert len(first_row) == 5
    assert first_row[-1] == "DSCOVR"


@pytest.mark.skipif(os.getenv("SCVIEWER_LIVE_SMOKE") != "1", reason="Live Horizons smoke test is opt-in.")
def test_live_positions_l1_bound():
    client = TestClient(api_main.app)
    response = client.get(
        "/positions",
        params={
            "ids": "IMAP,ACE,WIND",
            "start": "2025-01-01T00:00:00Z",
            "end": "2025-01-02T00:00:00Z",
            "step": "1h",
        },
        timeout=120,
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    for sc_id in ("IMAP", "ACE", "WIND"):
        assert payload.get(sc_id), f"Missing {sc_id} series"
        for sample in payload[sc_id]:
            dx = sample["x"] - L1_X_KM
            dy = sample["y"]
            dz = sample["z"]
            dist_re = (dx * dx + dy * dy + dz * dz) ** 0.5 / RE_KM
            assert dist_re <= 100.0, f"{sc_id} exceeded 100 Re from L1: {dist_re:.2f}"
