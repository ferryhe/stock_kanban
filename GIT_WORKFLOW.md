# Git 工作流程：量化指标更新指南

## 概述

量化指标数据现在存储在项目的 `data/quant-metrics.json` 文件中，可通过 git 进行版本控制和定期更新。

## 文件位置

```
stock_kanban/
├── data/
│   ├── quant-metrics.json    ← 量化指标数据
│   └── README.md              ← 此文件夹说明
├── scripts/
│   ├── update-quant-metrics.sh   ← Linux/Mac 更新脚本
│   └── update-quant-metrics.bat  ← Windows 更新脚本
└── server/
    └── stockService.ts        ← 自动加载数据
```

## 工作流程

### 1️⃣ 生成指标数据

在 `stock_quant_work` 项目中：
```bash
# 运行量化分析
python analyze.py  # 或你的分析脚本

# 输出到 quant-metrics.json
```

### 2️⃣ 提交并推送到 Git

```bash
cd stock_quant_work
git add outputs/kanban/latest.json
git commit -m "Update: quantitative metrics $(date +%Y-%m-%d)"
git push
```

### 3️⃣ 在 stock_kanban 项目中拉取更新

#### 方式 A: 使用提供的脚本（推荐）

**Windows:**
```bash
.\scripts\update-quant-metrics.bat
```

**Linux/Mac:**
```bash
./scripts/update-quant-metrics.sh
```

#### 方式 B: 手动 git pull

```bash
cd stock_kanban
git pull
```

### 4️⃣ 应用自动加载新数据

- 后端会在启动时自动加载 `data/quant-metrics.json`
- 运行时每 1 小时自动检查一次文件更新
- 前端在下一次刷新时显示最新数据

## 自动化更新

### 使用 Windows 任务计划程序（Windows）

1. 打开"任务计划程序"
2. 创建基本任务
3. 名称：`Update Stock Kanban Metrics`
4. 触发器：每天（或每小时）运行一次
5. 操作：
   ```
   程序或脚本: C:\Projects\stock_kanban\scripts\update-quant-metrics.bat
   起始于: C:\Projects\stock_kanban
   ```

### 使用 Cron（Linux/Mac）

```bash
# 编辑 crontab
crontab -e

# 添加每小时更新一次（在整点时）
0 * * * * cd /path/to/stock_kanban && git pull >> /var/log/quant-metrics-update.log 2>&1
```

### 使用 GitHub Actions（云端自动化）

在 `stock_kanban` 项目根目录创建 `.github/workflows/update-metrics.yml`：

```yaml
name: Update Quantitative Metrics

on:
  schedule:
    # 每天上午 9 点（UTC）运行
    - cron: '0 9 * * *'
  workflow_dispatch:

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          ref: main
          
      - name: Pull latest metrics from stock_quant_work
        run: |
          git config --global user.email "bot@example.com"
          git config --global user.name "Metrics Bot"
          git pull origin main
          
      - name: Commit and push if changed
        run: |
          if git diff --quiet; then
            echo "No changes detected"
          else
            git add data/quant-metrics.json
            git commit -m "Auto: Update quantitative metrics"
            git push
          fi
```

## 监控数据更新

### 检查最后修改时间

```bash
# 查看文件最后修改时间
stat data/quant-metrics.json

# 或 (Windows)
dir data\quant-metrics.json
```

### 查看包含的股票

```bash
# 计算股票数量
grep -o '"ticker"' data/quant-metrics.json | wc -l

# 列出所有股票代码
grep '"ticker"' data/quant-metrics.json | sed 's/.*"ticker": "\(.*\)".*/\1/'
```

## 故障排查

### 问题：更新脚本权限不足

**Windows:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Linux/Mac:**
```bash
chmod +x scripts/update-quant-metrics.sh
```

### 问题：Git 认证失败

设置 Git 凭证：
```bash
git config --global user.email "your-email@example.com"
git config --global user.name "Your Name"
```

### 问题：data/quant-metrics.json 文件丢失

恢复文件：
```bash
git checkout data/quant-metrics.json
```

### 问题：新数据不显示

1. 检查文件是否正确更新：`git log -n 1 data/quant-metrics.json`
2. 重启应用或清除浏览器缓存
3. 检查浏览器开发工具的 Network 标签

## 数据备份

### 备份当前指标数据

```bash
# 创建备份
cp data/quant-metrics.json data/quant-metrics.json.backup

# 或使用 git
git tag metrics-$(date +%Y-%m-%d)
git push --tags
```

### 恢复到之前的版本

```bash
# 查看历史
git log --oneline data/quant-metrics.json

# 恢复到特定版本
git checkout <commit-hash> -- data/quant-metrics.json
```

## 性能优化

### 缓存说明

- 后端在内存中缓存指标数据 1 小时
- 应用启动时自动加载数据
- 减少频繁文件系统访问

### 增量更新（未来优化）

如果数据文件变得很大，可以考虑：
- 只同步改变的字段
- 使用增量备份
- 压缩数据格式

## 常见问题

**Q: 更新数据后需要重启应用吗？**
A: 不需要。后端会在 1 小时后自动刷新缓存，或你可以重启应用立即看到更新。

**Q: 能否更频繁地更新数据？**
A: 可以。修改 `server/stockService.ts` 中的 `QUANT_CACHE_TTL` 值（目前为 1 小时）。

**Q: Git 历史会因为数据更新变得很大吗？**
A: 会。如果这成为问题，可以考虑：
  - 使用 Git LFS（大文件存储）
  - 定期清理历史：`git gc --aggressive`
  - 使用单独的数据分支

**Q: 如何在多个地方同步数据？**
A: 使用 Git pull 的标准方式即可。所有克隆该仓库的地方都能通过 `git pull` 获取最新数据。

## 支持

如有问题，请检查：
1. 文件是否存在：`ls -la data/quant-metrics.json`
2. Git 状态：`git status`
3. 应用日志：查看后端控制台输出 `[Quant] Loaded metrics`
