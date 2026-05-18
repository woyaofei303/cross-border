"use client";

import {
	AlertTriangle,
	BarChart3,
	BookOpen,
	Boxes,
	Building2,
	ClipboardList,
	CreditCard,
	Globe2,
	Home,
	Layers3,
	LockKeyhole,
	RotateCcw,
	Settings,
	Tags,
	Truck,
	Users,
	Warehouse,
	type LucideIcon,
} from "lucide-react";
import { App as AntApp, ConfigProvider, Layout, Menu, Select, Tabs, theme } from "antd";
import type { MenuProps, TabsProps } from "antd";
import enUS from "antd/locale/en_US";
import zhCN from "antd/locale/zh_CN";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import {
	adminLocaleCookieName,
	adminLocales,
	adminLocaleStorageKey,
	getAdminMessage,
	normalizeAdminLocale,
	type AdminLocale,
	type AdminMessageKey,
} from "@/lib/admin-i18n";
import { localizeStaticAdminText } from "@/lib/admin-static-localization";
import {
	adminWorkTabsStorageKey,
	buildAdminWorkTabKey,
	closeAdminWorkTab,
	createAdminWorkTab,
	defaultAdminWorkTabs,
	getAdminWorkTabTitle,
	normalizeAdminWorkTabs,
	tabPath,
	upsertAdminWorkTab,
	type AdminWorkTab,
} from "@/lib/admin-work-tabs";

type AdminI18nContextValue = {
	locale: AdminLocale;
	setLocale: (locale: AdminLocale) => void;
	t: (key: AdminMessageKey) => string;
};

const AdminI18nContext = createContext<AdminI18nContextValue | null>(null);

export type AdminMenuItem = {
	labelKey: AdminMessageKey;
	icon: LucideIcon;
	href: string;
};

export type AdminMenuGroup = {
	titleKey: AdminMessageKey;
	items: AdminMenuItem[];
};

export const adminMenuGroups: AdminMenuGroup[] = [
	{
		titleKey: "group.siteManagement",
		items: [
			{ labelKey: "nav.dashboard", icon: Home, href: "/" },
			{ labelKey: "nav.verticals", icon: Layers3, href: "/verticals" },
			{ labelKey: "nav.brands", icon: Tags, href: "/brands" },
			{ labelKey: "nav.sites", icon: Globe2, href: "/sites" },
			{ labelKey: "nav.domains", icon: Building2, href: "/domains" },
			{ labelKey: "nav.siteConfig", icon: Settings, href: "/site-config" },
		],
	},
	{
		titleKey: "group.commerce",
		items: [
			{ labelKey: "nav.products", icon: Boxes, href: "/products" },
			{
				labelKey: "nav.verticalAttributes",
				icon: Layers3,
				href: "/product-attributes",
			},
			{ labelKey: "nav.orders", icon: ClipboardList, href: "/orders" },
			{ labelKey: "nav.payments", icon: CreditCard, href: "/payments" },
			{ labelKey: "nav.inventory", icon: Warehouse, href: "/inventory" },
			{ labelKey: "nav.fulfillment", icon: Truck, href: "/fulfillment" },
			{ labelKey: "nav.afterSales", icon: RotateCcw, href: "/after-sales" },
			{ labelKey: "nav.riskOps", icon: AlertTriangle, href: "/operations" },
			{ labelKey: "nav.customers", icon: Users, href: "/customers" },
			{ labelKey: "nav.analytics", icon: BarChart3, href: "/analytics" },
		],
	},
	{
		titleKey: "group.system",
		items: [
			{ labelKey: "nav.apiCatalog", icon: BookOpen, href: "/api-catalog" },
			{ labelKey: "nav.rbacScope", icon: LockKeyhole, href: "/rbac" },
			{ labelKey: "nav.auditTrail", icon: ClipboardList, href: "/audit" },
		],
	},
];

const { Header, Sider, Content } = Layout;

function getActiveAdminMenuKey(pathname: string) {
	const hrefs = adminMenuGroups.flatMap((group) =>
		group.items.map((item) => item.href),
	);

	return (
		hrefs
			.filter((href) => isActiveAdminPath(pathname, href))
			.sort((first, second) => second.length - first.length)[0] ?? "/"
	);
}

function getAdminWorkTabIcon(pathname: string) {
	const activeMenuKey = getActiveAdminMenuKey(pathname);

	return adminMenuGroups
		.flatMap((group) => group.items)
		.find((item) => item.href === activeMenuKey)?.icon;
}

