#!/usr/bin/env bash
# Stock Kanban - Linux Environment Pre-flight Check
# ═══════════════════════════════════════════════════════════════════
# 用途: 在部署前检查 Linux 环境是否满足所有要求
# 用法: bash check-linux-environment.sh
# ═══════════════════════════════════════════════════════════════════

set -Eeuo pipefail

# 颜色和符号
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

SUCCESS="✓"
FAILED="✗"
WARNING="⚠"

# 计数器
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNING=0

# 日志函数
print_header() {
    echo ""
    echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}${BLUE}$*${NC}"
    echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""
}

log_success() {
    echo -e "${GREEN}${SUCCESS}${NC} $*"
    ((CHECKS_PASSED++))
}

log_error() {
    echo -e "${RED}${FAILED}${NC} $*"
    ((CHECKS_FAILED++))
}

log_warning() {
    echo -e "${YELLOW}${WARNING}${NC} $*"
    ((CHECKS_WARNING++))
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 获取版本
get_version() {
    local cmd="$1"
    case "$cmd" in
        docker)
            docker --version
            ;;
        git)
            git --version
            ;;
        node)
            node --version
            ;;
        *)
            echo "unknown"
            ;;
    esac
}

# 开始检查
print_header "Stock Kanban - Linux Environment Pre-flight Check"

echo "This script will verify that your Linux environment meets all requirements for Stock Kanban deployment."
echo ""

# ═══ 系统信息 ═══
print_header "System Information"

