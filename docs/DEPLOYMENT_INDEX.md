# 📋 Stock Kanban - Deployment Documentation Index

**Updated**: 2026-02-08

这是 Stock Kanban 部署文档的主入口。根据你的需求选择合适的文档。

---

## 🚀 快速开始

**首次部署？** 👉 [LINUX_QUICKSTART](./LINUX_QUICKSTART.md)

**Windows 本地开发？** 👉 [LOCAL_DEVELOPMENT](./LOCAL_DEVELOPMENT.md)

---

## 📚 部署文档

### 初次部署指南

| 文档 | 用途 | 阅读时间 |
|------|------|----------|
| [LINUX_QUICKSTART](./LINUX_QUICKSTART.md) | Linux 5分钟快速开始 | ~5 min |
| [LINUX_DEPLOYMENT_GUIDE](./LINUX_DEPLOYMENT_GUIDE.md) | Linux 详细部署和维护 | ~20 min |
| [ENV_CONFIGURATION_GUIDE](./ENV_CONFIGURATION_GUIDE.md) | 环境变量完全参考 | ~15 min |
| [LOCAL_DEVELOPMENT](./LOCAL_DEVELOPMENT.md) | Windows 本地开发 | ~10 min |

### 部署相关

| 文档 | 用途 |
|------|------|
| [DEPLOYMENT_SUMMARY](./DEPLOYMENT_SUMMARY.md) | 项目审阅和改进总结 |
| [IMPLEMENTATION_COMPLETE](./IMPLEMENTATION_COMPLETE.md) | 完成报告和成果总结 |
| [LINUX_FRONTEND_PGSQL_CONFIG](./LINUX_FRONTEND_PGSQL_CONFIG.md) | PostgreSQL 和 Frontend 配置 |
| [NEXT_STEPS](./NEXT_STEPS.md) | 后续行动指南 |

---

## 🔧 工具和脚本

在项目根目录运行：

```bash
# Linux 服务器部署
./stock_kanban_update_and_run.sh

# 环境检查（部署前）
bash deploy/check-linux-environment.sh

# 数据库验证
bash deploy/verify-database.sh

# Windows 本地开发
start-dev.bat
```

---

## 💾 数据库初始化

所有 SQL 脚本位于 `deploy/sql/`：

- `001_backtest_results.sql` - 回测结果表
- `002_core_trading_tables.sql` - 交易核心表

这些脚本由 `stock_kanban_update_and_run.sh` 自动执行。

---

## ❓ 常见问题

**Q: 我是第一次部署，从哪里开始？**  
A: 查看 [LINUX_QUICKSTART](./LINUX_QUICKSTART.md)

**Q: 我需要配置环境变量**  
A: 查看 [ENV_CONFIGURATION_GUIDE](./ENV_CONFIGURATION_GUIDE.md)

**Q: 我想在 Windows 上本地开发**  
A: 查看 [LOCAL_DEVELOPMENT](./LOCAL_DEVELOPMENT.md)

**Q: 部署失败了怎么办？**  
A: 查看对应文档的故障排查章节

---

## 📖 开发文档

详见 [DEVELOPMENT_GUIDE](./DEVELOPMENT_GUIDE.md)

---

**Version**: 2.0  
**Last Updated**: 2026-02-08
