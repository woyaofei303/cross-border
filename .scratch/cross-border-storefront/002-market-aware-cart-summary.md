# Issue 002：让购物车汇总感知目的市场

Status: done
Triage label: ready-for-agent

## Parent

`.scratch/cross-border-storefront/prd.md`

## 要构建什么

扩展 Cart（购物车）汇总能力，让它能稳定呈现 Destination Market（目的市场）对应的 Duty Promise（关税承诺）和 Delivery Promise（配送承诺），并在市场选择区域和购物车侧栏中保持一致。

## 验收条件

- [x] 切换 Destination Market 后，页面展示的 Duty Promise 会更新。
- [x] 切换 Destination Market 后，页面展示的 Delivery Promise 会更新。
- [x] Cart 侧栏重复展示当前 Destination Market 的 Duty Promise。
- [x] 市场相关文案只有一个数据来源。
- [x] 测试覆盖市场查找的兜底行为。

## 阻塞关系

- Issue 001
