from __future__ import annotations

from collections.abc import Iterable
from datetime import UTC, datetime, timedelta
import warnings

import numpy as np
from astroquery.jplhorizons import Horizons
from astropy.time import Time
from astropy.utils.exceptions import AstropyDeprecationWarning

from .cache_store import read_json_cache, write_json_cache
from .ssc_provider import fetch_external_gse_track, uses_external_provider
from .catalog import SPACECRAFT_BY_ID, Spacecraft

AU_KM = 149_597_870.7
STEP_RE = {"m", "h", "d"}
IMAP_EARLIEST_UTC = datetime(2025, 9, 24, 13, 1, 9, tzinfo=UTC)
JUICE_EARLIEST_UTC = datetime(2023, 4, 14, 12, 43, 27, tzinfo=UTC)

# Astroquery currently emits a noisy deprecation around id_type internals.
warnings.filterwarnings(
    "ignore",
    message=r".*id_type.*majorbody.*deprecated.*",
    category=AstropyDeprecationWarning,
)
warnings.filterwarnings(
    "ignore",
    category=AstropyDeprecationWarning,
    module=r"astroquery\.jplhorizons\..*",
)


def parse_ids(ids_csv: str) -> list[Spacecraft]:
    ids = [item.strip().upper() for item in ids_csv.split(",") if item.strip()]
    if not ids:
        raise ValueError("At least one spacecraft id is required.")
    missing = [item for item in ids if item not in SPACECRAFT_BY_ID]
    if missing:
        raise ValueError(f"Unsupported spacecraft id(s): {', '.join(missing)}")
    return [SPACECRAFT_BY_ID[item] for item in ids]


def parse_iso_utc(value: str) -> datetime:
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError(f"Invalid datetime: {value}") from exc
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)


def parse_step(value: str) -> tuple[str, timedelta]:
    if len(value) < 2:
        raise ValueError("Invalid step format.")
    unit = value[-1]
    if unit not in STEP_RE:
        raise ValueError("step must end with m, h, or d.")
    magnitude = int(value[:-1])
    if magnitude <= 0:
        raise ValueError("step must be a positive duration.")
    if unit == "m":
        return value, timedelta(minutes=magnitude)
    if unit == "h":
        return value, timedelta(hours=magnitude)
    return value, timedelta(days=magnitude)


def _horizons_time(value: datetime) -> str:
    return value.strftime("%Y-%m-%d %H:%M")


def _iter_chunks(start: datetime, end: datetime, chunk_days: int) -> Iterable[tuple[datetime, datetime]]:
    cursor = start
    max_span = timedelta(days=chunk_days)
    while cursor < end:
        stop = min(cursor + max_span, end)
        yield cursor, stop
        cursor = stop


def _table_to_vectors(table) -> tuple[list[str], np.ndarray]:
    # Horizons outputs epoch as JD and vectors in AU.
    times = Time(table["datetime_jd"], format="jd", scale="tdb").utc
    iso = [ts.isot + "Z" for ts in times]
    vectors = np.column_stack(
        (
            np.array(table["x"], dtype=float),
            np.array(table["y"], dtype=float),
            np.array(table["z"], dtype=float),
        )
    )
    return iso, vectors


def _query_vectors_table(horizons_id: str, start: datetime, end: datetime, step: str):
    """
    Query Horizons vectors with tolerant id_type fallback.
    Some spacecraft IDs (negative command IDs) fail when forced through id_type='id'.
    """
    epochs = {"start": _horizons_time(start), "stop": _horizons_time(end), "step": step}
    try:
        return Horizons(id=horizons_id, location="@399", epochs=epochs).vectors(refplane="earth")
    except Exception as exc:  # pragma: no cover - depends on remote Horizons behavior
        raise RuntimeError(str(exc)) from exc


def fetch_horizons_vectors(horizons_id: str, start: datetime, end: datetime, step: str, chunk_days: int) -> tuple[list[str], np.ndarray]:
    epochs: list[str] = []
    rows: list[np.ndarray] = []

    for chunk_start, chunk_end in _iter_chunks(start, end, chunk_days):
        table = _query_vectors_table(horizons_id, chunk_start, chunk_end, step)
        chunk_epochs, chunk_vectors = _table_to_vectors(table)
        for epoch, vector in zip(chunk_epochs, chunk_vectors, strict=True):
            if epochs and epoch == epochs[-1]:
                continue
            epochs.append(epoch)
            rows.append(vector)

    if not rows:
        return [], np.empty((0, 3))
    return epochs, np.stack(rows)


