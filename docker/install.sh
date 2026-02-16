#!/bin/bash
###############################################################################
#
#  PocoClass Installer
#  Builds a secure Docker image and prepares everything for deployment
#
#  First install:
#    mkdir ~/pococlass && cd ~/pococlass
#    git clone https://github.com/eRJe79/PocoClass.git source
#    bash source/docker/install.sh
#
#  Update:
#    cd ~/pococlass/source && git pull
#    bash docker/install.sh
#
###############################################################################

set -e

POCOCLASS_VERSION="2.0"
IMAGE_NAME="pococlass"
IMAGE_TAG="latest"
IS_UPDATE=false

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

print_step()    { echo -e "  ${GREEN}[✓]${NC} $1"; }
print_warning() { echo -e "  ${YELLOW}[!]${NC} $1"; }
print_error()   { echo -e "  ${RED}[✗]${NC} $1"; }

print_section() {
    echo ""
    echo -e "${BLUE}── $1 ──${NC}"
    echo ""
}

pause_continue() {
    echo ""
    echo -en "  Press ${BOLD}Enter${NC} to continue or ${BOLD}Ctrl+C${NC} to cancel... "
    read -r
    echo ""
}

# ---- Locate project root and deploy directory ----

resolve_paths() {
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    SOURCE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

    if [ ! -f "$SOURCE_DIR/docker/Dockerfile" ]; then
        print_error "Cannot find Dockerfile. Run this script from inside the cloned repository."
        exit 1
    fi

    SOURCE_FOLDER="$(basename "$SOURCE_DIR")"
    PARENT_DIR="$(cd "$SOURCE_DIR/.." && pwd)"

    if [ "$PARENT_DIR" = "/" ] || [ "$PARENT_DIR" = "$SOURCE_DIR" ]; then
        DEPLOY_DIR="$SOURCE_DIR"
        SOURCE_FOLDER="."
    else
        DEPLOY_DIR="$PARENT_DIR"
    fi

    if [ -f "$DEPLOY_DIR/.env" ] && [ -f "$DEPLOY_DIR/docker-compose.yml" ]; then
        IS_UPDATE=true
    fi
}

# ---- Welcome screen ----

print_welcome() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  PocoClass v${POCOCLASS_VERSION}${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""

    if [ "$IS_UPDATE" = true ]; then
        echo -e "  Mode:         ${GREEN}Update${NC} (existing installation detected)"
    else
        echo -e "  Mode:         ${GREEN}Fresh install${NC}"
    fi
    echo "  Source code:  ${SOURCE_DIR}"
    echo "  Deploy root:  ${DEPLOY_DIR}"
    echo ""

    if [ "$IS_UPDATE" = true ]; then
        echo "  This will:"
        echo "    - Rebuild the Docker image with the latest code"
        echo "    - Keep your .env, docker-compose.yml, and data"
    else
        echo "  This will:"
        echo "    - Build the Docker image"
        echo "    - Generate a secret key and .env file"
        echo "    - Set up docker-compose.yml, rules/, and data/"
    fi

    pause_continue
}

# ---- Pre-flight checks ----

check_requirements() {
    print_section "Checking requirements"

    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        echo "    Visit: https://docs.docker.com/get-docker/"
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
        echo "    Docker Compose V2 is included with modern Docker installations."
        exit 1
    fi
    print_step "Docker Compose available"
}

# ---- Build the Docker image ----

build_image() {
    print_section "Building Docker image"

    if [ "$IS_UPDATE" = true ]; then
        echo "  Rebuilding the image with the latest source code."
    else
        echo "  This may take a few minutes on the first build."
    fi

    pause_continue

    docker build \
        -t "${IMAGE_NAME}:${IMAGE_TAG}" \
        -f "$SOURCE_DIR/docker/Dockerfile" \
        "$SOURCE_DIR"

    echo ""
    print_step "Docker image built: ${IMAGE_NAME}:${IMAGE_TAG}"
}

# ---- Set up the deploy directory ----

setup_deploy_dir() {
    print_section "Setting up deployment"

    SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null \
              || openssl rand -hex 32 2>/dev/null \
              || head -c 64 /dev/urandom | od -An -tx1 | tr -d ' \n' | head -c 64)

    if [ ! -f "$DEPLOY_DIR/.env" ]; then
        cat > "$DEPLOY_DIR/.env" <<EOF
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
        print_warning ".env already exists — keeping your configuration"
    fi

    mkdir -p "$DEPLOY_DIR/rules"
    mkdir -p "$DEPLOY_DIR/data"
    print_step "rules/ and data/ directories ready"

    if [ ! -f "$DEPLOY_DIR/docker-compose.yml" ]; then
        cp "$SOURCE_DIR/docker/docker-compose.yml" "$DEPLOY_DIR/docker-compose.yml"
        print_step "Copied docker-compose.yml"
    else
        print_warning "docker-compose.yml already exists — keeping your configuration"
    fi

    if [ ! -f "$DEPLOY_DIR/pococlass_trigger.sh" ]; then
        cp "$SOURCE_DIR/scripts/pococlass_trigger.sh" "$DEPLOY_DIR/pococlass_trigger.sh"
        chmod +x "$DEPLOY_DIR/pococlass_trigger.sh"
        print_step "Copied pococlass_trigger.sh"
    else
        print_warning "pococlass_trigger.sh already exists — keeping your configuration"
    fi
}

# ---- Print final instructions ----

print_done() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Done!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""

    if [ "$IS_UPDATE" = true ]; then
        echo "  The image has been rebuilt. Restart the container to apply changes:"
        echo ""
        echo "    cd ${DEPLOY_DIR}"
        echo "    docker compose up -d"
        echo ""
    else
        echo -e "  ${BOLD}Directory layout:${NC}"
        echo ""
        echo "     ${DEPLOY_DIR}/"
        if [ "$SOURCE_FOLDER" != "." ]; then
        echo "     ├── ${SOURCE_FOLDER}/            ← source code (git repo)"
        fi
        echo "     ├── docker-compose.yml"
        echo "     ├── .env"
        echo "     ├── rules/               ← your YAML rule files"
        echo "     ├── data/                ← runtime data (database, settings)"
        echo "     └── pococlass_trigger.sh"
        echo ""
        echo -e "  ${BOLD}Next steps:${NC}"
        echo ""
        echo "  1. Set your Paperless-ngx container URL:"
        echo ""
        echo "     cd ${DEPLOY_DIR}"
        echo "     nano .env"
        echo ""
        echo "  2. Set the Docker network to match your Paperless setup:"
        echo ""
        echo "     nano docker-compose.yml"
        echo ""
        echo "  3. Start PocoClass:"
        echo ""
        echo "     docker compose up -d"
        echo ""
        echo "  4. Open in your browser:"
        echo ""
        echo "     http://your-server:5000"
        echo ""
        echo -e "  ${BOLD}Post-consumption script (optional):${NC}"
        echo ""
        echo "  To have Paperless-ngx trigger PocoClass after consuming a document:"
        echo ""
        echo "     cp ${DEPLOY_DIR}/pococlass_trigger.sh /path/to/paperless/scripts/"
        echo ""
        echo "  Edit it to set your PocoClass URL and System API Token."
        echo ""
    fi
}

# ---- Main ----

resolve_paths
print_welcome
check_requirements
build_image
setup_deploy_dir
print_done
