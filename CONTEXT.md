# Multi-site Vertical Commerce OS Glossary

本文件只记录领域语言、关系和已澄清歧义。实现状态、模块清单、运行步骤和技术决策分别记录在 `docs/current-implementation-baseline.md`、`docs/commerce-os-runbook.md` 和 `docs/technology-decisions.md`。

## 领域语言

**Commerce OS（电商中台）**:
统一承载商品、订单、支付、库存、履约、售后、客服、CRM、营销、分析、权限和审计的电商业务系统。
_避免使用_: 只把系统称为商城页面

**Storefront（前台站点）**:
面向顾客的独立站前台。一个 Storefront 可以承载多个 Site 的顾客体验。
_避免使用_: Website, landing page

**Unified Admin（统一后台）**:
运营、客服、仓配、财务、管理员按授权范围管理多站点业务数据的后台。
_避免使用_: 单站点后台

**Admin Work Tab（后台工作标签页）**:
统一后台中记录管理员已打开业务页面的可关闭工作入口。
_避免使用_: Browser Tab，当讨论的是后台内置工作区标签时不要说浏览器标签

**Admin Route Identity（后台路由身份）**:
后台工作标签判断是否为同一业务页面的路由身份。列表页按路径识别，查询条件变化仍属于同一入口；详情页按包含业务对象标识的路径识别。
_避免使用_: 把筛选参数变化当成新的工作页面

**Site（站点）**:
一个可独立访问、独立配置商品、分类、SEO、主题、营销和支付/物流策略的销售站点。
_避免使用_: 前台项目副本

**Site Domain（站点域名）**:
用于把顾客访问的域名归属到某个 Site 的域名配置。
_避免使用_: 让顾客或前台代码直接选择 site_id

**Vertical（垂直领域）**:
业务垂类，例如眼镜、鞋、美妆、手表。Vertical 决定商品属性、筛选方式和运营模型。
_避免使用_: Category，当语义是业务垂类时不要用 Category

**Brand（品牌）**:
品牌资产和业务归属维度。一个 Site 属于一个 Brand，一个 Brand 可以拥有多个 Site。

**Site Context（站点上下文）**:
一次顾客请求所属的 Site、Vertical、Brand 和站点配置。
_避免使用_: User-selected site id

**Admin Scope（后台数据范围）**:
管理员可访问的数据范围，类型为 Global、Vertical、Brand 或 Site。
_避免使用_: 只用菜单权限表达数据权限

**Global User（全局用户）**:
跨站点唯一的登录身份，用于表达同一个自然人在多个 Site 间的基础身份。
_避免使用_: Customer，当讨论的是跨站身份时

**Site Customer（站点顾客）**:
Global User 在某个 Site 下的顾客档案、会员等级、积分和站点内生命周期。
_避免使用_: User，当讨论的是站点内顾客关系时

**Product（商品/SPU）**:
可售商品主数据。订单必须保留 Product 的交易快照。
_避免使用_: SKU，当讨论的是商品主数据时

**SKU（销售规格）**:
可定价、可售卖、可扣库存的最小销售规格。
_避免使用_: Product，当讨论的是库存或规格时

**Vertical Attribute（垂类动态属性）**:
按 Vertical 配置的商品属性，例如眼镜的镜框材质、鞋的尺码。
_避免使用_: Hard-coded product field

**Cart（购物车）**:
顾客在某个 Site 下准备购买的 SKU 和数量集合。
_避免使用_: Basket

**Cart Line（购物车行）**:
购物车中的一条 SKU 和数量记录。
_避免使用_: Item，当数量是语义的一部分时不要用 Item

**Order（订单）**:
顾客提交后的交易事实和快照，包含商品、金额、支付、履约和售后状态。
_避免使用_: Payment，当讨论的是交易整体时

**Order Status（订单状态）**:
订单主流程状态，例如待支付、已支付、已确认、已完成、已取消。