def rotate_to_gse(spacecraft_au: np.ndarray, sun_au: np.ndarray) -> np.ndarray:
    if spacecraft_au.shape != sun_au.shape:
        size = min(len(spacecraft_au), len(sun_au))
        spacecraft_au = spacecraft_au[:size]
        sun_au = sun_au[:size]

    output = np.empty_like(spacecraft_au, dtype=float)
    z_ref = np.array([0.0, 0.0, 1.0], dtype=float)

    for i in range(len(spacecraft_au)):
        sun = sun_au[i]
        sun_norm = np.linalg.norm(sun)
        if sun_norm == 0.0:
            raise ValueError("Encountered zero Sun vector while building GSE basis.")
        x_hat = sun / sun_norm
        y_axis = np.cross(z_ref, x_hat)
        y_norm = np.linalg.norm(y_axis)
        if y_norm == 0.0:
            raise ValueError("Degenerate GSE basis (y-axis norm is zero).")
        y_hat = y_axis / y_norm
        z_hat = np.cross(x_hat, y_hat)

        vec_km = spacecraft_au[i] * AU_KM
        output[i, 0] = float(np.dot(vec_km, x_hat))
        output[i, 1] = float(np.dot(vec_km, y_hat))
        output[i, 2] = float(np.dot(vec_km, z_hat))

    return output


def _apply_mission_time_guard(spacecraft_id: str, start_dt: datetime, end_dt: datetime) -> tuple[datetime, datetime] | None:
    if spacecraft_id == "IMAP":
        if end_dt <= IMAP_EARLIEST_UTC:
            return None
        start_dt = max(start_dt, IMAP_EARLIEST_UTC)
    if spacecraft_id == "JUICE":
        if end_dt <= JUICE_EARLIEST_UTC:
            return None
        start_dt = max(start_dt, JUICE_EARLIEST_UTC)
    return start_dt, end_dt


def gse_track_for_spacecraft(
    spacecraft: Spacecraft,
    start: str,
    end: str,
    step: str,
    *,
    cache_root,
    chunk_days: int,
    sun_cache: dict[tuple[str, str, str], tuple[list[str], np.ndarray]],
) -> list[dict[str, float | str]]:
    cached = read_json_cache(cache_root, spacecraft.id, start, end, step)
    if cached is not None:
        return cached

    start_dt = parse_iso_utc(start)
    end_dt = parse_iso_utc(end)
    if end_dt <= start_dt:
        raise ValueError("end must be after start.")
    guarded = _apply_mission_time_guard(spacecraft.id, start_dt, end_dt)
    if guarded is None:
        return []
    start_dt, end_dt = guarded

    step_value, step_delta = parse_step(step)

    if uses_external_provider(spacecraft.id):
        rows = fetch_external_gse_track(spacecraft.id, start_dt, end_dt, step_delta)
        if rows:
            write_json_cache(cache_root, spacecraft.id, start, end, step_value, rows)
        return rows

    key = (start, end, step_value)
    if key not in sun_cache:
        sun_cache[key] = fetch_horizons_vectors("10", start_dt, end_dt, step_value, chunk_days)
    sun_epochs, sun_vectors = sun_cache[key]

    candidates = [spacecraft.horizons_id, *spacecraft.horizons_aliases]
    sc_epochs: list[str] = []
    sc_vectors: np.ndarray = np.empty((0, 3))
    last_error: Exception | None = None
    for candidate in candidates:
        try:
            sc_epochs, sc_vectors = fetch_horizons_vectors(candidate, start_dt, end_dt, step_value, chunk_days)
            break
        except Exception as exc:
            last_error = exc
            continue
    if len(sc_vectors) == 0 and last_error is not None:
        raise last_error
    size = min(len(sc_epochs), len(sun_epochs), len(sc_vectors), len(sun_vectors))
    sc_epochs = sc_epochs[:size]
    sc_vectors = sc_vectors[:size]
    sun_vectors = sun_vectors[:size]

    gse_km = rotate_to_gse(sc_vectors, sun_vectors)
    rows = [
        {
            "t": sc_epochs[i],
            "x": float(gse_km[i, 0]),
            "y": float(gse_km[i, 1]),
            "z": float(gse_km[i, 2]),
        }
        for i in range(size)
    ]
    if rows:
        write_json_cache(cache_root, spacecraft.id, start, end, step_value, rows)
    return rows
