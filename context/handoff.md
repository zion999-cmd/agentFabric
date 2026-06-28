# 交接文档

## 本次会话 (2026-06-28)

### 新增
- **右侧面板模式合并** — 运营模式 (V1 AI Summary + Steps + Tools) / 开发模式 (Trace Panel 可展开)
- **分析视图恢复** — 侧边栏分析视图完整: 商品分析 + 趋势观察 + 历史归档 + Memory 成长
- **Inbox 卡片恢复** — 完整 V1 卡片: 指标网格 (4 cols), 标签, 时间戳, AI 建议, 查看原因按钮
- **Chat 固定页脚** — 聊天栏固定在页面底部，不随内容滚动
- **ADR-015**: 合并模式 + 移除 Operator/Builder 子切换

### 重构
- 移除顶部 header 的重复模式切换（仅保留右侧面板的切换）
- 移除 Operator/Builder 子切换（与 "运营模式" 语义重复）
- 移除 business_traces FK 约束（修复 ranking 插入失败）

### 修复
- `selectFinding` 函数头丢失 → 页面 JS 崩溃 → 已恢复
- 右侧面板 CSS 默认值混乱 → 由 CSS 管理（#panelBusiness 默认可见，#panelDeveloper 默认隐藏）
- Developer 模式展开/折叠状态管理简化

### 测试
- **144 passed**, Typecheck clean
- Hermes v0.17.0: 子进程 AI 摘要可用
- Dev server: 正常运行，67 产品已排名

### 风险
- Business Context 模块未开始
- Skills/Validation 数据为 stub
- Chat 功能为 stub（Hermes chat 模式需确认）

### 建议下一步
1. **Business Context** — apps/ecommerce/context/
2. **Skills Engine** — Experience → Skill promotion
3. **Replay Simulator** — counterfactual comparison
