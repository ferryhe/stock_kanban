# 迁移检查清单

## ✅ 完成的任务

### 数据迁移
- [x] 复制 `latest.json` 到项目 `data/` 文件夹
- [x] 重命名为 `quant-metrics.json`
- [x] 验证文件内容完整（10支股票，2863 字节）

### 代码更新
- [x] 更新 `server/stockService.ts` 的 `loadQuantMetrics()` 函数
- [x] 改为从本地 `data/quant-metrics.json` 读取
- [x] 使用相对路径和 `process.cwd()` 确保跨平台兼容
- [x] 无 TypeScript 错误

### 前端组件（已在前面完成）
- [x] `client/src/lib/stockApi.ts` - 类型定义
- [x] `client/src/components/QuantMetricsDisplay.tsx` - 显示组件
- [x] `client/src/components/StockCard.tsx` - 集成组件
- [x] `client/src/components/IndicatorTooltip.tsx` - 指标说明

### 文档完善
- [x] `data/README.md` - 数据文件夹说明
- [x] `GIT_WORKFLOW.md` - Git 工作流完整指南
- [x] `QUANT_METRICS_INTEGRATION.md` - 更新为新路径
- [x] `SETUP_COMPLETE.md` - 完成报告

### 自动化脚本
- [x] `scripts/update-quant-metrics.bat` - Windows 更新脚本
- [x] `scripts/update-quant-metrics.sh` - Linux/Mac 更新脚本

## 📋 现在可以做的

### 立即可用
```bash
# 方式 1: 使用提供的脚本
.\scripts\update-quant-metrics.bat  # Windows
./scripts/update-quant-metrics.sh   # Linux/Mac

# 方式 2: 标准 Git
git pull
```

### 日常工作流
1. 在 `stock_quant_work` 中生成分析
2. 提交并推送到 Git
3. 在 `stock_kanban` 中运行脚本或 `git pull`
4. 应用自动加载新数据

## 🔧 配置信息

| 项目 | 值 |
|------|-----|
| 数据文件路径 | `data/quant-metrics.json` |
| 缓存时长 | 1 小时（可自定义） |
| 股票数量 | 10 支（当前） |
| 更新方式 | Git pull |
| 自动加载 | ✅ 启动时自动加载 |
| 监控指标 | score, rank, predictedReturn, risk (vol60, maxdd252), status.bucket |

## 📂 文件树

```
stock_kanban/
├── 📄 SETUP_COMPLETE.md              ← 你在这里
├── 📄 GIT_WORKFLOW.md                ← 工作流指南
├── 📄 QUANT_METRICS_INTEGRATION.md   ← 集成详情
├── data/
│   ├── 📄 quant-metrics.json         ← 量化指标数据 (Git 跟踪)
│   └── 📄 README.md
├── scripts/
│   ├── 📜 update-quant-metrics.bat   ← Windows 脚本
│   └── 📜 update-quant-metrics.sh    ← Unix 脚本
├── server/
│   ├── stockService.ts              ← ✅ 已更新为本地路径
│   └── ...
├── client/
│   └── src/
│       ├── components/
│       │   ├── QuantMetricsDisplay.tsx  ← ✅ 新组件
│       │   ├── StockCard.tsx           ← ✅ 已集成
│       │   └── IndicatorTooltip.tsx    ← ✅ 已更新
│       └── lib/
│           └── stockApi.ts             ← ✅ 已更新
└── ...
```

## 🚀 验证清单

在启动应用前，确认：

- [ ] 数据文件存在：`data/quant-metrics.json`
- [ ] 文件大小合理（> 2KB）
- [ ] 无 TypeScript 错误
- [ ] 能访问脚本文件（检查权限）

在启动应用后，检查：

- [ ] 后端日志输出：`[Quant] Loaded metrics for X tickers`
- [ ] 前端显示股票卡上的量化指标
- [ ] 点击指标可查看详细说明

## 🔄 后续同步步骤

### 定期更新（每日/每周）

1. **stock_quant_work 项目：**
   ```bash
   python analyze.py
   git add outputs/kanban/latest.json
   git commit -m "Update: metrics $(date +%Y-%m-%d)"
   git push
   ```

2. **stock_kanban 项目：**
   ```bash
   ./scripts/update-quant-metrics.bat  # 或 git pull
   ```

### 可选：自动化（GitHub Actions）

参考 `GIT_WORKFLOW.md` 的"使用 GitHub Actions"部分。

## 📞 故障排除

### 脚本不工作？
- Windows: 检查执行策略 `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned`
- Linux/Mac: 检查权限 `chmod +x scripts/update-quant-metrics.sh`

### 数据不更新？
- 检查文件修改时间：`stat data/quant-metrics.json`
- 清除浏览器缓存
- 重启应用（不必要，1小时后自动刷新）

### Git pull 失败？
- 检查网络连接
- 配置 Git 凭证：`git config --global user.email "your@email.com"`

更多帮助见 `GIT_WORKFLOW.md` 的"故障排查"部分。

## ✨ 完成状态

```
迁移工作: ████████████████████ 100%
代码更新: ████████████████████ 100%
文档完善: ████████████████████ 100%
脚本自动化: ████████████████████ 100%

整体进度: ✅ 完成
可用状态: ✅ 可立即使用
```

---

**最后更新**: 2026-01-22  
**维护者**: 你  
**状态**: 🟢 生产就绪
