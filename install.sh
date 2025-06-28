#!/bin/bash
# POCOmeta Installation Script for Existing Paperless-ngx Setup

set -e

PAPERLESS_SCRIPTS_DIR="/home/paperless/paperless-ngx/scripts"
POCO_DIR="$PAPERLESS_SCRIPTS_DIR/POCOmeta"

echo "=== POCOmeta Installation for Paperless-ngx ==="
echo

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    echo "This script needs to be run with sudo to create directories"
    echo "Usage: sudo ./install.sh"
    exit 1
fi

# 1. Create scripts directory if it doesn't exist
echo "1. Setting up directories..."
mkdir -p "$PAPERLESS_SCRIPTS_DIR"
echo "✓ Created $PAPERLESS_SCRIPTS_DIR"

# 2. Copy POCOmeta files
echo "2. Installing POCOmeta files..."
if [ -d "$POCO_DIR" ]; then
    echo "⚠️  POCOmeta directory already exists. Backing up..."
    mv "$POCO_DIR" "${POCO_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Copy all Python files
cp -r . "$POCO_DIR"
echo "✓ Copied POCOmeta files to $POCO_DIR"

# 3. Copy wrapper script
echo "3. Installing wrapper script..."
cp poco_wrapper.sh "$PAPERLESS_SCRIPTS_DIR/poco_wrapper.sh"
chmod +x "$PAPERLESS_SCRIPTS_DIR/poco_wrapper.sh"
echo "✓ Installed poco_wrapper.sh"

# 4. Set proper ownership
echo "4. Setting permissions..."
chown -R paperless:paperless "$PAPERLESS_SCRIPTS_DIR"
echo "✓ Set ownership to paperless:paperless"

# 5. Create example rule file
echo "5. Setting up example rules..."
if [ ! -f "$POCO_DIR/rules/example_bank_statement.yml" ]; then
    mkdir -p "$POCO_DIR/rules"
    cat > "$POCO_DIR/rules/example_bank_statement.yml" << 'EOF'
rule_id: "example_bank"
name: "Example Bank Statement"
description: "Example rule for bank statements"

identifiers:
  core:
    - type: "match"
      conditions:
        - field: "content"
          pattern: "bank|statement|balance"
          flags: ["ignorecase"]

metadata:
  correspondent: "My Bank"
  document_type: "Bank Statement"
  tags: ["finance", "bank"]
EOF
    echo "✓ Created example rule file"
fi

echo
echo "=== Installation Complete ==="
echo
echo "Next steps:"
echo "1. Update your Dockerfile to include:"
echo "   RUN pip3 install requests pyyaml tabulate"
echo
echo "2. Update your docker-compose.yml to add volume:"
echo "   - $PAPERLESS_SCRIPTS_DIR:/usr/src/paperless/scripts:rw"
echo
echo "3. Configure POCOmeta by editing:"
echo "   $POCO_DIR/settings.py"
echo
echo "4. Add to paperless.env:"
echo "   PAPERLESS_POST_CONSUME_SCRIPT=python3 -m scripts.POCOmeta.main"
echo
echo "5. Rebuild and restart your containers:"
echo "   docker compose build && docker compose up -d"
echo
echo "6. Test the installation:"
echo "   docker compose exec webserver python3 -m scripts.POCOmeta.main --dry-run --verbose"
echo
echo "For detailed instructions, see INSTALLATION.md"