export function isActiveAdminPath(pathname: string, href: string) {
	if (href === "/") {
		return pathname === "/";
	}

	return pathname === href || pathname.startsWith(`${href}/`);
}

export function useAdminI18n() {
	const context = useContext(AdminI18nContext);

	if (!context) {
		throw new Error("useAdminI18n must be used inside AdminAppFrame.");
	}

	return context;
}

export function AdminAppFrame({
	children,
	initialLocale,
}: {
	children: React.ReactNode;
	initialLocale: AdminLocale;
}) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const query = searchParams.toString();
	const activeTabKey = buildAdminWorkTabKey(pathname, query);
	const [locale, setLocaleState] = useState<AdminLocale>(initialLocale);
	const [workTabs, setWorkTabs] = useState<AdminWorkTab[]>(() =>
		defaultAdminWorkTabs(),
	);
	const [hasLoadedStoredWorkTabs, setHasLoadedStoredWorkTabs] = useState(false);

	useEffect(() => {
		document.documentElement.lang = locale;
		window.localStorage.setItem(adminLocaleStorageKey, locale);
		document.cookie = `${adminLocaleCookieName}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
	}, [locale]);

	useEffect(() => {
		const frame = window.requestAnimationFrame(() => {
			setWorkTabs(loadStoredWorkTabs());
			setHasLoadedStoredWorkTabs(true);
		});

		return () => window.cancelAnimationFrame(frame);
	}, []);

	useEffect(() => {
		if (!hasLoadedStoredWorkTabs) {
			return;
		}

		const frame = window.requestAnimationFrame(() => {
			setWorkTabs((currentTabs) =>
				upsertAdminWorkTab(
					currentTabs,
					createAdminWorkTab({
						pathname,
						query,
						title: getAdminWorkTabTitle({
							pathname,
							locale,
						}),
					}),
				),
			);
		});

		return () => window.cancelAnimationFrame(frame);
	}, [hasLoadedStoredWorkTabs, locale, pathname, query]);

	useEffect(() => {
		if (!hasLoadedStoredWorkTabs) {
			return;
		}

		window.localStorage.setItem(adminWorkTabsStorageKey, JSON.stringify(workTabs));
	}, [hasLoadedStoredWorkTabs, workTabs]);

	useEffect(() => {
		const root = document.querySelector("[data-admin-app-frame]");

		if (!root) {
			return;
		}

		let frame = 0;
		let delayedRun = 0;
		let isLocalizing = false;
		const localize = () => {
			if (isLocalizing) {
				return;
			}

			isLocalizing = true;
			localizeStaticAdminText(root, locale);
			isLocalizing = false;
		};
		const scheduleLocalize = () => {
			window.cancelAnimationFrame(frame);
			frame = window.requestAnimationFrame(localize);
		};
		const observer = new MutationObserver(scheduleLocalize);

		localize();
		frame = window.requestAnimationFrame(localize);
		delayedRun = window.setTimeout(localize, 80);
		observer.observe(root, {
			attributes: true,
			attributeFilter: ["aria-label", "placeholder", "title", "value"],
			characterData: true,
			childList: true,
			subtree: true,
		});

		return () => {
			window.cancelAnimationFrame(frame);
			window.clearTimeout(delayedRun);
			observer.disconnect();
		};
	}, [locale, pathname]);

	const t = useCallback(
		(key: AdminMessageKey) => getAdminMessage(locale, key),
		[locale],
	);
	const antdLocale = locale === "zh-CN" ? zhCN : enUS;
	const activeMenuKey = getActiveAdminMenuKey(pathname);
	const menuItems = useMemo<MenuProps["items"]>(
		() =>
			adminMenuGroups.map((group) => ({
				type: "group" as const,
				key: group.titleKey,
				label: t(group.titleKey),
				children: group.items.map((item) => ({
					key: item.href,
					icon: <item.icon size={16} />,
					label: t(item.labelKey),
					onClick: () => router.push(item.href),
				})),
			})),
		[router, t],
	);
	const tabItems = useMemo<TabsProps["items"]>(
		() =>
			workTabs.map((tab) => ({
				key: tab.key,
				label: (() => {
					const Icon = getAdminWorkTabIcon(tab.pathname);
					const title = getAdminWorkTabTitle({
						pathname: tab.pathname,
						locale,
						fallbackTitle: tab.title,
					});

					return (
						<span className="admin-work-tab-label">
							{Icon ? <Icon size={14} /> : null}
							<span>{title}</span>
						</span>
					);
				})(),
				closable: tab.closable,
			})),
		[locale, workTabs],
	);
	const handleTabChange = (key: string) => {
		const tab = workTabs.find((item) => item.key === key);

		if (tab) {
			router.push(tabPath(tab));
		}
	};
	const handleTabEdit: TabsProps["onEdit"] = (targetKey, action) => {
		if (action !== "remove" || typeof targetKey !== "string") {
			return;
		}

		const result = closeAdminWorkTab(workTabs, targetKey, activeTabKey);

		setWorkTabs(result.tabs);
		window.localStorage.setItem(
			adminWorkTabsStorageKey,
			JSON.stringify(result.tabs),
		);

		if (result.nextActiveKey !== activeTabKey) {
			const nextTab = result.tabs.find((tab) => tab.key === result.nextActiveKey);

			if (nextTab) {
				window.requestAnimationFrame(() => router.push(tabPath(nextTab)));
			}
		}
	};
	const contextValue = useMemo(
		() => ({
			locale,
			setLocale: setLocaleState,
			t,
		}),
		[locale, t],
	);

	return (
		<AdminI18nContext.Provider value={contextValue}>
			<ConfigProvider
				locale={antdLocale}
				theme={{
					algorithm: theme.defaultAlgorithm,
					token: {
						borderRadius: 6,
						colorBgContainer: "#ffffff",
						colorBgLayout: "#f5f7fb",
						colorBorder: "#d0d5dd",
						colorPrimary: "#1d7053",
						colorText: "#1f2329",
						colorTextSecondary: "#667085",
						controlHeight: 40,
						fontSize: 14,
						fontFamily:
							"Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
					},
					components: {
						Layout: {
							bodyBg: "#f5f7f8",
							headerBg: "#ffffff",
							siderBg: "#17221b",
						},
						Menu: {
							darkItemBg: "#17221b",
							darkItemSelectedBg: "rgba(255,255,255,0.14)",
							darkItemSelectedColor: "#ffffff",
						},
						Tabs: {
							cardBg: "#ffffff",
						},
					},
				}}
			>
				<AntApp>
					<Layout data-admin-app-frame className="min-h-screen">
						<Sider
							width={260}
							className="admin-sider"
							theme="dark"
							breakpoint="lg"
							collapsedWidth={76}
						>
							<div className="flex min-h-16 items-center gap-3 border-b border-white/10 px-4 py-3">
								<span className="grid size-9 shrink-0 place-items-center rounded-sm bg-[#f3c969] text-sm font-black text-[#17221b]">
									CO
								</span>
								<div className="min-w-0">
									<p className="truncate text-sm font-semibold text-white">
										{t("brand.title")}
									</p>
									<p className="truncate text-xs text-white/58">
										{t("brand.subtitle")}
									</p>
								</div>
							</div>
							<Menu
								mode="inline"
								theme="dark"
								items={menuItems}
								selectedKeys={[activeMenuKey]}
								className="admin-menu"
							/>
							<div className="border-t border-white/10 px-4 py-4">
								<p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-white/58">
									{t("actions.language")}
								</p>
								<Select
									value={locale}
									onChange={(value) =>
										setLocaleState(normalizeAdminLocale(value))
									}
									options={adminLocales.map((item) => ({
										label: item.label,
										value: item.code,
									}))}
									className="w-full"
									size="middle"
								/>
							</div>
						</Sider>

						<Layout className="min-w-0">
							<Header className="admin-tabs-header">
								<Tabs
									type="editable-card"
									hideAdd
									activeKey={activeTabKey}
									items={tabItems}
									onChange={handleTabChange}
									onEdit={handleTabEdit}
									className="admin-work-tabs"
								/>
							</Header>
							<Content className="admin-content min-w-0">{children}</Content>
						</Layout>
					</Layout>
				</AntApp>
			</ConfigProvider>
		</AdminI18nContext.Provider>
	);
}

function loadStoredWorkTabs() {
	const rawTabs = window.localStorage.getItem(adminWorkTabsStorageKey);

	if (!rawTabs) {
		return defaultAdminWorkTabs();
	}

	try {
		return normalizeAdminWorkTabs(JSON.parse(rawTabs));
	} catch {
		return defaultAdminWorkTabs();
	}
}
