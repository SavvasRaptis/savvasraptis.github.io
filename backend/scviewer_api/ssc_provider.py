from __future__ import annotations

import os
from datetime import UTC, datetime, timedelta

import numpy as np

EXTERNAL_IDS = {
    "THA",
    "THD",
    "THE",
    "CL1",
    "CL2",
    "CL3",
    "CL4",
    "GEOTAIL",
}

SSC_OBSERVATORY_CANDIDATES_BY_SC: dict[str, tuple[str, ...]] = {
    "THA": ("themisa", "tha", "themis-a"),
    "THD": ("themisd", "thd", "themis-d"),
    "THE": ("themise", "the", "themis-e"),
    "CL1": ("cluster1", "cl1", "cluster-1"),
    "CL2": ("cluster2", "cl2", "cluster-2"),
    "CL3": ("cluster3", "cl3", "cluster-3"),
    "CL4": ("cluster4", "cl4", "cluster-4"),
    "GEOTAIL": ("geotail", "geo_tail", "ge"),
}

MISSION_WINDOWS_UTC: dict[str, tuple[datetime, datetime | None]] = {
    "THA": (datetime(2007, 2, 17, 0, 0, tzinfo=UTC), None),
    "THD": (datetime(2007, 2, 17, 0, 0, tzinfo=UTC), None),
    "THE": (datetime(2007, 2, 17, 0, 0, tzinfo=UTC), None),
    "CL1": (datetime(2000, 7, 16, 0, 0, tzinfo=UTC), datetime(2024, 9, 8, 23, 59, tzinfo=UTC)),
    "CL2": (datetime(2000, 7, 16, 0, 0, tzinfo=UTC), datetime(2024, 9, 8, 23, 59, tzinfo=UTC)),
    "CL3": (datetime(2000, 7, 16, 0, 0, tzinfo=UTC), datetime(2024, 9, 8, 23, 59, tzinfo=UTC)),
    "CL4": (datetime(2000, 7, 16, 0, 0, tzinfo=UTC), datetime(2024, 9, 8, 23, 59, tzinfo=UTC)),
    "GEOTAIL": (datetime(1992, 7, 24, 0, 0, tzinfo=UTC), datetime(2022, 11, 28, 23, 59, tzinfo=UTC)),
}

FAIL_FAST_MINUTES = int(os.getenv("SCVIEWER_SSC_FAILFAST_MINUTES", "5"))
_FAIL_FAST_UNTIL: dict[str, datetime] = {}
_SSC_CLIENT = None
_OBS_IDS: set[str] | None = None
SSC_TIMEOUT_SEC = float(os.getenv("SCVIEWER_SSC_TIMEOUT_SEC", "10"))


def uses_external_provider(spacecraft_id: str) -> bool:
    return spacecraft_id in EXTERNAL_IDS


def _is_empty(value) -> bool:
    if value is None:
        return True
    try:
        return len(value) == 0
    except Exception:
        return False


