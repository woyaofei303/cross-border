# Skills 使用说明

本项目安装了 `mattpocock/skills`，并新增一个项目专用 skill：

```text
skills/cross-border-commerce-os/SKILL.md
```

项目内的 `skills/` 目录只用于版本化 skill 内容，不等同于 Codex 全局可选 skill。要让 `/grill-with-docs`、`/to-prd`、`/to-issues` 等 slash skill 出现在 Codex 可选列表里，必须把它们安装或同步到全局目录：

```text
/Users/julian/.codex/skills
```

本机已经把当前仓库 `skills/*` 同步到全局 Codex skills 目录。Codex 通常需要重启或开启新会话后才会重新加载全局 skill 列表。

后续处理本项目的架构、页面补齐、交易链路、数据库迁移、支付/库存/履约/售后/权限/审计风险时，优先使用项目专用 skill。

如需重新同步：

```bash
for skill_dir in skills/*; do
  if [ -d "$skill_dir" ]; then
    skill_name="$(basename "$skill_dir")"
    mkdir -p "$HOME/.codex/skills/$skill_name"
    cp -R "$skill_dir/." "$HOME/.codex/skills/$skill_name/"
  fi
done
```

## 推荐使用方式

如果 slash 命令可用：

```text
/cross-border-commerce-os
继续补齐前后台交易闭环，先读 CONTEXT.md 和 docs/commerce-os-runbook.md。
```

如果 slash 命令不可用：

```text
Use skills/cross-border-commerce-os/SKILL.md for this session.
```

## 项目专用 skill 覆盖范围

```text
- 多站点 Commerce OS 架构边界
- default site 兼容
- 前台 domain resolve / site context
- 后台 RBAC + scope
- 订单/支付/库存/履约/售后状态机
- 支付 webhook 幂等
- Commerce Pipeline
- 库存锁定、扣减、释放和流水
- 前台商品发现、购物车、结算、支付结果、订单列表、订单详情、售后申请和 Account Lite smoke
- 后台订单列表、订单详情和高风险链路记录排查
- 后台支付单、支付交易、支付 webhook 和 Commerce Pipeline 操作页
- 后台 SKU 库存余额、库存锁和库存流水操作页
- 后台订单详情履约动作：创建履约单、创建物流单、标记签收
- 后台售后列表、售后详情、退款审批、拒绝申请和标记退款成功
- 后台商品目录列表、商品详情、SKU 维护、分类维护和垂类属性维护
- 商品目录 smoke：后台商品状态变更、Admin 列表/详情、垂类属性页、Storefront 商品 API/Page 联动
- 前台 Account Lite、Site Customer、默认地址复用和后台客户列表
- 后台 RBAC Scope、Scope 赋权、Audit Trail 和越权验证
- 后台 Analytics Dashboard、Operations Dashboard 和 scoped projection/risk rows
- 后台全局导航：Ant Design 后台壳层、真实页面路由、固定侧边栏、可记忆 Admin Work Tabs、English / 简体中文切换和主要页面/详情页静态 UI 文案检查
- 后台工作区：Admin Work Tabs 按 pathname 去重、查询条件更新当前标签且不改变已有标签顺序、主内容区全宽弹性布局、旧页面统一套用 Ant Design 风格表格/卡片/表单
- 后台视觉和控件基线：背景、按钮、字体颜色、icon/文字对齐、输入框、搜索框、复选框/单选框、提示、统计卡和表格遵循全局 Ant Design 规范；查询条件和行内操作区使用统一控件高度，按钮按控件底线对齐；可见 client-side 操作面板优先使用 Ant Design 组件
- 后台可扫读性检查：Admin Work Tabs active/非 active 必须明显区分；指标卡 icon/label/value 对齐；scope/site/status 使用紧凑分组；宽屏表单避免被拉散
- 后台列表查询基线：订单、支付、库存、售后、客户、商品和垂类属性页面必须提供符合业务的搜索/状态/时间筛选和分页；查询条件必须保留 Admin Scope / Site，不得通过前端筛选扩大后端授权范围
- 后台搜索表格组件化：参考 `security-admin` 的 SearchForm/SearchTable 分层，查询表单、资源表格、分页和请求序列化分离；当前项目用 `AdminQueryPanel`、`AdminResourceTable`、`AdminPagination` 作为适配层，查询输入、下拉、日期和按钮必须使用 Ant Design 控件
- API 契约管理：`apps/api` 是 canonical Commerce Core REST API；`/api/docs` 和 `/api/docs-json` 是 OpenAPI 契约；统一后台 `/api-catalog` 是可视化接口目录；Next route handlers 只能作为 BFF/proxy adapter
- 垂类属性页定位：用于维护动态商品属性、商品编辑字段、前台筛选和搜索分面，不是普通商品列表；布局应先说明用途，再提供属性搜索/筛选，最后展示紧凑编辑配置行和分页定义表
- 后台运营总览大屏：指标卡、趋势图、渠道分布、商品排行、风险提醒、Scope/Site 切换和 Analytics/Operations 下钻
- 后台审计日志
- 本地三端启动和 smoke 验证
- 文档和任务交接
```

## 当前常用通用 skills

需求澄清和领域文档：

```text
/grill-with-docs
```

生成 PRD：

```text
/to-prd
```

拆分本地 issue：

```text
/to-issues
```

测试驱动开发：

```text
/tdd
```

系统诊断：

```text
/diagnose
```

架构改进：

```text
/improve-codebase-architecture
```

代码评审：

```text
/review
```

交接说明：

```text
/handoff
```

## 当前项目上下文入口

每次开始重要任务前，先读：

```text
CONTEXT.md
docs/current-implementation-baseline.md
docs/commerce-os-architecture.md
docs/mvp-data-model-and-enums.md
docs/technology-decisions.md
docs/commerce-os-runbook.md
docs/agents/domain.md
```

本地任务目录：

```text
.scratch/multi-site-commerce-os/
.scratch/cross-border-storefront/
```

注意：`.scratch/cross-border-storefront/` 来自早期单站点前台阶段，里面的任务不能直接当作当前全量 Commerce OS 任务清单。继续开发时需要按多站点、统一后台和高风险链路重新拆分任务。

## 当前验证命令

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm db:validate
DATABASE_URL=postgres://cross_border:cross_border_password@localhost:5432/cross_border_store pnpm e2e:commerce
pnpm build
git diff --check
```

## 启动三端

```bash
DATABASE_URL=postgres://cross_border:cross_border_password@localhost:5432/cross_border_store API_PORT=4000 pnpm --filter @cross-border/api dev
```

```bash
API_BASE_URL=http://127.0.0.1:4000 NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:4000 PORT=3000 pnpm --filter @cross-border/storefront dev
```

```bash
API_BASE_URL=http://127.0.0.1:4000 NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:4000 PORT=3001 pnpm --filter @cross-border/admin dev
```

## 更新 skills

查看已安装 skills：

```bash
npx skills@latest list
```

查看上游可安装 skills：

```bash
npx skills@latest add mattpocock/skills -l --full-depth
```

更新上游 skills：

```bash
npx skills@latest update -y
```

更新后必须检查项目专用 skill 是否仍然存在：

```bash
test -f skills/cross-border-commerce-os/SKILL.md && echo ok
```
