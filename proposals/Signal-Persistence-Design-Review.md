# Signal Persistence Design Review

**日期**: 2026-07-09 | **触发**: P0006.1 C1 — 信号不跨日期持久化

## 1. 问题

### 症状

`POST /api/runtime/collect` 返回 `signalCount=25`，但信号不写入 DB。

DB 验证: 1858 条信号全部属于 `2026-07-04`，`2026-07-09` 为 0 条。

### 根因

`storeSignals()` 的 UNIQUE 约束:
```sql
UNIQUE (entity_type, entity_id, signal_name, window)
```

`normalizeSignal()` 设置 `signal_name = signalType`（即 `daily_summary`, `hourly_traffic`）。

结果: `daily_summary` + `jd_shop_001` + `24h` 构成**永久唯一键**。第二天的 `daily_summary` 与第一天冲突 → `ON CONFLICT DO UPDATE SET` → 旧行的 `signal_id` 不变，新数据静默覆盖旧数据。

## 2. 数据流追踪

### 从采集到存储的完整路径

```
Step 1: SignalCollectorInput (有 timestamp)
  ├── signal_type: 'daily_summary'    ← 类型
  ├── timestamp: '2026-07-09T00:00:00Z'  ← 观测时间
  └── metrics: { gmv, orders, ... }

        ↓ normalizeSignal()

Step 2: EnterpriseSignal (Signal 扩展)
  ├── signal_name: 'daily_summary'    ← 来自 signal_type (类型)
  ├── signal_id: 'jd-daily-2026-07-09-2e588ce0'  ← 唯一ID (含日期)
  ├── window: '24h'
  ├── entity_type: 'product'
  ├── entity_id: 'jd_shop_001'
  └── source.ingested_at: '2026-07-09T...'

        ↓ SignalFacade.store() → storeSignals()

Step 3: SQLite signals 表
  UNIQUE (entity_type, entity_id, signal_name, window)
  冲突时: ON CONFLICT DO UPDATE SET (signal_id 不更新)
```

### 关键断裂点

| 字段 | 来源 | 是否进入 UNIQUE 键 |
|------|------|-------------------|
| `signal_name` | `signalType` (来自 blueprint) | ✅ |
| `entity_type` | `inferEntityType(signalType)` | ✅ |
| `entity_id` | `input.shop_id` | ✅ |
| `window` | `inferWindow(signalType)` | ✅ |
| `timestamp` (观测时间) | `SignalCollectorInput.timestamp` | ❌ **丢失** |
| `signal_id` (含日期) | 手工构造 | ❌ (PRIMARY KEY, 不在约束中) |

**核心矛盾**: UNIQUE 键定义了 "一个实体只能有一个某类型的信号"，但业务语义是 "一个实体每天/每小时产生一个某类型的观测"。

## 3. 两层模型

### 当前混淆

```
signal_name = 'daily_summary'     ← 这是 Signal Type
signal_name = 'hourly_traffic_14' ← 这是 Signal Type + 观测小时 (补丁)
```

`_14` 后缀把**观测时间**编码进了**类型名**，混淆了两层。

### 正确模型

```
┌─────────────────────────────────────────────────┐
│ Layer 1: Signal Type (Definition)               │
│                                                 │
│ signal_name: 'daily_summary'                    │
│ signal_name: 'hourly_traffic'                   │
│ signal_name: 'hourly_sales'                     │
│                                                 │
│ 永远固定。来自 blueprint.manifest.signal_types  │
│ 属性：signal_unit, window, 业务含义             │
└─────────────────────────────────────────────────┘
                      │
                      │ 每次采集产生一个新的
                      ▼
┌─────────────────────────────────────────────────┐
│ Layer 2: Observation (Instance)                 │
│                                                 │
│ daily_summary  on 2026-07-09  for jd_shop_001   │
│ daily_summary  on 2026-07-10  for jd_shop_001   │
│ hourly_traffic on 2026-07-09T14  for jd_shop_001│
│                                                 │
│ 观测时间来自 SignalCollectorInput.timestamp      │
└─────────────────────────────────────────────────┘
```

## 4. 当前 schema 分析

```sql
CREATE TABLE signals (
  signal_id      TEXT PRIMARY KEY,     -- 含日期 UUID
  entity_type    TEXT NOT NULL,         -- 'product'
  entity_id      TEXT NOT NULL,         -- 'jd_shop_001'
  signal_name    TEXT NOT NULL,         -- 'daily_summary' 或 'hourly_traffic_14' (补丁)
  signal_value   REAL NOT NULL,
  signal_unit    TEXT NOT NULL,
  signal_direction TEXT NOT NULL,
  weight         REAL NOT NULL,
  confidence     REAL NOT NULL,
  source_platform TEXT,
  source_dataset  TEXT,
  window         TEXT NOT NULL,         -- '24h', '1h', '3d', '7d', '14d'
  lifecycle_status TEXT NOT NULL,
  lifecycle_expires_at TEXT,
  transform_hash TEXT,
  metrics        TEXT,                  -- JSON
  raw_payload    TEXT,                  -- JSON
  collector_trace_id TEXT,
  ingested_at    TEXT NOT NULL,         -- 采集时刻（不是观测时刻）
  UNIQUE (entity_type, entity_id, signal_name, window)
);
```

