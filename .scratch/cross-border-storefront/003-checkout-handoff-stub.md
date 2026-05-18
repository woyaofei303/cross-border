# Issue 003：添加结账交接占位流程

Status: ready
Triage label: ready-for-agent

## Parent

`.scratch/cross-border-storefront/prd.md`

## 要构建什么

将当前结账按钮明确为 Checkout Handoff（结账交接）占位流程：它需要校验 Cart（购物车）非空，并在不接入支付服务商的前提下展示清晰的下一步状态。

## 验收条件

- [ ] Cart 为空时 Checkout Handoff 保持禁用。
- [ ] Cart 至少包含一条 Cart Line 时 Checkout Handoff 可用。
- [ ] 点击 Checkout Handoff 后展示明确的非支付占位状态。
- [ ] 占位状态包含总价、选中的 Currency（展示货币）和 Destination Market（目的市场）。
- [ ] 测试覆盖结账交接是否可用的规则。

## 阻塞关系

- Issue 001
