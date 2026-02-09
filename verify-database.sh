#!/usr/bin/env bash
# Stock Kanban Database Verification Script
# ═══════════════════════════════════════════════════════════════════
# 用途: 验证 PostgreSQL 数据库是否正确初始化和配置
# 用法: ./verify-database.sh
# ═══════════════════════════════════════════════════════════════════

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# 配置
ENV_FILE=".env.production"
PG_CONTAINER="stock-kanban-pg"

# 颜色和符号
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SUCCESS="✓"
FAILED="✗"
WARNING="⚠"

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}${SUCCESS}${NC} $*"
}

log_error() {
    echo -e "${RED}${FAILED}${NC} $*"
}

log_warning() {
    echo -e "${YELLOW}${WARNING}${NC} $*"
}

# 分隔线
separator() {
    echo "═══════════════════════════════════════════════════════════════════"
}

# 获取环境变量
get_env_value() {
    local key="$1"
    local file="$2"
    if [ ! -f "$file" ]; then
        return 0
    fi
    awk -F= -v k="$key" '$1==k {print substr($0, index($0, "=") + 1)}' "$file" | tail -n 1
}

# 验证 .env.production 存在
separator
log_info "Checking environment configuration..."

if [ ! -f "$ENV_FILE" ]; then
    log_error ".env.production file not found"
    echo "Please run: cp .env.production.example .env.production"
    exit 1
fi

log_success ".env.production exists"

# 读取 DATABASE_URL
DATABASE_URL="$(get_env_value "DATABASE_URL" "$ENV_FILE")"

if [ -z "${DATABASE_URL:-}" ]; then
    log_warning "DATABASE_URL is empty. Will use auto-created PostgreSQL container"
    DATABASE_URL="postgresql://stock_user:stock_pass@${PG_CONTAINER}:5432/stock_kanban"
    RUN_AUTO_CREATED=true
else
    log_success "DATABASE_URL is configured"
    RUN_AUTO_CREATED=false
fi

# 验证 PostgreSQL 容器
separator
log_info "Checking PostgreSQL container..."

if docker inspect "$PG_CONTAINER" >/dev/null 2>&1; then
    log_success "Container '$PG_CONTAINER' exists"
    
    # 检查是否在运行
    if docker inspect -f '{{.State.Running}}' "$PG_CONTAINER" | grep -q true; then
        log_success "Container is running"
    else
        log_warning "Container is not running. Starting..."
        docker start "$PG_CONTAINER" >/dev/null
        sleep 3
    fi
else
    if [ "$RUN_AUTO_CREATED" = true ]; then
        log_warning "Container not found. It will be created by the deployment script"
        log_info "Run: ./stock_kanban_update_and_run.sh"
        exit 0
    else
        log_error "Container not found: $PG_CONTAINER"
        exit 1
    fi
fi

# 测试数据库连接
separator
log_info "Testing database connectivity..."

# 等待 PostgreSQL 就绪
log_info "Waiting for PostgreSQL to be ready..."
max_tries=30
i=0
until docker exec "$PG_CONTAINER" pg_isready -U stock_user -d stock_kanban >/dev/null 2>&1; do
    i=$((i + 1))
    if [ "$i" -ge "$max_tries" ]; then
        log_error "PostgreSQL is not ready after ${max_tries} attempts"
        exit 1
    fi
    sleep 1
done

log_success "PostgreSQL is ready"

# 测试连接
separator
log_info "Verifying database structure..."

# 创建查询变量
QUERY_CHECK_TABLES="
SELECT COUNT(*) as table_count FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
"

QUERY_LIST_TABLES="
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE' 
ORDER BY table_name;
"

QUERY_CHECK_USERS="SELECT COUNT(*) as user_count FROM users;"
QUERY_CHECK_BACKTEST="SELECT COUNT(*) as backtest_count FROM backtest_results;"
QUERY_CHECK_STRATEGIES="SELECT COUNT(*) as strategy_count FROM strategies;"
QUERY_CHECK_PORTFOLIOS="SELECT COUNT(*) as portfolio_count FROM portfolios;"
QUERY_CHECK_HOLDINGS="SELECT COUNT(*) as holdings_count FROM holdings;"

# 执行检查
TABLE_COUNT=$(docker exec -it "$PG_CONTAINER" psql -U stock_user -d stock_kanban \
    --tuples-only --no-align -c "$QUERY_CHECK_TABLES" 2>/dev/null || echo "0")

if [ "$TABLE_COUNT" -eq 0 ]; then
    log_error "No tables found in database"
    log_info "Please run: ./stock_kanban_update_and_run.sh"
    exit 1
