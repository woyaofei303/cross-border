# 领域文档

当前项目已经从单站点独立站升级为多站点 Commerce OS 实现项目。

领域语言记录在：

```text
CONTEXT.md
```

实现基线、核心架构和数据模型记录在：

```text
docs/current-implementation-baseline.md
docs/commerce-os-architecture.md
docs/mvp-data-model-and-enums.md
docs/technology-decisions.md
docs/commerce-os-runbook.md
```

在规划需求、编写测试或修改业务行为前，先阅读 `CONTEXT.md`。PRD、issues、测试命名和实现说明应尽量使用其中约定的领域词。需要了解当前代码已经做到哪里时，再阅读 `docs/current-implementation-baseline.md`。

当前最重要的领域约束：

```text
- 前台请求必须通过 domain resolve 得到 site context
- 后台请求必须通过 RBAC + scope 过滤数据
- 订单、支付、履约、售后状态必须分列
- 支付 webhook 必须幂等落库，再由 Commerce Pipeline 处理业务
- 库存必须区分 available_qty、locked_qty、physical_qty、inbound_qty、safety_qty
- 库存变化必须写 inventory_transactions
- 高风险后台动作必须写 admin/audit 日志
```

相关项目专用 skill：

```text
skills/cross-border-commerce-os/SKILL.md
```

优先使用该 skill 处理本项目的架构、页面补齐、交易链路、运行验证和风险模块改造。

ADR 不需要频繁创建。当前项目先使用 `docs/technology-decisions.md` 记录技术决策；只有当某个决策同时满足以下条件时，才考虑新增 ADR：

- 后续反悔成本较高
- 未来读代码的人可能不理解为什么这样做
- 这是在多个真实备选方案中权衡后的选择
