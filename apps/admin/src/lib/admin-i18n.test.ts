import { describe, expect, it } from "vitest";
import {
	adminLocaleCookieName,
	adminLocales,
	getAdminMessage,
	getAdminScopeMessageKey,
	normalizeAdminLocale,
} from "@/lib/admin-i18n";
import {
	adminMenuGroups,
	isActiveAdminPath,
} from "@/components/AdminAppFrame";
import { translateText } from "@/lib/admin-static-localization";
import {
	buildAdminWorkTabKey,
	closeAdminWorkTab,
	createAdminWorkTab,
	defaultAdminWorkTabs,
	getAdminWorkTabTitle,
	normalizeAdminWorkTabs,
	upsertAdminWorkTab,
} from "@/lib/admin-work-tabs";

describe("admin i18n and navigation", () => {
	it("normalizes supported locales and falls back predictably", () => {
		expect(adminLocaleCookieName).toBe("commerce_admin_locale");
		expect(adminLocales.map((locale) => locale.code)).toEqual([
			"en-US",
			"zh-CN",
		]);
		expect(normalizeAdminLocale("zh-CN")).toBe("zh-CN");
		expect(normalizeAdminLocale("zh")).toBe("zh-CN");
		expect(normalizeAdminLocale("en-US")).toBe("en-US");
		expect(normalizeAdminLocale("fr-FR")).toBe("en-US");
	});

	it("keeps common admin chrome copy translated", () => {
		expect(getAdminMessage("en-US", "nav.sites")).toBe("Sites");
		expect(getAdminMessage("zh-CN", "nav.sites")).toBe("站点管理");
		expect(getAdminMessage("zh-CN", getAdminScopeMessageKey("global"))).toBe(
			"全局",
		);
	});

	it("uses concrete admin page routes instead of hash anchors", () => {
		const hrefs = adminMenuGroups.flatMap((group) =>
			group.items.map((item) => item.href),
		);

		expect(hrefs.every((href) => href.startsWith("/"))).toBe(true);
		expect(hrefs.some((href) => href.startsWith("#"))).toBe(false);
		expect(hrefs).toContain("/verticals");
		expect(hrefs).toContain("/brands");
		expect(hrefs).toContain("/sites");
		expect(hrefs).toContain("/domains");
		expect(hrefs).toContain("/site-config");
		expect(hrefs).toContain("/fulfillment");
	});

	it("marks nested admin routes active without making the dashboard over-match", () => {
		expect(isActiveAdminPath("/", "/")).toBe(true);
		expect(isActiveAdminPath("/orders/123", "/orders")).toBe(true);
		expect(isActiveAdminPath("/orders", "/")).toBe(false);
	});

	it("translates shared admin page text and common dynamic fragments", () => {
		expect(translateText("Workspace Scope", "zh-CN")).toBe("工作区范围");
		expect(translateText("Outbox Batch", "zh-CN")).toBe("发件箱批处理");
		expect(translateText("RBAC Scope", "zh-CN")).toBe("权限范围");
		expect(translateText("Commerce OS Dashboard", "zh-CN")).toBe(
			"Commerce OS 数据大屏",
		);
		expect(translateText("Daily Sales", "zh-CN")).toBe("每日销售");
		expect(translateText("Recent Sales Trend", "zh-CN")).toBe("近期销售趋势");
		expect(translateText("Payment Webhooks", "zh-CN")).toBe("支付回调");
		expect(translateText("No scoped audit logs are available.", "zh-CN")).toBe(
			"当前范围暂无审计日志。",
		);
		expect(
			translateText("3 paid orders are still waiting for fulfillment.", "zh-CN"),
		).toBe("3 个已支付订单仍待履约。");
		expect(translateText("14 rows", "zh-CN")).toBe("14 行");
		expect(translateText("rows", "zh-CN")).toBe("行");
		expect(translateText("$200.00 / 2 orders", "zh-CN")).toBe(
			"$200.00 / 2 个订单",
		);
		expect(translateText("21 units / $1,109.00", "zh-CN")).toBe(
			"21 件 / $1,109.00",
		);
		expect(translateText("7 orders / $392.00", "zh-CN")).toBe(
			"7 个订单 / $392.00",
		);
		expect(translateText("locked / qty 1", "zh-CN")).toBe(
			"已锁定 / 数量 1",
		);
		expect(translateText("Global data view for Default Site", "zh-CN")).toBe(
			"Default Site 的全局数据视图",
		);
		expect(translateText("工作区范围", "en-US")).toBe("Workspace Scope");
	});

	it("persists dashboard-first admin work tabs and closes active tabs predictably", () => {
		const dashboard = createAdminWorkTab({
			pathname: "/",
			title: "Dashboard",
			now: 1,
		});
		const orderDetail = createAdminWorkTab({
			pathname: "/orders/CB2026051604732DC919",
			title: "Order Detail",
			now: 2,
		});
		const tabs = upsertAdminWorkTab([dashboard], orderDetail);

		expect(buildAdminWorkTabKey("/orders", "scopeType=site")).toBe(
			"/orders",
		);
		expect(tabs.map((tab) => tab.key)).toEqual([
			"/",
			"/orders/CB2026051604732DC919",
		]);
		expect(tabs[0]?.closable).toBe(false);
		expect(
			getAdminWorkTabTitle({
				pathname: "/orders/CB2026051604732DC919",
				locale: "zh-CN",
			}),
		).toBe("订单详情 / CB2026051604");

		const result = closeAdminWorkTab(
			tabs,
			"/orders/CB2026051604732DC919",
			"/orders/CB2026051604732DC919",
		);

		expect(result.tabs).toHaveLength(1);
		expect(result.nextActiveKey).toBe("/");
		expect(normalizeAdminWorkTabs([{ pathname: "/products" }])).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ pathname: "/", closable: false }),
				expect.objectContaining({ pathname: "/products" }),
			]),
		);
	});

	it("uses the route pathname as work-tab identity and updates query state", () => {
		const scopedOrders = createAdminWorkTab({
			pathname: "/orders",
			query: "scopeType=site",
			title: "Orders",
			now: 2,
		});
		const filteredOrders = createAdminWorkTab({
			pathname: "/orders",
			query: "scopeType=global",
			title: "Orders",
			now: 3,
		});
		const tabs = upsertAdminWorkTab(
			upsertAdminWorkTab(defaultAdminWorkTabs(1), scopedOrders),
			filteredOrders,
		);

		expect(tabs.filter((tab) => tab.pathname === "/orders")).toHaveLength(1);
		expect(tabs.find((tab) => tab.pathname === "/orders")?.query).toBe(
			"scopeType=global",
		);
		expect(normalizeAdminWorkTabs([scopedOrders, filteredOrders])).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					key: "/orders",
					query: "scopeType=global",
				}),
			]),
		);
	});

	it("keeps existing work-tab order when a tab is activated again", () => {
		const dashboard = createAdminWorkTab({
			pathname: "/",
			title: "Dashboard",
			now: 1,
		});
		const inventory = createAdminWorkTab({
			pathname: "/inventory",
			title: "Inventory",
			now: 2,
		});
		const payments = createAdminWorkTab({
			pathname: "/payments",
			title: "Payments",
			now: 3,
		});
		const refreshedInventory = createAdminWorkTab({
			pathname: "/inventory",
			query: "scopeType=site",
			title: "Inventory",
			now: 4,
		});
		const tabs = upsertAdminWorkTab(
			[dashboard, inventory, payments],
			refreshedInventory,
		);

		expect(tabs.map((tab) => tab.pathname)).toEqual([
			"/",
			"/inventory",
			"/payments",
		]);
		expect(tabs.find((tab) => tab.pathname === "/inventory")?.query).toBe(
			"scopeType=site",
		);
		expect(
			normalizeAdminWorkTabs([dashboard, payments, refreshedInventory]).map(
				(tab) => tab.pathname,
			),
		).toEqual(["/", "/payments", "/inventory"]);
	});
});
