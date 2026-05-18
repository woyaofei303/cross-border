# PRD：跨境电商独立站 MVP 强化

Status: ready-for-agent
Triage label: ready-for-agent

## 问题说明

当前 Storefront（独立站前台）已经是一个可运行原型，但购物行为仍集中在 UI 组件中，Product discovery（商品发现）和 Cart（购物车）规则还没有形成可测试的产品边界。后续开发需要一份清晰的一阶段计划，在保留当前视觉方向的同时，让 Destination Market（目的市场）、Currency（展示货币）、Collection（前台商品集合）和 Cart（购物车）行为足够可靠，能够继续扩展到 Checkout Handoff（结账交接）。

## 解决方案

把 Collection（前台商品集合）和 Cart（购物车）视为明确的电商行为，对独立站第一阶段能力做强化。继续保留当前单页 Storefront，但将商品筛选、货币展示、购物车更新、Duty Promise（关税承诺）、Delivery Promise（配送承诺）和 Checkout Handoff（结账交接）规则沉淀为可通过公共接口测试的行为。在配置远程 issue tracker 前，使用本地 Markdown 文件管理 PRD 和任务。

## 用户故事

1. 作为顾客，我希望看到可信的跨境电商独立站，从而理解这个品牌卖什么。
2. 作为顾客，我希望浏览 Collection（前台商品集合），从而找到自己感兴趣的商品。
3. 作为顾客，我希望按 Category（商品分类）筛选 Product（商品），从而快速缩小选择范围。
4. 作为顾客，我希望用选中的 Currency（展示货币）查看价格，从而用熟悉的货币理解成本。
5. 作为顾客，我希望选择 Destination Market（目的市场），从而看到符合所在地的配送和关税说明。
6. 作为顾客，我希望看到当前 Destination Market 的 Duty Promise（关税承诺），从而知道关税或 VAT 是否已处理。
7. 作为顾客，我希望看到当前 Destination Market 的 Delivery Promise（配送承诺），从而预估到货时间。
8. 作为顾客，我希望商品卡片展示 Fulfillment Origin（履约来源地）和发货时效，从而判断履约可信度。
9. 作为顾客，我希望把 Product（商品）加入 Cart（购物车），从而准备下单。
10. 作为顾客，我希望重复添加同一个 Product 时只增加同一条 Cart Line（购物车行）的数量，从而避免重复行。
11. 作为顾客，我希望增减 Cart Line 数量，从而在结账前调整订单。
12. 作为顾客，我希望 Cart Line 数量降到 0 时自动移除，从而保持购物车整洁。
13. 作为顾客，我希望空 Cart 有清晰状态，从而知道当前没有待结账商品。
14. 作为顾客，我希望看到 Cart 小计、运费和总价，从而在 Checkout Handoff 前了解订单成本。
15. 作为顾客，我希望订单超过门槛后免运费，从而理解提高客单价的激励。
16. 作为顾客，我希望空 Cart 时无法进入 Checkout Handoff，从而避免无商品结账。
17. 作为开发者，我希望电商规则与 UI 分离，从而不渲染 Storefront 也能测试购物车和价格行为。
18. 作为开发者，我希望任务被拆成纵向切片，从而每个任务都能独立验证。
19. 作为开发者，我希望 `CONTEXT.md` 记录项目领域语言，从而后续规格和测试使用一致术语。

## 实现决策

- 当前项目使用单上下文领域词汇表。
- 在远程 issue tracker 配置前，使用 `.scratch/cross-border-storefront/` 下的本地 Markdown 文件管理任务。
- 将 `Destination Market`、`Currency`、`Product`、`Collection`、`Category`、`Cart`、`Cart Line`、`Duty Promise`、`Delivery Promise`、`Checkout Handoff` 作为标准领域术语。
- 将 Cart 和价格相关行为抽成一个接口小、行为集中的 commerce 模块。
- Storefront 保持为 client component，因为 Cart 和市场选择器需要交互。
- 当前阶段 Product 数据保持静态。后端库存、CMS 和支付集成都不在范围内。
- Checkout Handoff 只保留为启用/禁用的 UI 入口，不包含真实支付采集。

## 测试决策

- 测试公共电商行为，不测试 UI 内部实现细节。
- 优先覆盖 Product 筛选、Currency 格式化、Cart Line 更新、免运费门槛和 Cart 汇总。
- 使用 Vitest 测试独立 TypeScript 模块。
- 浏览器验证仍用于视觉回归，但第一阶段 TDD 切片优先覆盖 commerce 模块。

## 不在范围内

- 真实支付处理
- 真实税费、VAT、IOSS、DDP 或清关计算
- 库存锁定
- 登录和顾客账号
- 订单持久化
- CMS 商品管理
- 多语言内容
- 创建远程 GitHub issues

## 备注

本 PRD 遵循已安装的 `grill-with-docs`、`to-prd`、`to-issues` 和 `tdd` 工作流。当前实现已经具备可视化 Storefront，本阶段重点是让第一条顾客购物路径更明确、更可测试，也更容易继续扩展。
