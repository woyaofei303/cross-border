# Issue 004：完善商品发现控件

Status: ready
Triage label: ready-for-agent

## Parent

`.scratch/cross-border-storefront/prd.md`

## 要构建什么

将当前只读的搜索提示替换为真正可用的 Product discovery（商品发现）控件，使它能和 Category（商品分类）筛选一起作用于 Collection（前台商品集合）。

## 验收条件

- [ ] 搜索输入能按 Product 名称和描述筛选商品。
- [ ] 搜索和 Category 筛选组合后结果可预测。
- [ ] 搜索无结果时展示有用的空状态。
- [ ] 清空搜索后恢复当前 Category 下的商品结果。
- [ ] 测试通过公共筛选接口覆盖商品发现行为。

## 阻塞关系

- Issue 001
