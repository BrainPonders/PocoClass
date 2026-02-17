# PocoClass - Document Classification System for Paperless-ngx
# Multi-stage Docker build using 11notes/python (rootless, Alpine-based)

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci --silent

COPY frontend/ ./
RUN npm run build

# Stage 2: Python runtime (11notes/python - rootless Alpine)
FROM 11notes/python:3.13 AS runtime

ARG BUILD_NUMBER=dev

LABEL maintainer="PocoClass"
LABEL description="Document Classification System for Paperless-ngx"
LABEL version="2.0"

ENV FLASK_ENV=production
ENV POCOCLASS_DATA_DIR=/app/data
ENV POCOCLASS_BUILD_NUMBER=${BUILD_NUMBER}

USER root

RUN set -ex; \
    apk add --no-cache curl bash libgcc libstdc++;

WORKDIR /app

COPY requirements.txt ./
RUN set -ex; \
    pip install \
      -f https://11notes.github.io/python-wheels/ \
      --no-cache-dir \
      -r requirements.txt \
      gunicorn;

COPY api.py ./
COPY api_client.py ./
COPY background_processor.py ./
COPY config.py ./
COPY database.py ./
COPY metadata_processor.py ./
COPY pattern_matcher.py ./
COPY rule_loader.py ./
COPY scoring_calculator_v2.py ./
COPY sync_service.py ./
COPY test_engine.py ./

COPY rules/ ./rules/
COPY scripts/ ./scripts/
RUN chmod +x scripts/post-consumption/pococlass_trigger.sh

COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

COPY docker/docker-entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

RUN set -ex; \
    mkdir -p /app/data; \
    chown -R 1000:1000 /app;

USER docker

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

VOLUME ["/app/data"]

ENTRYPOINT ["/usr/local/bin/tini", "--", "/usr/local/bin/entrypoint.sh"]
