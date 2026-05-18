# Issue 001：抽出可测试的电商规则模块

Status: done
Triage label: ready-for-agent

## Parent

`.scratch/cross-border-storefront/prd.md`

## 要构建什么

将 Product（商品）筛选、Currency（展示货币）格式化、Cart Line（购物车行）更新和 Cart（购物车）汇总计算抽成一个公共 commerce 模块，供 Storefront UI 调用。该模块需要保持当前 Storefront 行为不变，同时让关键购物车和价格规则在不渲染 UI 的情况下可测试。

## 验收条件

- [x] 选择 `All` 时返回完整 Collection（前台商品集合），选择某个 Category（商品分类）时只返回匹配商品。
- [x] Currency（展示货币）格式化支持 USD、EUR、GBP，并使用配置的汇率。
- [x] 重复添加同一个 Product（商品）时递增同一条 Cart Line（购物车行），不创建重复行。
- [x] Cart Line 数量降到 0 时从 Cart 中移除。
- [x] Cart 汇总返回数量、小计、运费和总价，并应用免运费门槛。
- [x] Storefront UI 使用 commerce 模块，不再内联重复这些规则。
- [x] Vitest 覆盖该模块的公共行为。

## 阻塞关系

None - can start immediately
