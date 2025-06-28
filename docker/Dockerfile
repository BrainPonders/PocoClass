FROM ghcr.io/paperless-ngx/paperless-ngx:latest

# Install OCR languages
RUN apt-get update && \
    apt-get install -y tesseract-ocr-nld && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies for POCOmeta
RUN pip3 install --no-cache-dir requests pyyaml tabulate

# Create scripts directory structure
RUN mkdir -p /usr/src/paperless/scripts/post_consume

# Copy POCOmeta wrapper script
COPY scripts/post_consume/poco_wrapper.sh /usr/src/paperless/scripts/post_consume/
RUN chmod +x /usr/src/paperless/scripts/post_consume/poco_wrapper.sh
