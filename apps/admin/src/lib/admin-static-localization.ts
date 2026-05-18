import type { AdminLocale } from "@/lib/admin-i18n";

const zhStaticText = {
	"Access Source": "访问来源",
	"Action": "操作",
	"Active": "启用",
	"Active Locks": "锁定中库存",
	"Active Work": "活跃工作",
	"Add": "新增",
	"Admin Actions": "后台操作",
	"Admin Audits": "后台审计",
	"Admin Manager": "管理员管理角色",
	"Admin Scope": "后台权限范围",
	"Admin Users": "管理员",
	"Admin users, roles, permissions and data-scope assignments.": "管理员、角色、权限与数据范围分配。",
	"Admin user": "管理员",
	"Aftersales": "售后",
	"Aftersales & Refunds": "售后与退款",
	"After-sales": "售后管理",
	"After-sales Actions": "售后操作",
	"After-sales Logs": "售后日志",
	"After-sales Requests": "售后申请",
	"After-sales request approved and refund created.": "售后申请已通过，并已创建退款。",
	"After-sales request rejected.": "售后申请已拒绝。",
	"Admin Order Detail": "后台订单详情",
	"All data": "全部数据",
	"All": "全部",
	"Already": "已存在",
	"Analytics": "数据分析",
	"Analytics Events": "分析事件",
	"Analytics operation failed.": "分析操作失败。",
	"Amount": "金额",
	"API Base URL": "API 基础地址",
	"API Catalog": "接口目录",
	"Admin API": "后台 API",
	"API_BASE_URL is not configured": "未配置 API_BASE_URL",
	"API_BASE_URL is not configured.": "未配置 API_BASE_URL。",
	"API health and shared contract details.": "API 健康检查与共享契约信息。",
	"Approved": "已批准",
	"Approved Amount": "批准金额",
	"Approve Refund": "批准退款",
	"Approve": "批准",
	"Approval changes request state; refund success records money movement.": "批准会变更申请状态；退款成功会记录资金流转。",
	"Approval creates a payment refund record; only marking that refund succeeded changes payment status and closes after-sales.": "批准会创建支付退款记录；只有标记退款成功后，才会变更支付状态并关闭售后。",
	"Assign": "分配",
	"Attribute": "属性",
	"Attribute Definitions": "属性定义",
	"Attribute Search": "属性查询",
	"Attribute saved.": "属性已保存。",
	"Attributes": "属性",
	"Audit": "审计",
	"Audit Logs": "审计日志",
	"Audit Rows": "审计行",
	"Audit Trail": "操作审计",
	"Available": "可售",
	"Available Units": "可售件数",
	"Archived": "已归档",
	"Batch limit must be an integer from 1 to 200.": "批处理数量必须是 1 到 200 的整数。",
	"Backend-scoped query": "后端范围查询",
	"Blocked by admin scope": "被管理员数据范围限制",
	"Brand": "品牌",
	"Brands": "品牌管理",
	"Buyer User": "买家用户",
	"Carrier": "物流商",
	"Catalog Actions": "目录操作",
	"Catalog changes saved.": "目录变更已保存。",
	"Cart": "购物车",
	"Cart Lines": "购物车行",
	"Category": "分类",
	"Category Management": "分类管理",
	"Category changes saved.": "分类变更已保存。",
	"Channel": "渠道",
	"Channel Performance": "渠道表现",
	"Channels": "渠道",
	"Chargeback": "拒付",
	"Claimed": "已领取",
	"Closed": "已关闭",
	"Code": "编码",
	"Commerce OS Admin": "Commerce OS 后台",
	"Commerce OS Dashboard": "Commerce OS 数据大屏",
	"Commerce Performance": "交易表现",
	"Commerce Pipeline": "交易管道",
	"Commerce pipeline operation failed.": "交易管道操作失败。",
	"Contract JSON": "契约 JSON",
	"Control Rule": "控制规则",
	"Created": "创建时间",
	"Create": "创建",
	"Create a current-site refund or return-refund request.": "创建当前站点的仅退款或退货退款申请。",
	"Create a payment order with idempotency key.": "使用幂等键创建支付单。",
	"Create an order, snapshot prices and lock inventory.": "创建订单、生成价格快照并锁定库存。",
	"Create Fulfillment": "创建履约单",
	"Created From": "创建开始",
	"Created To": "创建结束",
	"Customer": "客户",
	"Customer address": "客户地址",
	"Customer LTV": "客户生命周期价值",
	"Customer Profiles": "客户档案",
	"Customers": "客户",
	"Daily Sales": "每日销售",
	"Data Scope": "数据范围",
	"Data access map": "数据访问图",
	"data view for": "数据视图：",
	"Date": "日期",
	"Date From": "日期开始",
	"Date To": "日期结束",
	"Default": "默认",
	"Default Address": "默认地址",
	"Default Brand": "默认品牌",
	"Default Site": "默认站点",
	"Default Vertical": "默认垂类",
	"Default site migrated from the original single-site storefront.": "从原单站点前台迁移而来的默认站点。",
	"Default vertical for migrated single-site commerce data.": "迁移单站点交易数据使用的默认垂类。",
	"Dead Letter": "死信",
	"Deliver": "签收",
	"Delivered": "已签收",
	"Delivered by admin operation": "由后台操作签收",
	"Demo Carrier": "演示物流商",
	"Description": "说明",
	"Detail": "详情",
	"Discount": "折扣",
	"Domain": "域名",
	"Draft": "草稿",
	"Dynamic Attributes": "动态属性",
	"Dynamic catalog attributes by vertical for filters and forms.": "按垂类配置动态商品属性，用于筛选项和表单。",
	"Dynamic catalog attributes define which fields appear in product editing, storefront filters and search facets for this vertical.": "垂类动态属性决定商品编辑表单、前台筛选项和搜索分面的字段。",
	"English": "英语",
	"Error": "错误",
	"Event": "事件",
	"Event ID is required.": "事件 ID 必填。",
	"Expiry": "过期时间",
	"Expires": "过期时间",
	"Failed": "失败",
	"Filter": "筛选",
	"Filter editable fields before changing form and storefront facets.": "修改商品表单和前台筛选分面前，先筛选可编辑字段。",
	"Filterable": "可筛选",
	"Fields": "字段",
	"Flags": "标记",
	"From": "从",
	"Fulfillment": "履约",
	"Fulfillment Actions": "履约操作",
	"Fulfillment order created.": "履约单已创建。",
	"Fulfillment Status": "履约状态",
	"GMV": "GMV",
	"Global": "全局",
	"Global / vertical / brand / site operating view for": "全局 / 垂类 / 品牌 / 站点运营视图：",
	"Gross merchandise value": "商品交易总额",
	"Group": "分组",
	"Guest Token": "游客令牌",
	"Health": "健康检查",
	"Idempotency": "幂等键",
	"Ignored": "已忽略",
	"Inbound": "在途",
	"Inventory": "库存",
	"Inventory Balances": "库存余额",
	"Inventory Locks": "库存锁",
	"Inventory Transactions": "库存流水",
	"Inactive": "停用",
	"Item": "项目",
	"Items": "商品项",
	"Key": "键",
	"Key:": "键：",
	"Keep category naming, sort order and active state compact.": "集中维护分类名称、排序和启用状态，避免表单横向分散。",
	"Last": "最近",
	"Last 7 rows": "最近 7 行",
	"Last Order": "最近订单",
	"Limit": "数量上限",
	"List": "标价",
	"List current-site products and catalog filters.": "查询当前站点商品与目录筛选项。",
	"List current-site shopper orders.": "查询当前站点买家的订单列表。",
	"List dynamic attributes for storefront filters and forms.": "查询前台筛选项和表单使用的动态属性。",
	"List scoped after-sales requests.": "查询授权范围内的售后申请。",
	"List scoped high-risk audit logs.": "查询授权范围内的高风险审计日志。",
	"List scoped inventory locks.": "查询授权范围内的库存锁。",
	"List scoped inventory movement ledger.": "查询授权范围内的库存流水账。",
	"List scoped orders.": "查询授权范围内的订单。",
	"List scoped payment orders.": "查询授权范围内的支付单。",
	"List scoped payment transactions.": "查询授权范围内的支付交易。",
	"List scoped products for Unified Admin.": "查询统一后台授权范围内的商品。",
	"List scoped site customers and lifetime order value.": "查询授权范围内的站点客户与生命周期订单价值。",
	"List scoped SKU balances.": "查询授权范围内的 SKU 库存余额。",
	"List scoped webhook events and duplicate counters.": "查询授权范围内的回调事件与重复计数。",
	"Locked": "已锁定",
	"Locked Units": "锁定件数",
	"Lock Status": "库存锁状态",
	"Logs": "日志",
	"Location": "地点",
	"Manual Projection": "手动投影",
	"Mark Succeeded": "标记成功",
	"Manage RBAC Scope": "管理权限范围",
	"Media": "媒体",
	"Method": "方法",
	"Movement": "变动",
	"Name": "名称",
	"Net Sales": "净销售额",
	"Next": "下一页",
	"Next.js route handlers are BFF/proxy adapters for same-origin UI mutations, not the source of commerce business truth.": "Next.js route handler 是用于同源 UI 写操作的 BFF/proxy 适配层，不是交易业务事实来源。",
	"No address": "无地址",
	"No after-sales logs are available.": "暂无售后日志。",
	"No after-sales or refund records are available.": "暂无售后或退款记录。",
	"No analytics data is available for this scope.": "当前范围暂无分析数据。",
	"No analytics operation has run in this session.": "本次会话尚未运行分析操作。",
	"No attributes are configured for this vertical.": "当前垂类暂无属性配置。",
	"No categories are available for this scope.": "当前范围暂无分类。",
	"No channel rows are available for this scope.": "当前范围暂无渠道数据。",
	"No customer LTV rows are available for this scope.": "当前范围暂无客户 LTV 数据。",
	"No dynamic values are set.": "暂无动态属性值。",
	"No email": "无邮箱",
	"No fulfillment records are available.": "暂无履约记录。",
	"No inventory records are available.": "暂无库存记录。",
	"No item snapshots are available.": "暂无商品快照。",
	"No media is attached.": "暂无媒体。",
	"No payment records are available.": "暂无支付记录。",
	"No payment refunds are linked yet.": "尚未关联支付退款。",
	"No pipeline items were claimed.": "未领取任何管道项目。",
	"No product projection rows are available for this scope.": "当前范围暂无商品投影数据。",
	"No projected daily sales are available for this scope.": "当前范围暂无每日销售投影。",
	"No risk rows are visible for this scope.": "当前范围暂无风险数据。",
	"No roles": "无角色",
	"No scoped after-sales requests are available.": "当前范围暂无售后申请。",
	"No scoped audit logs are available.": "当前范围暂无审计日志。",
	"No scoped inventory locks are available.": "当前范围暂无库存锁。",
	"No scoped inventory transactions are available.": "当前范围暂无库存流水。",
	"No scoped order operations are available.": "当前范围暂无订单运营数据。",
	"No scoped payment refunds are available.": "当前范围暂无支付退款。",
	"No scoped payment webhook events are available.": "当前范围暂无支付回调事件。",
	"No scopes": "无数据范围",
	"No status logs are available.": "暂无状态日志。",
	"Open": "打开",
	"Open Payment": "打开支付",
	"Open Webhooks": "待处理回调",
	"OpenAPI Docs": "OpenAPI 文档",
	"OpenAPI JSON": "OpenAPI JSON",
	"Operations": "运营风险",
	"Operator": "操作人",
	"Operate Orders": "处理订单",
	"Option": "选项",
	"Options:": "选项：",
	"Option Label": "选项标签",
	"Option Value": "选项值",
	"Options": "选项",
	"Order": "订单",
	"Order Context": "订单上下文",
	"Order Snapshot": "订单快照",
	"Order Status": "订单状态",
	"OrderPaid Event ID": "OrderPaid 事件 ID",
	"Order, Payment, Inventory Control": "订单、支付、库存控制",
	"Orders": "订单",
	"Ops Rows": "运营行",
	"Outbox Batch": "发件箱批处理",
	"Page": "页",
	"Paid": "已支付",
	"Paid Events": "支付成功事件",
	"Paid Orders": "已支付订单",
	"Paid Unfulfilled": "已支付待履约",
	"Paid orders waiting fulfillment": "已支付待履约订单",
	"Pending Payment": "待支付",
	"Payment": "支付",
	"Payment Processing": "支付处理中",
	"Payment Events": "支付事件",
	"Payment Refunds": "支付退款",
	"Payment refund marked succeeded.": "支付退款已标记成功。",
	"Payment Status": "支付状态",
	"Payment Webhooks": "支付回调",
	"Payment Orders": "支付单",
	"Payment Transactions": "支付交易",
	"Payment orders, transactions, webhook processing and commerce pipeline operations.": "支付单、支付交易、回调处理与交易管道运营。",
	"Payments": "支付记录",
	"Pending Outbox": "待处理发件箱",
	"Permissions": "权限",
	"Prev": "上一页",
	"Physical": "实物",
	"Presentation / Data Boundary": "表现层 / 数据层边界",
	"Path": "路径",
	"Price": "价格",
	"Price From": "起售价",
	"Price Snapshot": "价格快照",
	"Partially Refunded": "部分退款",
	"Partially Shipped": "部分发货",
	"Prices": "价格",
	"Process": "处理",
	"Process payment webhooks and downstream events": "处理支付回调和下游事件",
	"Process Pending": "处理待办",
	"Process Pipeline": "处理管道",
	"Process pending webhook and domain-event work.": "处理待办支付回调与领域事件任务。",
	"Processed": "已处理",
	"Processing analytics events...": "正在处理分析事件...",
	"Processing Orders": "处理中订单",
	"Product": "商品",
	"Product Catalog": "商品目录",
	"Product Context": "商品上下文",
	"Product Performance": "商品表现",
	"Product Sales Ranking": "商品销售排行",
	"Product Status": "商品状态",
	"Products": "商品",
	"Provider captures and failures": "渠道捕获与失败记录",
	"Project Event": "投影事件",
	"Project One": "投影单个",
	"Provider": "渠道方",
	"Provider Event": "渠道事件",
	"Provider event idempotency": "渠道事件幂等",
	"Product, SPU, slug, category": "商品、SPU、slug、分类",
	"Email, phone, name, guest token": "邮箱、手机号、姓名、游客令牌",
	"Request no, order no, reason, buyer": "售后单号、订单号、原因、买家",
	"order no, payment no, buyer": "订单号、支付单号、买家",
	"Payment no, order no, idempotency": "支付单号、订单号、幂等键",
	"SKU, product, warehouse, order": "SKU、商品、仓库、订单",
	"code, name, option": "编码、名称、选项",
	"Provider Refund": "渠道退款",
	"Qty": "数量",
	"Query": "查询",
	"RBAC Scope": "权限范围",
	"Reason": "原因",
	"Read Audit Logs": "读取审计日志",
	"Read admin RBAC and data-scope snapshot.": "读取后台 RBAC 与数据范围快照。",
	"Read current-site cart.": "读取当前站点购物车。",
	"Read current-site shopper order detail.": "读取当前站点买家的订单详情。",
	"Read scoped order operations detail.": "读取授权范围内的订单运营详情。",
	"Read scoped product detail.": "读取授权范围内的商品详情。",
	"Received": "接收时间",
	"Receive provider webhook, dedupe provider event id and store first.": "接收支付渠道回调，按渠道事件 ID 去重，并先落库。",
	"Records": "记录",
	"Refresh Status": "刷新状态",
	"Refresh analytics data": "刷新分析数据",
	"Refund": "退款",
	"Refund Only": "仅退款",
	"Refund Queue": "退款队列",
	"Refund Succeeded": "退款成功",
	"Refund + chargeback amount": "退款和拒付金额",
	"Refunds": "退款",
	"Reject": "拒绝",
	"Reject Reason": "拒绝原因",
	"Reject Request": "拒绝申请",
	"Remove a cart line.": "移除购物车行。",
	"Resolve current site from request domain.": "通过请求域名解析当前站点。",
	"Request": "申请",
	"Request failed.": "请求失败。",
	"Request Reason": "申请原因",
	"Requested": "申请金额",
	"Requested Items": "申请商品",
	"Requests": "申请",
	"Required": "必填",
	"Resource": "资源",
	"REST API contract map for separating Storefront, Unified Admin and Commerce Core API data boundaries.": "用于分离前台、统一后台与 Commerce Core API 数据边界的 REST API 契约目录。",
	"Reviewable": "待审核",
	"Return Refund": "退货退款",
	"Return Restock": "退货入库",
	"Risk Amount": "风险金额",
	"Risk Alerts": "风险提醒",
	"Risk Ops": "风险运营",
	"Roles": "角色",
	"Rows": "每页行数",
	"Sale": "促销价",
	"Safety": "安全库存",
	"Save": "保存",
	"Save Attribute": "保存属性",
	"Save Product": "保存商品",
	"Save SKU": "保存 SKU",
	"Saving": "保存中",
	"Scope": "数据范围",
	"Scope Assignment": "数据范围分配",
	"Scope assigned. Refresh the page to view the updated snapshot.": "数据范围已分配。刷新页面查看最新快照。",
	"Scope assignment failed.": "数据范围分配失败。",
	"Scope target": "范围目标",
	"Scopes": "数据范围",
	"Scoped audit logs for high-risk admin and system actions.": "高风险后台和系统动作的范围化审计日志。",
	"Scoped customer profiles, default addresses and order value.": "授权范围内的客户档案、默认地址与订单价值。",
	"Scoped operational list for order, payment, fulfillment and aftersales state.": "按授权范围查看订单、支付、履约与售后状态。",
	"Scoped operational risk across orders, payments, inventory, after-sales and audit logs.": "按授权范围查看订单、支付、库存、售后和审计风险。",
	"Scoped product, SKU, price and category operations.": "按授权范围运营商品、SKU、价格与分类。",
	"Scoped queue": "授权范围队列",
	"Scoped refund and return requests with order context and refund money movement.": "带订单上下文和退款资金流的范围化退款/退货申请。",
	"Scoped Results": "范围化结果",
	"Scoped sales, channel, product and customer LTV projections.": "按范围投影销售、渠道、商品与客户生命周期价值。",
	"Search": "搜索",
	"Searchable": "可搜索",
	"Selectable for this admin": "该管理员可选择",
	"Selected Site": "当前站点",
	"Ship": "发货",
	"Shipment created.": "物流单已创建。",
	"Shipment delivered.": "物流单已签收。",
	"Shipping": "运费",
	"Shipping Snapshot": "配送快照",
	"SKU Balances": "SKU 库存余额",
	"Site": "站点",
	"Site Context": "站点上下文",
	"Site Customers": "站点客户",
	"Site Operator": "站点运营角色",
	"Snapshot": "快照",
	"SKU": "SKU",
	"SKU Prices": "SKU 价格",
	"SKUs": "SKU",
	"Skipped": "已跳过",
	"Sort": "排序",
	"Source": "来源",
	"Spend": "消费",
	"Status": "状态",
	"Status controls storefront visibility; SKU price controls display price.": "状态控制前台可见性；SKU 价格控制展示价格。",
	"Status Logs": "状态日志",
	"Storefront reads current-site data through domain-resolved API context. It must not trust client-supplied site_id.": "前台通过域名解析后的 API 上下文读取当前站点数据，不能信任客户端传入的 site_id。",
	"Storefront API": "前台 API",
	"Swagger UI": "Swagger UI",
	"System API": "系统 API",
	"Subtotal": "小计",
	"Title": "标题",
	"To": "到",
	"Total": "总计",
	"Tracking": "运单号",
	"Transactions": "交易流水",
	"Type": "类型",
	"Update cart line quantity.": "更新购物车行数量。",
	"Unit": "单价",
	"Units": "件数",
	"Unified Admin reads and writes through scoped Admin REST endpoints. Every list/detail query must remain constrained by Admin Scope.": "统一后台通过带数据范围的 Admin REST 接口读写；所有列表和详情查询都必须受 Admin Scope 约束。",
	"Updated": "更新时间",
	"Use this page to maintain product form fields, storefront filters, and search facets for the selected vertical.": "在这里维护当前垂类的商品表单字段、前台筛选项和搜索分面。",
	"User": "用户",
	"Vertical": "垂类",
	"Vertical Attribute Actions": "垂类属性操作",
	"Vertical Attributes": "垂类属性",
	"Verticals": "垂类管理",
	"Warehouse": "仓库",
	"Webhooks": "回调",
	"Webhook API": "回调 API",
	"Webhook Status": "回调状态",
	"Webhooks Failed": "失败回调",
	"With Address": "有地址",
	"Workspace Scope": "工作区范围",
	"Actor": "操作者",
	"AOV": "客单价",
	"Before and after stock movements": "库存变更前后记录",
	"Clear": "清空",
	"Currencies": "币种",
	"Dispatch Promise": "发货承诺",
	"Languages": "语言",
	"Logo": "标志",
	"Merchandising Badge": "营销徽标",
	"Origin": "产地",
	"Payment Channels": "支付渠道",
	"Payment webhook risk": "支付回调风险",
	"Recent Sales Trend": "近期销售趋势",
	"Requests waiting review": "等待审核的申请",
	"Shipping Countries": "配送国家",
	"Sites": "站点管理",
	"Succeeded": "成功",
	"Webhook Success": "回调成功率",
	"After-sales Pending": "售后待处理",
	"Average paid order value": "已支付订单平均客单价",
	"Tags:": "标签：",
	"Theme": "主题",
	"reviewable requests and": "待审核申请和",
	"refunding or return-related requests are visible in this scope.": "退款中或退货相关申请在当前范围可见。",
	"searchable, filterable": "可搜索、可筛选",
	rows: "行",
	categories: "分类",
	"configured fields": "已配置字段",
	fields: "字段",
	items: "商品项",
	orders: "订单",
	qty: "数量",
	units: "件",
	active: "启用",
	adjust: "调整",
	alias: "别名",
	approved: "已批准",
	archived: "已归档",
	authorize: "授权",
	boolean: "布尔",
	brand: "品牌",
	cancelled: "已取消",
	capture: "捕获",
	chargeback: "拒付",
	closed: "已关闭",
	completed: "已完成",
	created: "已创建",
	dead_letter: "死信",
	deduct: "扣减",
	deducted: "已扣减",
	delivered: "已签收",
	draft: "草稿",
	exchange: "换货",
	expired: "已过期",
	failed: "失败",
	filterable: "可筛选",
	fulfilled: "已履约",
	global: "全局",
	ignored: "已忽略",
	in_transit: "运输中",
	inactive: "停用",
	initial: "初始化",
	json: "JSON",
	lock: "锁定",
	locked: "已锁定",
	multiselect: "多选",
	number: "数字",
	opened: "已打开",
	optional: "可选",
	paid: "已支付",
	partially_fulfilled: "部分履约",
	partially_refunded: "部分退款",
	partially_shipped: "部分发货",
	packed: "已打包",
	payment_event: "支付事件",
	payment_processing: "支付处理中",
	pending: "待处理",
	pending_payment: "待支付",
	picking: "拣货中",
	primary: "主域名",
	processed: "已处理",
	processing: "处理中",
	received: "已收到",
	refund: "退款",
	refund_only: "仅退款",
	refunded: "已退款",
	refunding: "退款中",
	rejected: "已拒绝",
	release: "释放",
	released: "已释放",
	requested: "已申请",
	required: "必填",
	return_refund: "退货退款",
	return_restock: "退货入库",
	returned: "已退回",
	returning: "退货中",
	reviewing: "审核中",
	sale: "销售",
	searchable: "可搜索",
	select: "单选",
	shipped: "已发货",
	site: "站点",
	succeeded: "成功",
	text: "文本",
	unfulfilled: "未履约",
	unpaid: "未支付",
	vertical: "垂类",
	webhook: "回调",
	won: "胜诉",
	lost: "败诉",
	multi: "多项",
	"no data scope": "无数据范围",
	"no primary color": "无主色",
	"no channel": "无渠道",
} as const;

