import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "NOVA TRADE | Cross-border commerce storefront",
	description:
		"A modern cross-border ecommerce storefront for premium lifestyle products, global payments, and fast international fulfillment.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className="h-full antialiased">
			<body className="min-h-full">{children}</body>
		</html>
	);
}
