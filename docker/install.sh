#!/bin/bash
###############################################################################
#
#  PocoClass Installer
#  Builds a Docker image and prepares everything for deployment
#
#  First install:
#    mkdir ~/pococlass && cd ~/pococlass
#    git clone https://github.com/BrainPonders/PocoClass.git source
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
COMPOSE_CMD="docker compose"

PAPERLESS_PROFILE=""
PAPERLESS_CONTAINER_NAME=""
PAPERLESS_URL=""
PAPERLESS_NETWORK_NAME=""
PAPERLESS_NETWORK_EXTERNAL="true"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

print_step()    { echo -e "  ${GREEN}[OK]${NC} $1"; }
print_warning() { echo -e "  ${YELLOW}[!]${NC} $1"; }
print_error()   { echo -e "  ${RED}[X]${NC} $1"; }

print_section() {
    echo ""
    echo -e "${BLUE}-- $1 --${NC}"
    echo ""
}

pause_continue() {
    echo ""
    echo -en "  Press ${BOLD}Enter${NC} to continue or ${BOLD}Ctrl+C${NC} to cancel... "
    read -r
    echo ""
}

prompt_with_default() {
    local prompt="$1"
    local default_value="$2"
    local input_value

    echo -en "  ${prompt} [${default_value}]: "
    read -r input_value

    if [ -z "$input_value" ]; then
        echo "$default_value"
    else
        echo "$input_value"
    fi
}

detect_network_from_container() {
    local container_name="$1"
    local detected_network

    detected_network=$(docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{println $k}}{{end}}' "$container_name" 2>/dev/null | head -n1 | tr -d '[:space:]')

    if [ -n "$detected_network" ]; then
        echo "$detected_network"
        return 0
    fi

    return 1
}

generate_fernet_key() {
    local generated_key

    generated_key=$(python3 -c "import os, base64; print(base64.urlsafe_b64encode(os.urandom(32)).decode())" 2>/dev/null \
        || python -c "import os, base64; print(base64.urlsafe_b64encode(os.urandom(32)).decode())" 2>/dev/null)

    if [ -n "$generated_key" ]; then
        echo "$generated_key"
        return 0
    fi

    if command -v openssl >/dev/null 2>&1; then
        generated_key=$(openssl rand -base64 32 2>/dev/null | tr '+/' '-_' | tr -d '\n')
        if [ -n "$generated_key" ]; then
            echo "$generated_key"
            return 0
        fi
    fi

    return 1
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
        echo "    - Generate a .env file with guided Paperless settings"
        echo "    - Set up docker-compose.yml, rules/, and data/"
    fi

    pause_continue
}

# ---- Pre-flight checks ----

check_requirements() {
    print_section "Checking requirements"

    if ! command -v docker >/dev/null 2>&1; then
        print_error "Docker is not installed. Please install Docker first."
        echo "    Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi
    print_step "Docker found: $(docker --version | head -1)"

    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_step "Docker is running"

    if docker compose version >/dev/null 2>&1; then
        COMPOSE_CMD="docker compose"
        print_step "Docker Compose available (plugin)"
    elif command -v docker-compose >/dev/null 2>&1; then
        COMPOSE_CMD="docker-compose"
        print_step "Docker Compose available (docker-compose)"
    else
        print_error "Docker Compose is not available."
        echo "    Docker Compose v2 is included with modern Docker installations."
        exit 1
    fi
}

# ---- Collect guided Paperless config ----

collect_paperless_config() {
    local profile_choice
    local default_container
    local default_url
    local default_network
    local detected_network

    print_section "Paperless-ngx connection"

    echo "  Choose your Paperless setup:"
    echo ""
    echo "    1) Official paperless-ngx compose"
    echo "       - Typical container: paperless-webserver"
    echo "    2) 11notes paperless-ngx"
    echo "       - Typical container: paperless-ngx"
    echo "    3) Custom"
    echo ""

    echo -en "  Selection [1/2/3] (default: 1): "
    read -r profile_choice

    case "$profile_choice" in
        "2")
            PAPERLESS_PROFILE="11notes"
            default_container="paperless-ngx"
            default_url="http://paperless-ngx:8000"
            default_network="paperless-network"
            ;;
        "3")
            PAPERLESS_PROFILE="custom"
            default_container="paperless"
            default_url="http://paperless:8000"
            default_network="paperless-network"
            ;;
        *)
            PAPERLESS_PROFILE="official"
            default_container="paperless-webserver"
            default_url="http://paperless-webserver:8000"
            default_network="paperless_default"
            ;;
    esac

    PAPERLESS_CONTAINER_NAME="$(prompt_with_default "Paperless container name" "$default_container")"

    if detected_network="$(detect_network_from_container "$PAPERLESS_CONTAINER_NAME")"; then
        print_step "Detected Docker network from container '$PAPERLESS_CONTAINER_NAME': $detected_network"
        default_network="$detected_network"
    else
        print_warning "Could not inspect container '$PAPERLESS_CONTAINER_NAME'."
        print_warning "If Paperless is not running yet, use the suggested network and adjust later in .env if needed."
    fi

    PAPERLESS_NETWORK_NAME="$(prompt_with_default "Docker network shared with Paperless" "$default_network")"
    PAPERLESS_URL="$(prompt_with_default "Paperless URL from inside Docker" "$default_url")"

    echo ""
    print_step "Paperless profile: $PAPERLESS_PROFILE"
    print_step "Paperless URL: $PAPERLESS_URL"
    print_step "Docker network: $PAPERLESS_NETWORK_NAME"
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

    POCOCLASS_IMAGE_NAME="${IMAGE_NAME}" \
    POCOCLASS_IMAGE_TAG="${IMAGE_TAG}" \
    bash "$SOURCE_DIR/docker/build-image.sh"

    echo ""
    print_step "Docker image built: ${IMAGE_NAME}:${IMAGE_TAG}"
}