**Payment Status（支付状态）**:
订单支付维度状态，例如未支付、支付中、已支付、退款中、已退款、拒付。

**Fulfillment Status（履约状态）**:
订单仓配维度状态，例如未履约、待发货、已发货、已签收。

**Aftersales Status（售后状态）**:
订单售后维度状态，例如无售后、申请中、审核中、退款中、已完成。

**Payment Order（支付单）**:
支付模块为某个 Order 创建的本地支付意图记录。
_避免使用_: Order，当讨论的是支付渠道交互时

**Payment Webhook（支付回调）**:
第三方支付渠道异步通知支付结果的事件入口。
_避免使用_: Frontend payment result

**Inventory Lock（库存锁定）**:
下单后、支付成功前，对 SKU 库存的临时占用。

**Inventory Transaction（库存流水）**:
任何库存余额变化的追加式业务流水。
_避免使用_: 只说 update quantity

**Fulfillment Order（履约单）**:
后台为已支付订单创建的发货处理对象。
_避免使用_: Shipment，当讨论的是仓库处理单据时

**Shipment（物流单）**:
承运商、运单号和物流轨迹记录。
_避免使用_: Fulfillment Order，当讨论的是承运商运输记录时

**After-sales Request（售后申请）**:
顾客发起的退款、退货退款或换货请求。
_避免使用_: Refund，当审核、退货或换货尚未完成时

**Refund（退款）**:
支付渠道或财务侧实际退回款项的动作或记录。
_避免使用_: After-sales Request，当只是售后申请时

**Domain Event（领域事件）**:
业务事实发生后的事件记录，例如 OrderCreated、PaymentSucceeded、OrderPaid。

**Outbox（发件箱）**:
在业务事务中一起写入、随后由后台处理器消费的事件存储。

**Commerce Pipeline（交易管道）**:
处理支付回调、支付成功事件和交易分析投影的后台业务管道。

## 关系

- 一个 **Vertical** 可以包含多个 **Site**
- 一个 **Brand** 可以包含多个 **Site**
- 一个 **Site** 绑定一个 **Vertical** 和一个 **Brand**
- 一个 **Site Domain** 解析到一个 **Site**
- 一个顾客请求只能归属于一个 **Site Context**
- 一个后台请求必须受 **Admin Scope** 限制
- 一个 **Admin Work Tab** 指向一个统一后台业务页面
- 一个 **Admin Route Identity** 只能对应一个当前打开的 **Admin Work Tab**
- 一个 **Global User** 可以拥有多个 **Site Customer**
- 一个 **Product** 可以有多个 **SKU**
- 一个 **Cart** 只能包含同一个 **Site** 的 **Cart Line**
- 一个 **Order** 只能属于一个 **Site**
- 一个 **Payment Order** 只能绑定一个 **Order**
- 一个 **Payment Webhook** 描述一个支付渠道事件
- 一个 **Inventory Lock** 最终会释放、扣减或过期
- 一个 **Fulfillment Order** 只能从可履约的 **Order** 创建
- 一个 **Shipment** 属于一个 **Fulfillment Order**
- 一个 **After-sales Request** 可以产生一个或多个 **Refund**

## 已澄清的歧义

- “站点”不是前台代码副本，而是同一套 Storefront 下的销售上下文。
- “垂类”不是普通商品分类。Vertical 决定属性模型和运营方式，Category 面向前台导航和筛选。
- “用户”可能指 Global User 或 Site Customer。跨站身份使用 Global User，站点内顾客关系使用 Site Customer。
- “支付成功”只能来自 Payment Webhook 或可信后台处理结果，不能来自前台跳转结果。
- “售后申请”不等于“退款成功”。售后描述顾客请求和审核流程，Refund 描述实际退回款项。
- “履约单”不等于“物流单”。Fulfillment Order 是仓配处理对象，Shipment 是承运商运输记录。
- “库存”不是一个 quantity。库存余额至少区分可售、锁定、实物、在途和安全库存。