OS_INFO=$(cat /etc/*release 2>/dev/null | grep "PRETTY_NAME" | cut -d'"' -f2 || echo "Unknown")
log_info "Operating System: $OS_INFO"

KERNEL=$(uname -r)
log_info "Kernel: $KERNEL"

ARCH=$(uname -m)
log_info "Architecture: $ARCH"

DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}')
DISK_AVAIL=$(df -h / | awk 'NR==2 {print $4}')
log_info "Disk Usage: $DISK_USAGE (Available: $DISK_AVAIL)"

if [ "$(dirspace=$(df /. | awk 'NR==2 {print $4}'); echo ${dirspace%G*})" -lt 5 ]; then
    log_warning "Low disk space (less than 5GB available)"
else
    log_success "Sufficient disk space"
fi

echo ""

# ═══ 必需工具 ═══
print_header "Required Tools"

# Docker
if command_exists docker; then
    DOCKER_VERSION=$(get_version docker)
    log_success "Docker installed: $DOCKER_VERSION"
    
    if docker ps >/dev/null 2>&1; then
        log_success "Docker daemon is running"
    else
        log_error "Docker daemon is not running"
        log_info "Run: sudo systemctl start docker"
    fi
else
    log_error "Docker is not installed"
    log_info "Install: https://docs.docker.com/engine/install/"
fi

# Git
if command_exists git; then
    GIT_VERSION=$(get_version git)
    log_success "Git installed: $GIT_VERSION"
else
    log_error "Git is not installed"
    log_info "Run: sudo yum install git (Amazon Linux) or sudo apt install git (Debian/Ubuntu)"
fi

# Docker Compose (check both docker-compose and docker compose)
if command_exists docker-compose || docker compose version >/dev/null 2>&1; then
    log_success "Docker Compose is available"
else
    log_warning "Docker Compose not found as standalone (but may be available via 'docker compose')"
fi

echo ""

# ═══ Docker 网络和容器 ═══
print_header "Docker Environment"

# 检查 caddy-net 网络
if docker network inspect caddy-net >/dev/null 2>&1; then
    log_success "Docker network 'caddy-net' exists"
else
    log_error "Docker network 'caddy-net' does not exist"
    log_info "The deployment script will create it automatically, but you can create manually:"
    log_info "  docker network create caddy-net"
fi

# 检查 Caddy 容器
if docker ps | grep -q caddy; then
    CADDY_STATUS=$(docker inspect -f '{{.State.Status}}' caddy 2>/dev/null || echo "unknown")
    log_success "Caddy container is running (Status: $CADDY_STATUS)"
else
    log_warning "Caddy container not found running"
    log_info "Caddy should be running for reverse proxy configuration"
fi

# 检查是否有其他 PostgreSQL 容器
if docker ps | grep -i postgres >/dev/null 2>&1; then
    log_info "Existing PostgreSQL containers:"
    docker ps | grep -i postgres | awk '{print "  • " $NF}'
else
    log_info "No existing PostgreSQL containers found"
fi

echo ""

# ═══ Docker 权限 ═══
print_header "Docker Permissions"

if docker ps >/dev/null 2>&1; then
    log_success "Current user can run Docker commands without sudo"
else
    if sudo -n docker ps >/dev/null 2>&1; then
        log_warning "Docker requires sudo (passwordless)"
        log_info "For passwordless sudo, ensure your user is in docker group:"
        log_info "  sudo usermod -aG docker \$USER"
        log_info "  newgrp docker"
    else
        log_error "Cannot run Docker commands. Check permissions or sudo configuration"
    fi
fi

echo ""

# ═══ 端口检查 ═══
print_header "Port Availability"

# 检查端口 3000
if command_exists nc; then
    if ! nc -z 127.0.0.1 3000 >/dev/null 2>&1; then
        log_success "Port 3000 is available"
    else
        log_warning "Port 3000 appears to be in use (check: lsof -i :3000 or netstat -tlnp | grep 3000)"
    fi
else
    log_info "nc command not found, skipping port check"
fi

# 检查端口 5432（PostgreSQL）
if ! nc -z 127.0.0.1 5432 >/dev/null 2>&1; then
    log_success "Port 5432 is available (for PostgreSQL)"
else
    log_warning "Port 5432 appears to be in use"
fi

echo ""

# ═══ Git 仓库检查 ═══
print_header "Git Repository"

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    log_success "Current directory is a Git repository"
    
    # 检查上游
    if git rev-parse --abbrev-ref --symbolic-full-name "@{u}" >/dev/null 2>&1; then
        UPSTREAM=$(git rev-parse --abbrev-ref --symbolic-full-name "@{u}" 2>/dev/null)
        log_success "Upstream branch configured: $UPSTREAM"
    else
        log_warning "No upstream branch configured"
    fi
    
    # 检查本地更改
    if git diff-index --quiet HEAD --; then
        log_success "No uncommitted changes"
    else
        log_warning "There are local changes (will be reset by deploy script)"
    fi
else
    log_error "Not in a Git repository"
    log_info "Navigate to your stock_kanban project directory"
fi

echo ""

# ═══ Node.js 检查（可选） ═══
print_header "Optional Tools (for local development)"

if command_exists node; then
    NODE_VERSION=$(get_version node)
    log_success "Node.js installed: $NODE_VERSION"
else
    log_info "Node.js not installed (not required for Docker-based deployment)"
fi

if command_exists npm; then
    NPM_VERSION=$(npm --version)
    log_success "npm installed: v$NPM_VERSION"
else
    log_info "npm not installed (not required for Docker-based deployment)"
fi

echo ""

# ═══ 环境变量文件检查 ═══
print_header "Configuration Files"

if [ -f ".env.production" ]; then
    log_success ".env.production exists"
elif [ -f ".env.production.example" ]; then
    log_warning ".env.production does not exist (copy from .env.production.example)"
else
    log_error "Neither .env.production nor .env.production.example found"
fi

if [ -f "../stock_kanban_update_and_run.sh" ]; then
    log_success "Deployment script found"
    if [ -x "../stock_kanban_update_and_run.sh" ]; then
        log_success "Deployment script is executable"
    else
        log_warning "Deployment script exists but is not executable"
        log_info "Run: chmod +x ../stock_kanban_update_and_run.sh"
    fi
else
    log_error "Deployment script not found (../stock_kanban_update_and_run.sh)"
fi

if [ -f "../docker-compose.yml" ]; then
    log_success "docker-compose.yml exists"
else
    log_warning "docker-compose.yml not found"
fi

if [ -f "../Dockerfile" ]; then
    log_success "Dockerfile exists"
else
    log_error "Dockerfile not found"
fi

echo ""

# ═══ 网络连接检查 ═══
print_header "Network Connectivity"

if command_exists curl; then
    if curl -s https://www.google.com --connect-timeout 3 >/dev/null 2>&1; then
        log_success "Internet connectivity: OK"
    else
        log_warning "Internet connectivity may be slow or blocked"
    fi
else
    log_info "curl not available, skipping connectivity check"
fi

echo ""

# ═══ 总结 ═══
print_header "Verification Summary"

TOTAL=$((CHECKS_PASSED + CHECKS_FAILED + CHECKS_WARNING))

echo ""
echo -e "${GREEN}Passed:${NC}  $CHECKS_PASSED"
echo -e "${RED}Failed:${NC}  $CHECKS_FAILED"
echo -e "${YELLOW}Warning:${NC} $CHECKS_WARNING"
echo ""

if [ "$CHECKS_FAILED" -eq 0 ]; then
    echo -e "${GREEN}${BOLD}✓ All critical checks passed!${NC}"
    echo ""
    echo "You are ready to deploy Stock Kanban:"
    echo ""
    echo "  1. Prepare .env.production:"
    echo "     cp .env.production.example .env.production"
    echo "     nano .env.production"
    echo ""
    echo "  2. Run the deployment script:"
    echo "     chmod +x ../stock_kanban_update_and_run.sh"
    echo "     ../stock_kanban_update_and_run.sh"
    echo ""
    echo "  3. Verify deployment:"
    echo "     docker logs -f stock-kanban-app"
    echo ""
    echo "  For detailed deployment guide, see: docs/DEPLOYMENT_INDEX.md"
    echo ""
else
    echo -e "${RED}${BOLD}✗ Some critical checks failed!${NC}"
    echo ""
    echo "Please address the failed items above before deploying."
    echo ""
    if [ "$CHECKS_WARNING" -gt 0 ]; then
        echo "Note: There are $CHECKS_WARNING warnings that may not prevent deployment but should be reviewed."
    fi
    echo ""
fi

echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