### 问题清单

| # | 字段 | 问题 |
|---|------|------|
| 1 | `signal_name` | 承载了两层含义：类型 (`daily_summary`) + 观测小时 (`_14`)。类型被补丁污染 |
| 2 | `ingested_at` | 采集时刻（系统时间），不是观测时刻（业务时间）。两个 14:00 采集的同一天数据会有不同的 `ingested_at` |
| 3 | `timestamp` | 存在于 `SignalCollectorInput` 和 `EnterpriseSignalPayload` 内，但不在 Signal 顶层，也不在 signals 表中。**观测时间在持久化层完全丢失** |
| 4 | UNIQUE 键 | `(entity_type, entity_id, signal_name, window)` 定义了永久唯一性，违背时间序列语义 |
| 5 | `metrics` | JSON 列包含 `EnterpriseSignalPayload`（含 timestamp），但 SQLite 无法对 JSON 内部字段建索引 |
| 6 | `hourly_snapshot_signals` | 引用了 `signal_id`，但 UNIQUE 冲突导致 signal_id 指向的总是第一次采集的行 |

## 5. 修复方案对比

### 方案 A: signal_name 加日期后缀 ❌

```
'daily_summary' → 'daily_summary_2026-07-09'
```

| 优点 | 缺点 |
|------|------|
| Schema 不改 | 类型空间无限增长 |
| 改动最小 | `signal_name` 无法再作为类型查询 |
| | 与 blueprint signal_types 脱钩 |
| | 查询 "所有 daily_summary" 需要 LIKE |
| | 本质上把二维问题压进了一维字符串 |

### 方案 B: 添加 `observed_at` 列 ✅ (推荐)

```sql
ALTER TABLE signals ADD COLUMN observed_at TEXT NOT NULL DEFAULT '';
-- 回填现有数据（从 signal_id 提取日期）
UPDATE signals SET observed_at = ... WHERE observed_at = '';

-- 新 UNIQUE 键
CREATE UNIQUE INDEX idx_signals_observation 
  ON signals(entity_type, entity_id, signal_name, window, observed_at);
```

| 优点 | 缺点 |
|------|------|
| 两层模型显式化 | Schema migration 需要回填 |
| `signal_name` 保持纯净 | 所有读取路径需更新 |
| 按类型查询: `WHERE signal_name = 'daily_summary'` | |
| 按时间查询: `WHERE observed_at >= '2026-07-09'` | |
| 自然支持所有粒度 (日、小时、分钟) | |
| UNIQUE 键保证同实体同类型同窗口同观测时间幂等 | |

### 方案 C: 移除 UNIQUE 约束，仅用 signal_id ❌

| 优点 | 缺点 |
|------|------|
| 最简 Schema | 重复采集会产生重复行 |
| signal_id 已包含日期 | 无幂等性保证 |
| | 需要应用层去重逻辑 |

## 6. 推荐方案 (B) 的完整改动

### 6.1 Schema Migration

```sql
-- 1. 添加 observed_at 列
ALTER TABLE signals ADD COLUMN observed_at TEXT NOT NULL DEFAULT '';

-- 2. 从 signal_id 提取日期回填 observed_at
--    signal_id 格式: jd-daily-2026-07-04-xxx 或 jd-hourly-traffic-2026-07-04-20260704140000-xxx
--    正则提取第一个日期: \d{4}-\d{2}-\d{2}
UPDATE signals SET observed_at = <extracted_date> WHERE observed_at = '';

-- 3. 删除旧 UNIQUE 约束 (SQLite 不支持 ALTER DROP CONSTRAINT, 需重建表)

-- 4. 创建新 UNIQUE 索引
CREATE UNIQUE INDEX idx_signals_observation 
  ON signals(entity_type, entity_id, signal_name, window, observed_at);
```

### 6.2 normalizeSignal — 传递 timestamp

```typescript
// normalizer.ts — 当前 (第 167 行)
return {
  signal_id: input.signal_id,
  entity_type: inferEntityType(signalType),
  entity_id: input.shop_id,
  signal_name: signalType,  // 纯净的类型名
  // ... 
  source: {
    platform: input.source,
    dataset: 'enterprise',
    ingested_at: ingestedAt,
  },
  // ❌ timestamp 丢失
};

// 修复后
return {
  // ... 同上 ...
  observed_at: input.timestamp,  // ← 新增: 观测时间
};
```

### 6.3 SignalSchema — 新增 observed_at

```typescript
// shared/schemas/signal.ts
export const SignalSchema = z.object({
  signal_id: z.string().min(1),
  entity_type: SignalEntityTypeSchema,
  entity_id: z.string().min(1),
  signal_name: z.string().min(1),
  signal_value: z.number(),
  // ... existing fields ...
  observed_at: IsoDateString,  // ← 新增
});
```

