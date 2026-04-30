# Render Deployment (Free Web Service)

This backend is deployed separately from GitHub Pages.

Optional blueprint template:

- `backend/deploy/render/render.yaml` (copy to repo root as `render.yaml` if you want Render Blueprint deploy)

## 1) Create the Render web service

In Render Dashboard:

- New -> Web Service
- Connect this GitHub repository
- Root Directory: leave empty (repo root)
- Runtime: `Python 3`

Use:

- Build Command: `pip install -r backend/requirements.txt`
- Start Command: `uvicorn scviewer_api.main:app --app-dir backend --host 0.0.0.0 --port $PORT`

## 2) Environment variables

Set these in Render:

- `SCVIEWER_ALLOWED_ORIGINS=https://savvasraptis.github.io`
- `SCVIEWER_CACHE_DIR=/tmp/scviewer-cache`
- `SCVIEWER_HORIZONS_CHUNK_DAYS=31`

Optional:

- `SCVIEWER_SSC_TIMEOUT_SEC=10`
- `SCVIEWER_SSC_FAILFAST_MINUTES=5`

## 3) Verify deployment

After deploy completes:

- `GET /health` -> `{"status":"ok"}`
- `GET /catalog`
- `GET /positions?ids=DSCOVR,ACE&start=2025-01-01T00:00:00Z&end=2025-01-02T00:00:00Z&step=1h`

## 4) Frontend API URL

Set the viewer API base in `assets/1_SCviewer/Spacecraft Location Viewer/Heliospheric Locator.html`:

```html
<script>
  window.SC_API_BASE = "https://<your-service>.onrender.com";
</script>
```

Render Free sleeps after inactivity and uses ephemeral local storage. On cold start,
cached files are rebuilt automatically.
