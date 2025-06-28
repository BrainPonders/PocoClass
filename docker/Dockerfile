# Dockerfile for Paperless-ngx with POCOmeta Integration
# Based on official paperless-ngx image with POCOmeta added

FROM ghcr.io/paperless-ngx/paperless-ngx:latest

# Install Python dependencies for POCOmeta
USER root
RUN pip install --no-cache-dir requests pyyaml tabulate

# Create POCOmeta directory structure
RUN mkdir -p /usr/src/paperless/scripts/post_consume/POCOmeta/rules

# Copy POCOmeta files
COPY scripts/post_consume/ /usr/src/paperless/scripts/post_consume/
COPY main.py /usr/src/paperless/scripts/post_consume/POCOmeta/
COPY api_client.py /usr/src/paperless/scripts/post_consume/POCOmeta/
COPY config.py /usr/src/paperless/scripts/post_consume/POCOmeta/
COPY document_dict.py /usr/src/paperless/scripts/post_consume/POCOmeta/
COPY metadata_processor.py /usr/src/paperless/scripts/post_consume/POCOmeta/
COPY output_generator.py /usr/src/paperless/scripts/post_consume/POCOmeta/
COPY pattern_matcher.py /usr/src/paperless/scripts/post_consume/POCOmeta/
COPY processor_pipeline.py /usr/src/paperless/scripts/post_consume/POCOmeta/
COPY rule_loader.py /usr/src/paperless/scripts/post_consume/POCOmeta/
COPY scoring_calculator.py /usr/src/paperless/scripts/post_consume/POCOmeta/
COPY settings.py /usr/src/paperless/scripts/post_consume/POCOmeta/
COPY __init__.py /usr/src/paperless/scripts/post_consume/POCOmeta/

# Copy example rules (users should replace with their own)
COPY rules/ /usr/src/paperless/scripts/post_consume/POCOmeta/rules/

# Make scripts executable
RUN chmod +x /usr/src/paperless/scripts/post_consume/*.sh

# Create logs directory
RUN mkdir -p /usr/src/paperless/scripts/post_consume/POCOmeta/logs && \
    chown -R paperless:paperless /usr/src/paperless/scripts/post_consume/

# Switch back to paperless user
USER paperless

# Environment variables for POCOmeta
ENV POCO_DRY_RUN=false
ENV POCO_VERBOSE=false
ENV POCO_MAX_DOCUMENTS=0
ENV POCO_RULES_DIR=/usr/src/paperless/scripts/post_consume/POCOmeta/rules