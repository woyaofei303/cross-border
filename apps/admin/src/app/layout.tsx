import type { Metadata } from "next";
import { AdminAppFrame } from "@/components/AdminAppFrame";
import { getRequestAdminLocale } from "@/lib/admin-i18n-server";
import "antd/dist/reset.css";
import "./globals.css";

export const metadata: Metadata = {
	title: "Commerce OS Admin",
	description: "Unified admin for multi-site vertical commerce operations.",
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const locale = await getRequestAdminLocale();

	return (
		<html lang={locale} className="h-full antialiased" suppressHydrationWarning>
			<body className="min-h-full">
				<AdminAppFrame initialLocale={locale}>{children}</AdminAppFrame>
			</body>
		</html>
	);
}