const enStaticText = Object.entries(zhStaticText).reduce<Record<string, string>>(
	(accumulator, [english, chinese]) => {
		accumulator[chinese] = english;
		return accumulator;
	},
	{},
);

function mapForLocale(locale: AdminLocale): Record<string, string> {
	return locale === "zh-CN" ? zhStaticText : enStaticText;
}

function translatePattern(text: string, locale: AdminLocale): string {
	if (locale === "zh-CN") {
		const rowsMatch = text.match(/^(\d+) rows$/);

		if (rowsMatch) {
			return `${rowsMatch[1]} 行`;
		}

		const endpointsMatch = text.match(/^(\d+) endpoints$/);

		if (endpointsMatch) {
			return `${endpointsMatch[1]} 个接口`;
		}

		const pageMatch = text.match(/^Page (\d+) \/ (\d+)$/);

		if (pageMatch) {
			return `第 ${pageMatch[1]} / ${pageMatch[2]} 页`;
		}

		const categoriesMatch = text.match(/^(\d+) categories$/);

		if (categoriesMatch) {
			return `${categoriesMatch[1]} 个分类`;
		}

		const fieldsMatch = text.match(/^(\d+) configured fields$/);

		if (fieldsMatch) {
			return `已配置 ${fieldsMatch[1]} 个字段`;
		}

		const scopedViewMatch = text.match(
			/^(Global|Vertical|Brand|Site|全局|垂类|品牌|站点) data view for (.+)$/,
		);

		if (scopedViewMatch) {
			const scope = translateText(scopedViewMatch[1] ?? "", locale);
			return `${scopedViewMatch[2]} 的${scope}数据视图`;
		}

		const keyMatch = text.match(/^Key: (.+)$/);

		if (keyMatch) {
			return `键：${keyMatch[1]}`;
		}

		const claimedMatch = text.match(
			/^(claimed|processed|skipped|already|ignored|failed) (.+)$/i,
		);

		if (claimedMatch) {
			return `${translateText(claimedMatch[1] ?? "", locale)} ${claimedMatch[2]}`;
		}

		const processedAtMatch = text.match(/^Processed at (.+)$/);

		if (processedAtMatch) {
			return `处理时间 ${processedAtMatch[1]}`;
		}

		const createdAtMatch = text.match(/^Created (.+)$/);

		if (createdAtMatch) {
			return `创建于 ${createdAtMatch[1]}`;
		}

		const warehouseMatch = text.match(/^Warehouse (.+)$/);

		if (warehouseMatch) {
			return `仓库 ${warehouseMatch[1]}`;
		}

		const orderCountMatch = text.match(/^(.+) orders$/);

		if (orderCountMatch) {
			return `${orderCountMatch[1]} 个订单`;
		}

		const moneyOrderCountMatch = text.match(/^(.+) \/ (\d+) orders$/);

		if (moneyOrderCountMatch) {
			return `${moneyOrderCountMatch[1]} / ${moneyOrderCountMatch[2]} 个订单`;
		}

		const unitsAmountMatch = text.match(/^(\d+) units \/ (.+)$/);

		if (unitsAmountMatch) {
			return `${unitsAmountMatch[1]} 件 / ${unitsAmountMatch[2]}`;
		}

		const ordersAmountMatch = text.match(/^(\d+) orders \/ (.+)$/);

		if (ordersAmountMatch) {
			return `${ordersAmountMatch[1]} 个订单 / ${ordersAmountMatch[2]}`;
		}

		const statusQuantityMatch = text.match(/^(.+) \/ qty (\d+)$/);

		if (statusQuantityMatch) {
			return `${translateText(statusQuantityMatch[1] ?? "", locale)} / 数量 ${
				statusQuantityMatch[2]
			}`;
		}

		const permissionsMatch = text.match(/^(.+) permissions$/);

		if (permissionsMatch) {
			return `${permissionsMatch[1]} 个权限`;
		}

		const failedWebhookMatch = text.match(
			/^(\d+) failed webhook events need review\.$/,
		);

		if (failedWebhookMatch) {
			return `${failedWebhookMatch[1]} 个失败支付回调需要检查。`;
		}

		const unfulfilledOrdersMatch = text.match(
			/^(\d+) paid orders are still waiting for fulfillment\.$/,
		);

		if (unfulfilledOrdersMatch) {
			return `${unfulfilledOrdersMatch[1]} 个已支付订单仍待履约。`;
		}

		const activeLocksMatch = text.match(
			/^(\d+) inventory locks are currently active\.$/,
		);

		if (activeLocksMatch) {
			return `${activeLocksMatch[1]} 个库存锁当前仍处于锁定状态。`;
		}

		const afterSalesMatch = text.match(
			/^(\d+) after-sales requests are pending\.$/,
		);

		if (afterSalesMatch) {
			return `${afterSalesMatch[1]} 个售后申请待处理。`;
		}

		return text;
	}

	const zhRowsMatch = text.match(/^(\d+) 行$/);

	if (zhRowsMatch) {
		return `${zhRowsMatch[1]} rows`;
	}

	const zhEndpointsMatch = text.match(/^(\d+) 个接口$/);

	if (zhEndpointsMatch) {
		return `${zhEndpointsMatch[1]} endpoints`;
	}

	const zhPageMatch = text.match(/^第 (\d+) \/ (\d+) 页$/);

	if (zhPageMatch) {
		return `Page ${zhPageMatch[1]} / ${zhPageMatch[2]}`;
	}

	const zhCategoriesMatch = text.match(/^(\d+) 个分类$/);

	if (zhCategoriesMatch) {
		return `${zhCategoriesMatch[1]} categories`;
	}

	const zhFieldsMatch = text.match(/^已配置 (\d+) 个字段$/);

	if (zhFieldsMatch) {
		return `${zhFieldsMatch[1]} configured fields`;
	}

	const zhKeyMatch = text.match(/^键：(.+)$/);

	if (zhKeyMatch) {
		return `Key: ${zhKeyMatch[1]}`;
	}

	const zhProcessedAtMatch = text.match(/^处理时间 (.+)$/);

	if (zhProcessedAtMatch) {
		return `Processed at ${zhProcessedAtMatch[1]}`;
	}

	const zhCreatedAtMatch = text.match(/^创建于 (.+)$/);

	if (zhCreatedAtMatch) {
		return `Created ${zhCreatedAtMatch[1]}`;
	}

	const zhWarehouseMatch = text.match(/^仓库 (.+)$/);

	if (zhWarehouseMatch) {
		return `Warehouse ${zhWarehouseMatch[1]}`;
	}

	const zhOrderCountMatch = text.match(/^(.+) 个订单$/);

	if (zhOrderCountMatch) {
		return `${zhOrderCountMatch[1]} orders`;
	}

	const zhMoneyOrderCountMatch = text.match(/^(.+) \/ (\d+) 个订单$/);

	if (zhMoneyOrderCountMatch) {
		return `${zhMoneyOrderCountMatch[1]} / ${zhMoneyOrderCountMatch[2]} orders`;
	}

	const zhUnitsAmountMatch = text.match(/^(\d+) 件 \/ (.+)$/);

	if (zhUnitsAmountMatch) {
		return `${zhUnitsAmountMatch[1]} units / ${zhUnitsAmountMatch[2]}`;
	}

	const zhOrdersAmountMatch = text.match(/^(\d+) 个订单 \/ (.+)$/);

	if (zhOrdersAmountMatch) {
		return `${zhOrdersAmountMatch[1]} orders / ${zhOrdersAmountMatch[2]}`;
	}

	const zhStatusQuantityMatch = text.match(/^(.+) \/ 数量 (\d+)$/);

	if (zhStatusQuantityMatch) {
		return `${translateText(zhStatusQuantityMatch[1] ?? "", locale)} / qty ${
			zhStatusQuantityMatch[2]
		}`;
	}

	return text;
}

