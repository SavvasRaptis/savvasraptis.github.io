FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    SCVIEWER_CACHE_DIR=/var/lib/scviewer/cache

WORKDIR /app

COPY backend/requirements.txt /app/requirements.txt
RUN pip install --upgrade pip && pip install -r /app/requirements.txt

COPY backend/scviewer_api /app/scviewer_api

EXPOSE 8000

CMD ["uvicorn", "scviewer_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
