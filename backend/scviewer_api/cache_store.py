from __future__ import annotations

import hashlib
import json
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Any


def _hash_key(*parts: str) -> str:
    hasher = hashlib.sha256()
    for part in parts:
        hasher.update(part.encode("utf-8"))
        hasher.update(b"\x00")
    return hasher.hexdigest()


def _atomic_write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as tmp:
        tmp.write(content)
        tmp_path = Path(tmp.name)
    tmp_path.replace(path)


def read_json_cache(cache_root: Path, spacecraft_id: str, start: str, end: str, step: str) -> list[dict[str, Any]] | None:
    key = _hash_key(spacecraft_id, start, end, step)
    path = cache_root / "positions" / spacecraft_id / f"{key}.json"
    if not path.exists():
        return None
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if isinstance(payload, list):
        return payload
    return None


def write_json_cache(cache_root: Path, spacecraft_id: str, start: str, end: str, step: str, rows: list[dict[str, Any]]) -> None:
    key = _hash_key(spacecraft_id, start, end, step)
    path = cache_root / "positions" / spacecraft_id / f"{key}.json"
    _atomic_write_text(path, json.dumps(rows, separators=(",", ":")))


def year_csv_path(cache_root: Path, spacecraft_id: str, year: int, step: str) -> Path:
    return cache_root / "year_csv" / str(year) / step / f"{spacecraft_id}.csv"


def atomic_write_lines(path: Path, lines: list[str]) -> None:
    text = "".join(lines)
    _atomic_write_text(path, text)