且 `EnterpriseSignalPayloadSchema` 中的 `timestamp` 保持不变（那是 metrics 内部的业务时间戳）。

### 6.4 signal-engine — 回退小时后缀补丁

```typescript
// runtime-signal-engine.ts — 当前
case 'hourly_traffic': {
  const hourSuffix = extractHour(h.hour);
  signals.push({ ...signal, signal_name: `${signal.signal_name}_${hourSuffix}` });
}

// 修复后 — signal_name 保持 'hourly_traffic'
case 'hourly_traffic': {
  signals.push(signal);  // observed_at = h.hour (已在 normalizeSignal 中设置)
}
```

`observed_at` 区分不同小时的观测，不再需要 `_14` 后缀。

### 6.5 storeSignals — 新 UNIQUE 键

```typescript
// repository.ts storeSignals
ON CONFLICT(entity_type, entity_id, signal_name, window, observed_at) DO UPDATE SET
  signal_value = excluded.signal_value,
  ...
```

### 6.6 listAllSignals — 按观测时间排序

```typescript
// repository.ts — 当前
ORDER BY entity_id, ingested_at DESC

// 修复后
ORDER BY entity_id, observed_at DESC
```

### 6.7 受影响模块清单

| 模块 | 改动 | 影响 |
|------|------|------|
| `shared/schemas/signal.ts` | SignalSchema +observed_at | 所有 Signal 消费者 |
| `shared/schemas/common.ts` | 无改动 | — |
| `platform/storage/schema.ts` | signals 表 +observed_at + 新索引 | Migration |
| `apps/ecommerce/connectors/normalizer.ts` | normalizeSignal 传递 timestamp→observed_at | 所有采集路径 |
| `apps/ecommerce/analysis/metrics/repository.ts` | storeSignals 新 UNIQUE; fromRow/toRow +observed_at | 读写路径 |
| `apps/ecommerce/runtime/kernel/runtime-signal-engine.ts` | 删除小时后缀补丁 | Signal 生成 |
| `platform/server/routes/runtime.ts` | 使用 observed_at 分组执行历史 | Execution list |
| `platform/server/routes/chat.ts` | 使用 observed_at 分组日期 | Chat evidence |
| 所有测试文件 | 更新 fixture / assertion | ~10 测试文件 |

## 7. 不变的部分

| 组件 | 不改 | 原因 |
|------|------|------|
| `EnterpriseSignalType` enum | `daily_summary`, `hourly_traffic` 等 | 这是类型定义层，不受影响 |
| `blueprint.manifest.signal_types` | 同上 | 蓝图定义类型，不定义实例 |
| `signal_id` 生成逻辑 | `jd-daily-{date}-{uuid}` | 保持唯一实例标识 |
| `window` 语义 | `'24h'`, `'1h'` 等 | 保持 |
| Ranking / Decision / Explainability | 全部 | 它们消费 Signal，不关心持久化细节 |
| CLI | 全部 | `kernel.execute()` 接口不变 |

## 8. 回退现有补丁的影响

当前 `signal_name = 'hourly_traffic_14'` 是补丁结果。修复后 `signal_name = 'hourly_traffic'`。

已有数据 (`_14` 后缀) 在 migration 时需要处理:
```sql
-- 将 hourly_traffic_14 → hourly_traffic，并从 signal_id 提取小时到 observed_at
UPDATE signals 
SET signal_name = 'hourly_traffic',
    observed_at = <从 signal_id 提取的日期+小时>
WHERE signal_name LIKE 'hourly_traffic\_%';
```

## 9. 总结

**当前状态**: Signal 的两层模型（Type / Observation）在 Schema 中被压扁成一层。`signal_name` 被同时用作类型标识和观测标识。

**目标状态**:
- `signal_name` = 类型标识 (来自 blueprint)
- `observed_at` = 观测时间 (来自采集数据)
- UNIQUE 键 = 类型 + 实体 + 观测时间 → 每天/每小时的观测是独立行

**这不是字符串拼接问题，这是数据模型从一层恢复到两层的问题。**

## 10. 决定

**批准方案 B。** 执行 P0006.1.1 — Signal Observation Model Refactor。

### 补充原则：三层时间轴

以后 **observed_at** 成为 Runtime 的唯一业务时间轴。

以后 Signal、Evidence、Execution、Replay、Trend 全部围绕 `observed_at`。

三层时间轴不可再混：

| 时间轴 | 字段 | 语义 |
|--------|------|------|
| **Business Timeline** | `observed_at` | 业务观测时间 |
| **System Timeline** | `ingested_at` | 系统采集时间 |
| **Execution Timeline** | `execution_id` / `pipeline_run_id` | 执行 Run 标识 |

这是整个 Runtime Timeline 的基础，不是 Bug Fix，而是正式的数据模型升级。
