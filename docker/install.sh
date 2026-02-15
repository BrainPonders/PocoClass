#!/bin/bash
###############################################################################
#
#  PocoClass Installer
#  Builds a secure Docker image and prepares everything for deployment
#
#  Usage:  bash install.sh
#
###############################################################################

set -e

POCOCLASS_VERSION="2.0"
IMAGE_NAME="pococlass"
IMAGE_TAG="latest"
INSTALL_DIR="$(pwd)/pococlass"

# ---- Colours for output ----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  PocoClass v${POCOCLASS_VERSION} Installer${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

print_step() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# ---- Pre-flight checks ----

check_requirements() {
    echo "Checking requirements..."
    echo ""

    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        echo "  Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi
    print_step "Docker found: $(docker --version | head -1)"

    if ! docker info &> /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_step "Docker is running"

    if ! command -v docker compose &> /dev/null && ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not available."
        echo "  Docker Compose V2 is included with modern Docker installations."
        exit 1
    fi
    print_step "Docker Compose available"

    echo ""
}

# ---- Build the Docker image ----

build_image() {
    echo "Building PocoClass Docker image..."
    echo "  This may take a few minutes on the first build."
    echo ""

    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

    if [ ! -f "$PROJECT_ROOT/docker/Dockerfile" ]; then
        if [ -f "./Dockerfile" ]; then
            PROJECT_ROOT="$(dirname "$(pwd)")"
            SCRIPT_DIR="$(pwd)"
        else
            print_error "Cannot find Dockerfile. Run this script from the docker/ directory or the project root."
            exit 1
        fi
    fi

    docker build \
        -t "${IMAGE_NAME}:${IMAGE_TAG}" \
        -f "$PROJECT_ROOT/docker/Dockerfile" \
        "$PROJECT_ROOT"

    echo ""
    print_step "Docker image built: ${IMAGE_NAME}:${IMAGE_TAG}"
}

# ---- Set up the installation directory ----

setup_install_dir() {
    echo ""
    echo "Setting up installation directory: ${INSTALL_DIR}"
    echo ""

    mkdir -p "$INSTALL_DIR"

    SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null \
              || openssl rand -hex 32 2>/dev/null \
              || head -c 64 /dev/urandom | od -An -tx1 | tr -d ' \n' | head -c 64)

    if [ ! -f "$INSTALL_DIR/.env" ]; then
        cat > "$INSTALL_DIR/.env" <<EOF
# PocoClass Environment Configuration
# Generated on $(date '+%Y-%m-%d %H:%M:%S')

# Secret key for session encryption (auto-generated, do not share)
POCOCLASS_SECRET_KEY=${SECRET_KEY}

# Paperless-ngx URL as seen from inside the Docker network
# Change this to match your Paperless container name
# Tip: run "docker ps" to find your Paperless container name
PAPERLESS_URL=http://paperless-ngx:8000
EOF
        print_step "Generated secret key and .env file"
    else
        print_warning ".env file already exists, keeping existing configuration"
    fi

    mkdir -p "$INSTALL_DIR/rules"
    print_step "Created rules directory"

    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

    if [ ! -f "$PROJECT_ROOT/docker/docker-compose.yml" ]; then
        PROJECT_ROOT="$(dirname "$(pwd)")"
    fi

    cp "$PROJECT_ROOT/docker/docker-compose.yml" "$INSTALL_DIR/docker-compose.yml"
    print_step "Copied docker-compose.yml"

    cp "$PROJECT_ROOT/scripts/pococlass_trigger.sh" "$INSTALL_DIR/pococlass_trigger.sh"
    chmod +x "$INSTALL_DIR/pococlass_trigger.sh"
    print_step "Copied pococlass_trigger.sh (Paperless post-consumption script)"
}

# ---- Print final instructions ----

print_instructions() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  Installation Complete!${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo "  All files are in: ${INSTALL_DIR}"
    echo ""
    echo -e "  ${YELLOW}Next steps:${NC}"
    echo ""
    echo "  1. Edit .env to set your Paperless-ngx container URL:"
    echo ""
    echo "     cd ${INSTALL_DIR}"
    echo "     nano .env"
    echo ""
    echo "  2. Edit docker-compose.yml to match your setup:"
    echo "     - Verify the network name matches your Paperless-ngx network"
    echo "     - Adjust the port if 5000 is already in use"
    echo ""
    echo "     nano docker-compose.yml"
    echo ""
    echo "  3. Start PocoClass:"
    echo "     docker compose up -d"
    echo ""
    echo "  4. Open PocoClass in your browser:"
    echo "     http://your-server:5000"
    echo ""
    echo -e "  ${YELLOW}Post-consumption script (optional):${NC}"
    echo ""
    echo "  To have Paperless-ngx automatically trigger PocoClass after"
    echo "  consuming a document, copy the trigger script:"
    echo ""
    echo "     cp ${INSTALL_DIR}/pococlass_trigger.sh /path/to/paperless/scripts/"
    echo ""
    echo "  Then edit it to set your PocoClass URL and System API Token."
    echo "  See the script comments for detailed setup instructions."
    echo ""
    echo -e "  ${YELLOW}Files in ${INSTALL_DIR}:${NC}"
    echo "     docker-compose.yml       - Docker Compose configuration"
    echo "     .env                     - Secret key and Paperless URL"
    echo "     rules/                   - Place your YAML rule files here"
    echo "     pococlass_trigger.sh     - Paperless post-consumption script"
    echo ""
}

# ---- Main ----

print_header
check_requirements
build_image
setup_install_dir
print_instructions
