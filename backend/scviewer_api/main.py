from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .cache_store import atomic_write_lines, year_csv_path
from .catalog import SPACECRAFT_CATALOG
from .service import gse_track_for_spacecraft, parse_ids, parse_step
from .settings import load_settings

settings = load_settings()
app = FastAPI(title="SC Viewer Ephemeris API", version="1.0.0")
logger = logging.getLogger(__name__)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.allowed_origins),
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/catalog")
def catalog() -> list[dict[str, str]]:
    return [
        {
            "id": sc.id,
            "name": sc.name,
            "horizons_id": sc.horizons_id,
            "group": sc.group,
            "symbol": sc.symbol,
        }
        for sc in SPACECRAFT_CATALOG
    ]


@app.get("/positions")
def positions(
    ids: str = Query(..., description="Comma-separated spacecraft ids"),
    start: str = Query(..., description="UTC ISO start time"),
    end: str = Query(..., description="UTC ISO end time"),
    step: str = Query("1h", description="Cadence, e.g. 10m or 1h"),
) -> dict[str, list[dict[str, Any]]]:
    try:
        spacecraft = parse_ids(ids)
        step_value, _ = parse_step(step)
        sun_cache: dict[tuple[str, str, str], tuple[list[str], Any]] = {}
        payload: dict[str, list[dict[str, Any]]] = {}
        for sc in spacecraft:
            try:
                payload[sc.id] = gse_track_for_spacecraft(
                    sc,
                    start,
                    end,
                    step_value,
                    cache_root=settings.cache_dir,
                    chunk_days=settings.chunk_days,
                    sun_cache=sun_cache,
                )
            except Exception as exc:  # pragma: no cover - defensive per-target guard
                logger.warning("Positions query failed for %s: %s", sc.id, exc)
                payload[sc.id] = []
        return payload
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - defensive guard for upstream failures
        raise HTTPException(status_code=502, detail=f"Ephemeris request failed: {exc}") from exc


def _ensure_year_csv(spacecraft, year: int, step: str) -> Path:
    path = year_csv_path(settings.cache_dir, spacecraft.id, year, step)
    if path.exists():
        return path

    start = f"{year:04d}-01-01T00:00:00Z"
    end = f"{year + 1:04d}-01-01T00:00:00Z"

    rows = gse_track_for_spacecraft(
        spacecraft,
        start,
        end,
        step,
        cache_root=settings.cache_dir,
        chunk_days=settings.chunk_days,
        sun_cache={},
    )

    lines = ["epoch_utc,x_km,y_km,z_km,id\n"]
    lines.extend(f"{row['t']},{row['x']},{row['y']},{row['z']},{spacecraft.id}\n" for row in rows)
    atomic_write_lines(path, lines)
    return path


@app.get("/positions/year")
def positions_year(
    ids: str = Query(..., description="Comma-separated spacecraft ids"),
    year: int = Query(..., description="Calendar year, e.g. 2025"),
    step: str = Query("1h", description="Cadence, e.g. 10m or 1h"),
) -> StreamingResponse:
    if year < 1900 or year > 2500:
        raise HTTPException(status_code=400, detail="year must be between 1900 and 2500.")

    try:
        spacecraft = parse_ids(ids)
        step_value, _ = parse_step(step)
        cache_paths: list[Path] = []
        for sc in spacecraft:
            try:
                cache_paths.append(_ensure_year_csv(sc, year, step_value))
            except Exception as exc:  # pragma: no cover - defensive per-target guard
                logger.warning("Year CSV generation failed for %s: %s", sc.id, exc)
        if not cache_paths:
            raise RuntimeError("Failed to generate year CSV for all requested spacecraft.")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=502, detail=f"Year export failed: {exc}") from exc

    def stream():
        yield "epoch_utc,x_km,y_km,z_km,id\n"
        for csv_path in cache_paths:
            with csv_path.open("r", encoding="utf-8") as handle:
                next(handle, None)  # Skip header in per-id cache files.
                for line in handle:
                    yield line

    headers = {"Content-Disposition": f'attachment; filename="positions_{year}_{step_value}.csv"'}
    return StreamingResponse(stream(), media_type="text/csv", headers=headers)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