# ---- Set up the deploy directory ----

setup_deploy_dir() {
    print_section "Setting up deployment"

    if ! SECRET_KEY="$(generate_fernet_key)"; then
        print_error "Failed to generate a Fernet-compatible secret key."
        exit 1
    fi

    if [ ! -f "$DEPLOY_DIR/.env" ]; then
        collect_paperless_config

        cat > "$DEPLOY_DIR/.env" <<EOF_ENV
# PocoClass Environment Configuration
# Generated on $(date '+%Y-%m-%d %H:%M:%S')

# Secret key for session encryption (auto-generated, do not share)
POCOCLASS_SECRET_KEY=${SECRET_KEY}

# Paperless-ngx URL from inside Docker
PAPERLESS_URL=${PAPERLESS_URL}

# Installer metadata (optional, used as defaults)
PAPERLESS_PROFILE=${PAPERLESS_PROFILE}
PAPERLESS_CONTAINER_NAME=${PAPERLESS_CONTAINER_NAME}

# Docker network shared by PocoClass and Paperless-ngx
PAPERLESS_NETWORK_NAME=${PAPERLESS_NETWORK_NAME}
PAPERLESS_NETWORK_EXTERNAL=${PAPERLESS_NETWORK_EXTERNAL}
EOF_ENV
        print_step "Generated secret key and .env file"
    else
        print_warning ".env already exists -- keeping your configuration"
    fi

    mkdir -p "$DEPLOY_DIR/rules"
    mkdir -p "$DEPLOY_DIR/data"
    print_step "rules/ and data/ directories ready"

    if [ ! -f "$DEPLOY_DIR/docker-compose.yml" ]; then
        if [ -f "$SOURCE_DIR/docker/docker-compose.example.yml" ]; then
            cp "$SOURCE_DIR/docker/docker-compose.example.yml" "$DEPLOY_DIR/docker-compose.yml"
            print_step "Copied docker-compose.yml from template"
        else
            cp "$SOURCE_DIR/docker/docker-compose.yml" "$DEPLOY_DIR/docker-compose.yml"
            print_step "Copied docker-compose.yml"
        fi
    else
        print_warning "docker-compose.yml already exists -- keeping your configuration"
    fi

    if [ ! -f "$DEPLOY_DIR/pococlass_trigger.sh" ]; then
        cp "$SOURCE_DIR/scripts/pococlass_trigger.sh" "$DEPLOY_DIR/pococlass_trigger.sh"
        chmod +x "$DEPLOY_DIR/pococlass_trigger.sh"
        print_step "Copied pococlass_trigger.sh"
    else
        print_warning "pococlass_trigger.sh already exists -- keeping your configuration"
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
        echo "    ${COMPOSE_CMD} up -d"
        echo ""
        echo -e "  ${BOLD}Check for updated config files:${NC}"
        echo ""
        echo "  Your existing configuration was preserved. If the update includes"
        echo "  changes to these files, compare and apply them manually:"
        echo ""
        echo "    Latest .env template:        ${SOURCE_DIR}/docker/.env.example"
        echo "    Latest docker-compose template: ${SOURCE_DIR}/docker/docker-compose.example.yml"
        echo "    Latest pococlass_trigger.sh: ${SOURCE_DIR}/scripts/pococlass_trigger.sh"
        echo ""
        echo "  You can compare with: diff ${DEPLOY_DIR}/docker-compose.yml ${SOURCE_DIR}/docker/docker-compose.example.yml"
        echo ""
    else
        echo -e "  ${BOLD}Directory layout:${NC}"
        echo ""
        echo "     ${DEPLOY_DIR}/"
        if [ "$SOURCE_FOLDER" != "." ]; then
            echo "     |- ${SOURCE_FOLDER}/            <- source code (git repo)"
        fi
        echo "     |- docker-compose.yml"
        echo "     |- .env"
        echo "     |- rules/               <- your YAML rule files"
        echo "     |- data/                <- runtime data (database, settings)"
        echo "     '- pococlass_trigger.sh"
        echo ""
        echo -e "  ${BOLD}Next steps:${NC}"
        echo ""
        echo "  1. Start PocoClass:"
        echo ""
        echo "     cd ${DEPLOY_DIR}"
        echo "     ${COMPOSE_CMD} up -d"
        echo ""
        echo "  2. Open PocoClass in your browser:"
        echo ""
        echo "     http://your-server:5000"
        echo ""
        echo "  3. If needed, adjust Paperless settings in .env:"
        echo ""
        echo "     PAPERLESS_URL"
        echo "     PAPERLESS_NETWORK_NAME"
        echo ""
        echo -e "  ${BOLD}Post-consumption trigger (optional):${NC}"
        echo ""
        echo "  Keep a working copy in ${DEPLOY_DIR}, but place the final script"
        echo "  in your own Paperless post-consume scripts directory."
        echo ""
        echo "     cp ${DEPLOY_DIR}/pococlass_trigger.sh /path/to/paperless/scripts/"
        echo ""
        echo "  Then edit the script and set POCOCLASS_URL + POCOCLASS_TOKEN."
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
