#!/usr/bin/env bash

# MiroTalk P2P installer for Ubuntu 22.04 and 24.04.
# Run from the repository root with: sudo ./install.sh

set -Eeuo pipefail

readonly NODE_MAJOR=24
readonly CONFIG_FILE='app/src/config.js'
readonly CONFIG_TEMPLATE='app/src/config.template.js'
readonly ENV_FILE='.env'
readonly ENV_TEMPLATE='.env.template'
readonly COMPOSE_FILE='docker-compose.yml'
readonly COMPOSE_TEMPLATE='docker-compose.template.yml'

if [[ -t 1 ]] && command -v tput >/dev/null 2>&1 && [[ -n "${TERM:-}" ]]; then
    readonly RED="$(tput setaf 1)"
    readonly YELLOW="$(tput setaf 3)"
    readonly MAGENTA="$(tput setaf 5)"
    readonly RESET="$(tput sgr0)"
else
    readonly RED=''
    readonly YELLOW=''
    readonly MAGENTA=''
    readonly RESET=''
fi

log() {
    local level="$1"
    shift
    local color="$MAGENTA"

    case "$level" in
        warning) color="$YELLOW" ;;
        error) color="$RED" ;;
    esac

    printf '%s :: %b%s%b\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$color" "$*" "$RESET"
}

die() {
    log error "$*" >&2
    exit 1
}

on_error() {
    local exit_code=$?
    log error "Installation failed near line ${BASH_LINENO[0]} (exit ${exit_code})." >&2
    exit "$exit_code"
}

trap on_error ERR

confirm() {
    local prompt="$1"
    local default_answer="${2:-y}"
    local answer
    local hint='[y/N]'

    [[ "$default_answer" == 'y' ]] && hint='[Y/n]'

    while true; do
        read -r -p "$prompt $hint " answer
        answer="${answer:-$default_answer}"
        case "$answer" in
            [Yy]|[Yy][Ee][Ss]) return 0 ;;
            [Nn]|[Nn][Oo]) return 1 ;;
            *) printf 'Please answer yes or no.\n' ;;
        esac
    done
}

require_command() {
    command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"
}

copy_if_missing() {
    local source_file="$1"
    local destination_file="$2"

    if [[ -e "$destination_file" ]]; then
        log warning "Keeping existing ${destination_file}"
        return
    fi

    cp "$source_file" "$destination_file"
    if [[ -n "${SUDO_UID:-}" && -n "${SUDO_GID:-}" ]]; then
        chown "$SUDO_UID:$SUDO_GID" "$destination_file"
    fi
    log info "Created ${destination_file} from ${source_file}"
}

run_as_project_user() {
    if [[ -n "${SUDO_USER:-}" && "$SUDO_USER" != 'root' ]]; then
        sudo -u "$SUDO_USER" -- "$@"
    else
        "$@"
    fi
}

install_nodejs() {
    local installed_major=0

    if command -v node >/dev/null 2>&1; then
        installed_major="$(node --version | sed -E 's/^v([0-9]+).*/\1/')"
    fi

    if (( installed_major >= NODE_MAJOR )); then
        log info "Node.js $(node --version) already satisfies the requirement"
        return
    fi

    log info "Installing Node.js ${NODE_MAJOR}.x"
    apt-get update
    DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
        | gpg --dearmor --yes -o /etc/apt/keyrings/nodesource.gpg
    printf 'deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_%s.x nodistro main\n' "$NODE_MAJOR" \
        > /etc/apt/sources.list.d/nodesource.list
    apt-get update
    DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs
}

install_docker() {
    if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
        log info 'Docker Engine and Compose v2 are already installed'
        return
    fi

    log info 'Installing Docker Engine and Compose v2'
    apt-get update
    DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc

    printf 'deb [arch=%s signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu %s stable\n' \
        "$(dpkg --print-architecture)" "$VERSION_CODENAME" > /etc/apt/sources.list.d/docker.list
    apt-get update
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
        containerd.io docker-buildx-plugin docker-ce docker-ce-cli docker-compose-plugin
    systemctl enable --now docker
}

[[ "$(uname -s)" == 'Linux' ]] || die 'This installer supports Linux only.'
[[ "$EUID" -eq 0 ]] || die 'Run this installer as root: sudo ./install.sh'
[[ -r /etc/os-release ]] || die 'Unable to identify this Linux distribution.'

. /etc/os-release
[[ "${ID:-}" == 'ubuntu' ]] || die 'This installer currently supports Ubuntu only.'
[[ "${VERSION_ID:-}" == '22.04' || "${VERSION_ID:-}" == '24.04' ]] || \
    log warning "Ubuntu ${VERSION_ID:-unknown} has not been tested; continuing anyway."

cd "$(dirname "${BASH_SOURCE[0]}")"
[[ -f package.json && -f package-lock.json && -f "$CONFIG_TEMPLATE" && -f "$ENV_TEMPLATE" ]] || \
    die 'Run this script from a complete MiroTalk P2P checkout.'

log info "MiroTalk P2P installer on Ubuntu ${VERSION_ID:-unknown}"

if confirm 'Use Docker?' y; then
    if confirm 'Install or update Docker dependencies?' y; then
        install_docker
    fi

    require_command docker
    docker compose version >/dev/null 2>&1 || \
        die "Docker Compose v2 is required (the command is 'docker compose')."

    copy_if_missing "$ENV_TEMPLATE" "$ENV_FILE"
    copy_if_missing "$COMPOSE_TEMPLATE" "$COMPOSE_FILE"

    if confirm 'Use the official Docker image?' y; then
        log info 'Pulling the latest official image'
        docker pull mirotalk/p2p:latest
    else
        log info 'Building the image from this checkout'
        docker build --tag mirotalk/p2p:latest .
    fi

    log info 'Starting MiroTalk P2P in the background'
    docker compose up -d
    docker compose ps
else
    if confirm 'Install or update Node.js?' y; then
        install_nodejs
    fi

    require_command node
    require_command npm
    node_major="$(node --version | sed -E 's/^v([0-9]+).*/\1/')"
    (( node_major >= NODE_MAJOR )) || \
        die "Node.js ${NODE_MAJOR} or newer is required; found $(node --version)."

    copy_if_missing "$CONFIG_TEMPLATE" "$CONFIG_FILE"
    copy_if_missing "$ENV_TEMPLATE" "$ENV_FILE"

    log info 'Installing npm dependencies from the lockfile'
    run_as_project_user npm ci

    log info 'Starting MiroTalk P2P (press Ctrl+C to stop)'
    run_as_project_user npm start
fi