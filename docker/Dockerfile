# PocoClass - Document Classification System for Paperless-ngx
# Multi-stage Docker build

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci --silent

COPY frontend/ ./
RUN npm run build

# Stage 2: Python runtime
FROM python:3.11-slim AS runtime

LABEL maintainer="PocoClass"
LABEL description="Document Classification System for Paperless-ngx"
LABEL version="2.0"

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV FLASK_ENV=production
ENV POCOCLASS_DATA_DIR=/app/data

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

RUN groupadd --gid 1000 pococlass \
    && useradd --uid 1000 --gid pococlass --shell /bin/bash --create-home pococlass

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt gunicorn

COPY api.py ./
COPY api_client.py ./
COPY background_processor.py ./
COPY config.py ./
COPY database.py ./
COPY document_dict.py ./
COPY metadata_processor.py ./
COPY pattern_matcher.py ./
COPY rule_loader.py ./
COPY scoring_calculator_v2.py ./
COPY sync_service.py ./
COPY test_engine.py ./

COPY rules/ ./rules/
COPY scripts/ ./scripts/

COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

COPY docker/docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

RUN mkdir -p /app/data \
    && chown -R pococlass:pococlass /app

USER pococlass

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

VOLUME ["/app/data"]

ENTRYPOINT ["./docker-entrypoint.sh"]
