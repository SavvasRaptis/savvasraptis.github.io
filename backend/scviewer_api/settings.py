from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def _split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    cache_dir: Path
    allowed_origins: tuple[str, ...]
    chunk_days: int


def load_settings() -> Settings:
    cache_dir = Path(os.getenv("SCVIEWER_CACHE_DIR", "./backend/data/cache")).resolve()
    cache_dir.mkdir(parents=True, exist_ok=True)

    allowed_origins_env = os.getenv("SCVIEWER_ALLOWED_ORIGINS", "https://savvasraptis.github.io")
    allowed_origins = tuple(_split_csv(allowed_origins_env))

    chunk_days = int(os.getenv("SCVIEWER_HORIZONS_CHUNK_DAYS", "31"))
    if chunk_days < 1:
        chunk_days = 31

    return Settings(
        cache_dir=cache_dir,
        allowed_origins=allowed_origins,
        chunk_days=chunk_days,
    )

