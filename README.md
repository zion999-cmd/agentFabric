# agentFabric

Business Workspace 层，构建于 Hermes Agent Runtime 之上。

agentFabric **不是** Agent Runtime。它是一个**业务工作空间**（Business Workspace），
帮助企业将经验转化为持续演化的业务智能。Runtime 是可替换的；业务知识才是长期资产。

## 快速开始

```bash
npm install                   # 安装依赖
npm run db:init               # 初始化 SQLite 数据库 + 种子数据
npm run migrate:agentcms      # 从 agentCMS 迁移样本数据 (67 产品 + 668 订单)
npm run dev                   # 启动开发服务器 (localhost:3000)
```

打开 `http://localhost:3000` 查看 Agent Workspace。

## 目录 (V3)

```
apps/ecommerce/         # 电商业务空间 — 全部业务逻辑在此
  analysis/               decision/ metrics/ explainability/ composition.ts
  experience/             review/ connectors/ workspace/
  skills/ policy/ knowledge/ reports/
platform/               # 共享基础设施
  runtime/hermes/          storage/ server/
shared/                 # 跨 App 共享 (schemas + utils)
```

## 核心命令

| 命令 | 说明 |
|------|------|
| `npm run typecheck` | TypeScript 类型检查 |
| `npm test` | 运行全部测试 (144 tests) |
| `npm run dev` | 开发服务器 (tsx watch platform/server) |
| `npm run cli -- rank` | CLI: 排名计算 |

## 技术栈

Node.js + TypeScript (ES modules) · Express 5 · SQLite (better-sqlite3, WAL) · Zod · Vitest · Vanilla JS SPA · Hermes (Python, subprocess)

## 设计原则

1. **不重建 Runtime** — Hermes 负责执行；agentFabric 负责业务智能
2. **业务分层** — 代码按业务组织，而非技术分层。没有通用的 "domain"
3. **人在回路中** — 所有重要决策保持可审核
4. **可解释性** — 每个 AI 结论追溯到证据
5. **Runtime 可替换** — 业务逻辑只依赖 `HermesClient` 接口
