from __future__ import annotations

from datetime import UTC, datetime

from scviewer_api.catalog import SPACECRAFT_BY_ID
from scviewer_api.service import IMAP_EARLIEST_UTC, JUICE_EARLIEST_UTC, _apply_mission_time_guard
from scviewer_api.ssc_provider import uses_external_provider


def test_artemis_numeric_horizons_ids():
    assert SPACECRAFT_BY_ID["ARTP1"].horizons_id == "-192"
    assert SPACECRAFT_BY_ID["ARTP2"].horizons_id == "-193"


def test_external_provider_routing_contract():
    assert uses_external_provider("THA")
    assert uses_external_provider("THD")
    assert uses_external_provider("THE")
    assert uses_external_provider("CL1")
    assert uses_external_provider("CL2")
    assert uses_external_provider("CL3")
    assert uses_external_provider("CL4")
    assert uses_external_provider("GEOTAIL")

    assert not uses_external_provider("ARTP1")
    assert not uses_external_provider("ARTP2")
    assert not uses_external_provider("MMS1")
    assert not uses_external_provider("DSCOVR")


def test_mission_window_guards():
    start = datetime(2025, 1, 1, tzinfo=UTC)
    end = datetime(2025, 1, 2, tzinfo=UTC)

    assert _apply_mission_time_guard("IMAP", start, end) is None
    assert _apply_mission_time_guard(
        "JUICE",
        datetime(2023, 1, 1, tzinfo=UTC),
        datetime(2023, 2, 1, tzinfo=UTC),
    ) is None

    imap_ok = _apply_mission_time_guard("IMAP", IMAP_EARLIEST_UTC, datetime(2025, 10, 1, tzinfo=UTC))
    assert imap_ok is not None
    assert imap_ok[0] >= IMAP_EARLIEST_UTC

    juice_ok = _apply_mission_time_guard("JUICE", JUICE_EARLIEST_UTC, datetime(2024, 1, 1, tzinfo=UTC))
    assert juice_ok is not None
    assert juice_ok[0] >= JUICE_EARLIEST_UTC
