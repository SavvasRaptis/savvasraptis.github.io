# SC Viewer Backend

FastAPI service for spacecraft trajectories in GSE coordinates.

Data providers:

- JPL Horizons (default for supported missions)
- SSCWeb (`sscws`) for THEMIS-A/D/E, Cluster-1..4, Geotail

## Endpoints

- `GET /positions?ids=DSCOVR,ACE&start=...&end=...&step=1h`
- `GET /positions/year?ids=DSCOVR&year=2025&step=1h`
- `GET /catalog`

## Local run

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn scviewer_api.main:app --app-dir backend --reload --host 0.0.0.0 --port 8000
```

## Configuration

- `SCVIEWER_ALLOWED_ORIGINS` (comma-separated origins)
- `SCVIEWER_CACHE_DIR` (default `./backend/data/cache`)
- `SCVIEWER_HORIZONS_CHUNK_DAYS` (default `31`)
- `SCVIEWER_SSC_TIMEOUT_SEC` (default `10`)
- `SCVIEWER_SSC_FAILFAST_MINUTES` (default `5`)

## Notes

- No JPL Horizons API key is required.
- Positions are returned in **km** and transformed into **GSE** per epoch.
- Catalog entries include `horizons_id` for frontend/backend contract compatibility.

## Render deploy

See [deploy/render/README.md](./deploy/render/README.md).