def _iso_z(value: datetime) -> str:
    return value.astimezone(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _as_datetime(value) -> datetime:
    if isinstance(value, datetime):
        return value.astimezone(UTC)
    text = str(value)
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    return datetime.fromisoformat(text).astimezone(UTC)


def _build_target_grid(start: datetime, end: datetime, step: timedelta) -> list[datetime]:
    out: list[datetime] = []
    cursor = start
    while cursor <= end:
        out.append(cursor)
        cursor += step
    return out


def _interpolate_rows(
    src_t: np.ndarray,
    src_xyz: np.ndarray,
    start: datetime,
    end: datetime,
    step: timedelta,
) -> list[dict[str, float | str]]:
    if src_t.size == 0:
        return []

    targets = _build_target_grid(start, end, step)
    if not targets:
        return []

    target_s = np.array([t.timestamp() for t in targets], dtype=float)
    src_s = src_t.astype(float)
    mask = (target_s >= src_s.min()) & (target_s <= src_s.max())
    if not np.any(mask):
        return []

    valid_target_s = target_s[mask]
    valid_targets = [targets[i] for i, ok in enumerate(mask) if ok]

    x = np.interp(valid_target_s, src_s, src_xyz[:, 0])
    y = np.interp(valid_target_s, src_s, src_xyz[:, 1])
    z = np.interp(valid_target_s, src_s, src_xyz[:, 2])

    return [
        {
            "t": _iso_z(t),
            "x": float(xi),
            "y": float(yi),
            "z": float(zi),
        }
        for t, xi, yi, zi in zip(valid_targets, x, y, z, strict=True)
    ]


def _get_ssc():
    global _SSC_CLIENT
    if _SSC_CLIENT is not None:
        return _SSC_CLIENT
    from sscws.sscws import SscWs

    _SSC_CLIENT = SscWs(timeout=SSC_TIMEOUT_SEC)
    return _SSC_CLIENT


def _get_observatory_ids() -> set[str]:
    global _OBS_IDS
    if _OBS_IDS is not None:
        return _OBS_IDS

    ssc = _get_ssc()
    try:
        data = ssc.get_observatories()
        obs = data.get("Observatory", [])
        _OBS_IDS = {str(o.get("Id", "")).strip().lower() for o in obs if o.get("Id")}
    except Exception:
        _OBS_IDS = set()
    return _OBS_IDS


def _resolve_observatory_candidates(spacecraft_id: str) -> list[str]:
    candidates = list(SSC_OBSERVATORY_CANDIDATES_BY_SC.get(spacecraft_id, ()))
    if not candidates:
        return []

    known = _get_observatory_ids()
    if not known:
        return candidates

    matched = [c for c in candidates if c.lower() in known]
    if matched:
        # Try known-valid IDs first.
        remaining = [c for c in candidates if c not in matched]
        return matched + remaining
    return candidates


def _clip_to_mission_window(spacecraft_id: str, start: datetime, end: datetime) -> tuple[datetime, datetime] | None:
    window = MISSION_WINDOWS_UTC.get(spacecraft_id)
    if window is None:
        return start, end
    min_t, max_t = window
    clipped_start = max(start, min_t)
    clipped_end = end if max_t is None else min(end, max_t)
    if clipped_end <= clipped_start:
        return None
    return clipped_start, clipped_end


def _pick_coordinates_blob(data_entry: dict) -> dict:
    coords = data_entry.get("Coordinates", [])
    if _is_empty(coords):
        raise RuntimeError("SSC response missing Coordinates.")

    # Prefer an explicitly GSE-tagged coordinate set if present.
    for blob in coords:
        blob_text = str(blob).upper()
        if "GSE" in blob_text:
            return blob
    return coords[0]


def fetch_external_gse_track(
    spacecraft_id: str,
    start: datetime,
    end: datetime,
    step: timedelta,
) -> list[dict[str, float | str]]:
    now = datetime.now(UTC)
    fail_until = _FAIL_FAST_UNTIL.get(spacecraft_id)
    if fail_until and now < fail_until:
        raise RuntimeError(f"SSC temporarily unavailable for {spacecraft_id}; retry after {fail_until.isoformat()}")

    observatory_candidates = _resolve_observatory_candidates(spacecraft_id)
    if not observatory_candidates:
        raise RuntimeError(f"No SSC observatory mapping for {spacecraft_id}.")

    clipped = _clip_to_mission_window(spacecraft_id, start, end)
    if clipped is None:
        return []
    start, end = clipped

    ssc = _get_ssc()
    from sscws.coordinates import CoordinateSystem

    result = None
    last_error: Exception | None = None
    for observatory in observatory_candidates:
        try:
            result = ssc.get_locations(
                [observatory],
                [_iso_z(start), _iso_z(end)],
                coords=[CoordinateSystem.GSE],
            )
        except Exception as exc:
            last_error = exc
            continue
        if result.get("HttpStatus", 200) == 200:
            break
        err = result.get("ErrorMessage") or result.get("HttpText") or f"HttpStatus={result.get('HttpStatus')}"
        last_error = RuntimeError(err)
        result = None

    if result is None:
        _FAIL_FAST_UNTIL[spacecraft_id] = now + timedelta(minutes=FAIL_FAST_MINUTES)
        raise RuntimeError(f"SSC request failed for {spacecraft_id}: {last_error}") from last_error

    data_entries = result.get("Data", [])
    if _is_empty(data_entries):
        return []

    data_entry = data_entries[0]
    times = data_entry.get("Time", [])
    if _is_empty(times):
        return []

    coords_blob = _pick_coordinates_blob(data_entry)
    x_raw = coords_blob.get("X", [])
    y_raw = coords_blob.get("Y", [])
    z_raw = coords_blob.get("Z", [])

    size = min(len(times), len(x_raw), len(y_raw), len(z_raw))
    if size == 0:
        return []

    ts: list[float] = []
    xyz: list[tuple[float, float, float]] = []
    for i in range(size):
        try:
            t = _as_datetime(times[i]).timestamp()
            x = float(x_raw[i])
            y = float(y_raw[i])
            z = float(z_raw[i])
        except Exception:
            continue
        ts.append(t)
        xyz.append((x, y, z))

    if len(ts) == 0:
        return []

    order = np.argsort(np.array(ts))
    t_arr = np.array(ts, dtype=float)[order]
    xyz_arr = np.array(xyz, dtype=float)[order]
    return _interpolate_rows(t_arr, xyz_arr, start, end, step)
