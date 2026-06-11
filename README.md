# 马尼拉（Manila）

以 19 世纪菲律宾港口贸易为背景的轻策桌游电子化实现。玩家扮演商人，通过竞拍港务长、在货船上放置帮手、操纵船运获得利润，最终以现金和股票总价值决定胜负。

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发环境（同时启动前端 + 后端）
pnpm dev:server   # 服务端 → http://localhost:3001
pnpm dev:client   # 客户端 → http://localhost:5173

# 构建生产版本
pnpm build

# 运行测试
pnpm test
```

## 技术栈

| 层 | 技术 |
|---|---|
| **包管理** | pnpm workspace (monorepo) |
| **语言** | TypeScript |
| **前端** | React 19 · React Router 7 · Zustand · Vite 6 · Socket.IO Client |
| **后端** | Express 5 · Socket.IO · tsx |
| **测试** | Vitest |

## 项目结构

```
manila-game/
├── client/src/           # React 前端
│   ├── components/
│   │   ├── board/        # Canvas 棋盘渲染
│   │   ├── action-panels/ # 各阶段操作面板
│   │   └── SettlementPanel.tsx  # 航程结算弹窗
│   ├── hooks/            # useLocalGame / useOnlineGame
│   ├── routes/           # 首页 / 联机大厅 / 游戏主界面
│   ├── store/            # Zustand 状态仓库
│   └── locales/          # 中文文本
├── server/src/           # Node.js 后端
│   ├── index.ts          # Express + Socket.IO 入口
│   └── rooms/            # 房间管理
└── shared/src/           # 共享游戏引擎
    ├── engine/           # 9 个阶段引擎 + 阶段状态机
    ├── types/            # 类型定义
    ├── utils/            # 骰子、常量、计算器
    └── __tests__/        # 单元测试
```

## 游戏规则

### 游戏流程

游戏由多个**航程**组成，每个航程包含以下阶段：

| 阶段 | 操作 |
|------|------|
| 🔨 竞拍港务长 | 玩家轮流竞拍，港务长获得特殊权力 |
| ⚙️ 港务长设置 | 港务长选择 3 种货物，设定 3 艘船的起始位置 |
| 🧩 放置帮手 | 多轮交替将帮手放至货舱、港口、船坞、保险、海盗、领航员等位置 |
| 🎲 移动 | 港务长掷骰，货船按骰子格数前进 |
| 🏴‍☠️ 海盗检查 | 海盗船长决定是否劫船，抢走船上货物收益 |
| 🧭 领航员调整 | 领航员可微调船的位置（+1/-1） |
| 💰 利润分配 | 结算收入与支出 |
| 📈 价格上涨 | 成功靠港的货物价格上涨，达到 30 则游戏结束 |

### 胜利条件

最终得分 = **现金 + 股票价值 - 抵押罚款**，最高者获胜。

### 游戏参数

- **玩家人数**：2–5 人
- **起始现金**：30 比索
- **帮手数量**：每人 3 个
- **货物种类**：翡翠 · 丝绸 · 香料 · 瓷器
- **每航程轮数**：最多 3 轮放置

## 游戏特色

- **本地模式**：单机多玩家轮流操作
- **在线联机**：Socket.IO 实时同步，房间制对战
- **服务端权威架构**：游戏逻辑在服务端执行，客户端仅展示状态
- **完整经济系统**：股票买卖、抵押贷款、保险理赔、海盗掠夺
- **航程结算**：每航程结束展示详细收支明细
- **中文界面**：全部中文文本

## 开发命令

```bash
pnpm dev:server      # 启动后端（监听 http://localhost:3001）
pnpm dev:client      # 启动前端（监听 http://localhost:5173）
pnpm build           # 构建全部子包
pnpm test            # 运行单元测试
pnpm lint            # 运行代码检查
cd shared && pnpm build  # 仅构建共享引擎（修改规则后需执行）
```