export function translateText(text: string, locale: AdminLocale): string {
	const map = mapForLocale(locale);
	const direct = map[text];

	if (direct) {
		return direct;
	}

	return translatePattern(text, locale);
}

function translatePreservingWhitespace(value: string, locale: AdminLocale) {
	const match = value.match(/^(\s*)([\s\S]*?)(\s*)$/);

	if (!match) {
		return value;
	}

	const [, leading = "", body = "", trailing = ""] = match;
	const normalizedBody = body.replace(/\s+/g, " ").trim();

	if (!normalizedBody) {
		return value;
	}

	const translated = translateText(normalizedBody, locale);

	if (translated === normalizedBody) {
		return value;
	}

	return `${leading}${translated}${trailing}`;
}

function shouldSkipElement(element: Element) {
	return ["SCRIPT", "STYLE", "CODE", "PRE", "TEXTAREA"].includes(
		element.tagName,
	);
}

function localizeTextNode(node: Text, locale: AdminLocale) {
	const nextValue = translatePreservingWhitespace(node.nodeValue ?? "", locale);

	if (nextValue !== node.nodeValue) {
		node.nodeValue = nextValue;
	}
}

function localizeElementAttributes(element: Element, locale: AdminLocale) {
	for (const attribute of ["placeholder", "aria-label", "title"]) {
		const value = element.getAttribute(attribute);

		if (!value) {
			continue;
		}

		const translated = translateText(value, locale);

		if (translated !== value) {
			element.setAttribute(attribute, translated);
		}
	}

	if (element instanceof HTMLInputElement && element.readOnly) {
		const translatedValue = translateText(element.value, locale);

		if (translatedValue !== element.value) {
			element.value = translatedValue;
		}
	}
}

export function localizeStaticAdminText(root: ParentNode, locale: AdminLocale) {
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
		acceptNode(node) {
			const parent = node.parentElement;

			if (!parent || shouldSkipElement(parent)) {
				return NodeFilter.FILTER_REJECT;
			}

			return NodeFilter.FILTER_ACCEPT;
		},
	});
	const textNodes: Text[] = [];

	while (walker.nextNode()) {
		textNodes.push(walker.currentNode as Text);
	}

	for (const node of textNodes) {
		localizeTextNode(node, locale);
	}

	if (root instanceof Element) {
		localizeElementAttributes(root, locale);
	}

	for (const element of Array.from(root.querySelectorAll("*"))) {
		if (!shouldSkipElement(element)) {
			localizeElementAttributes(element, locale);
		}
	}
}