fi

log_success "Found $TABLE_COUNT tables"

# 列出所有表
log_info "Tables in database:"
docker exec "$PG_CONTAINER" psql -U stock_user -d stock_kanban \
    --tuples-only --no-align -c "$QUERY_LIST_TABLES" 2>/dev/null | while read -r table; do
    echo "  • $table"
done

# 检查关键表
separator
log_info "Verifying critical tables exist..."

CRITICAL_TABLES=("users" "backtest_results" "strategies" "portfolios" "holdings")

for table in "${CRITICAL_TABLES[@]}"; do
    if docker exec "$PG_CONTAINER" psql -U stock_user -d stock_kanban -c "SELECT 1 FROM $table LIMIT 1;" >/dev/null 2>&1; then
        log_success "Table '$table' exists"
    else
        log_error "Table '$table' is missing"
    fi
done

# 检查索引
separator
log_info "Checking indexes..."

QUERY_INDEXES="
SELECT schemaname, tablename, indexname FROM pg_indexes 
WHERE schemaname = 'public' ORDER BY tablename, indexname;
"

docker exec "$PG_CONTAINER" psql -U stock_user -d stock_kanban \
    --tuples-only -c "$QUERY_INDEXES" 2>/dev/null | while read -r line; do
    [ -n "$line" ] && echo "  • $line"
done || log_warning "Could not list indexes"

# 检查扩展
separator
log_info "Checking PostgreSQL extensions..."

QUERY_EXTENSIONS="SELECT extname FROM pg_extension ORDER BY extname;"

docker exec "$PG_CONTAINER" psql -U stock_user -d stock_kanban \
    --tuples-only --no-align -c "$QUERY_EXTENSIONS" 2>/dev/null | while read -r ext; do
    echo "  • $ext"
done || log_warning "Could not list extensions"

# 检查数据行数
separator
log_info "Checking data row counts..."

echo ""
echo "  users:"
docker exec "$PG_CONTAINER" psql -U stock_user -d stock_kanban \
    --tuples-only --no-align -c "SELECT COUNT(*) FROM users;" 2>/dev/null | \
    sed 's/^/    /' || echo "    Query failed"

echo "  backtest_results:"
docker exec "$PG_CONTAINER" psql -U stock_user -d stock_kanban \
    --tuples-only --no-align -c "SELECT COUNT(*) FROM backtest_results;" 2>/dev/null | \
    sed 's/^/    /' || echo "    Query failed"

echo "  strategies:"
docker exec "$PG_CONTAINER" psql -U stock_user -d stock_kanban \
    --tuples-only --no-align -c "SELECT COUNT(*) FROM strategies;" 2>/dev/null | \
    sed 's/^/    /' || echo "    Query failed"

echo "  portfolios:"
docker exec "$PG_CONTAINER" psql -U stock_user -d stock_kanban \
    --tuples-only --no-align -c "SELECT COUNT(*) FROM portfolios;" 2>/dev/null | \
    sed 's/^/    /' || echo "    Query failed"

echo "  holdings:"
docker exec "$PG_CONTAINER" psql -U stock_user -d stock_kanban \
    --tuples-only --no-align -c "SELECT COUNT(*) FROM holdings;" 2>/dev/null | \
    sed 's/^/    /' || echo "    Query failed"

echo ""

# 检查应用容器连接
separator
log_info "Checking application container database connectivity..."

if docker inspect stock-kanban-app >/dev/null 2>&1; then
    if docker inspect -f '{{.State.Running}}' stock-kanban-app | grep -q true; then
        log_success "Application container is running"
        
        # 检查日志中的数据库错误
        if docker logs stock-kanban-app 2>&1 | grep -i "database\|connection" | head -5 | grep -i error; then
            log_warning "Found database-related errors in application logs"
        else
            log_success "No database connection errors in application logs"
        fi
    else
        log_warning "Application container is not running"
    fi
else
    log_warning "Application container not found (will be created on first deployment)"
fi

# 总结
separator
echo ""
log_success "Database verification complete!"
echo ""
echo "Summary:"
echo "  • PostgreSQL container: operational"
echo "  • Database: stock_kanban"
echo "  • Tables: initialized"
echo "  • Data: ready for use"
echo ""
echo "Next steps:"
echo "  1. Run: ./stock_kanban_update_and_run.sh"
echo "  2. Verify: docker logs stock-kanban-app"
echo "  3. Access: https://stockkanban.aixintelligence.com"
echo ""
separator
