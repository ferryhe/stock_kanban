# 🎬 立即启动应用

## ✅ 能否在本地启动？

**是的！完全可以！** 🎉

这个项目已经完全配置好，可以在你的 Windows 机器上直接启动。

## 🚀 立即开始 (选择一种方式)

### 最快方式（1 步）

在项目文件夹中，双击：
```
start-dev.bat
```

这会：
1. 自动安装依赖（如果需要）
2. 启动后端服务器
3. 启动前端应用
4. 自动打开浏览器

---

### 手动方式（3 步）

**第 1 步**：打开 PowerShell，输入：
```powershell
cd c:\Projects\stock_kanban
npm install
npm run dev
```

等待看到：
```
[Express] Server running on http://localhost:3000
```

**第 2 步**：打开第二个 PowerShell，输入：
```powershell
cd c:\Projects\stock_kanban
npm run dev:client
```

等待看到：
```
VITE ready in xxx ms
```

**第 3 步**：在浏览器打开：
```
http://localhost:5000
```

---

## 📋 项目检查清单

系统已具备的条件：

- [x] Node.js v24.12.0 已安装
- [x] 项目文件完整
- [x] 配置文件正确
- [x] 量化指标数据已配置
- [x] TypeScript 配置完成
- [x] 依赖列表已准备

## 🌐 应用启动后看到什么

访问 http://localhost:5000 后：

1. **首页** - 股票 Kanban 看板
2. **预设看板**：
   - 🔥 AI & Chips
   - ⚛️ Nuclear/Energy
   - 📉 Market Indices
   - 👀 High Volatility
3. **股票卡片** - 显示：
   - 价格和变化百分比
   - 技术指标（RSI、MACD 等）
   - 量化指标（Rank、Score、Risk 等）
4. **搜索功能** - 搜索任何股票
5. **详情模态框** - 点击股票卡查看详细信息

## 🔧 如果出问题

运行诊断脚本：
```
diagnose.bat
```

会自动检查：
- ✓ 环境配置
- ✓ 文件完整性
- ✓ 端口占用
- ✓ 依赖状态

然后按提示操作。

## 📚 深入学习

启动后可以参考：

1. **[QUICK_START.md](QUICK_START.md)** - 5 分钟快速开始
2. **[LOCAL_STARTUP.md](LOCAL_STARTUP.md)** - 完整启动指南
3. **[GIT_WORKFLOW.md](GIT_WORKFLOW.md)** - 量化指标更新工作流
4. **[QUANT_METRICS_INTEGRATION.md](QUANT_METRICS_INTEGRATION.md)** - 集成细节

## 💡 开发建议

启动后：

1. **编辑前端** - `client/src/` 中的文件会自动热重载
2. **编辑后端** - `server/` 中的文件改动后后端会自动重启
3. **检查类型** - 运行 `npm run check` 查看 TypeScript 错误

## 🎯 下一步

1. ✅ 启动应用
2. ✅ 浏览股票数据
3. ✅ 查看量化指标
4. ✅ 测试搜索功能
5. ✅ 自定义看板

---

## 🌟 关键信息

| 项 | 值 |
|----|-----|
| **应用地址** | http://localhost:5000 |
| **API 地址** | http://localhost:3000 |
| **安装时间** | 2-5 分钟 |
| **启动时间** | < 30 秒 |
| **系统要求** | Node.js 18+ |

---

**就这么简单！** 🚀

现在就双击 `start-dev.bat` 或按照手动步骤启动吧！
