import path from "node:path";
import type { NextConfig } from "next";

const workspaceRoot = path.resolve(process.cwd(), "../..");

const nextConfig: NextConfig = {
	turbopack: {
		root: workspaceRoot,
	},
	outputFileTracingRoot: workspaceRoot,
	allowedDevOrigins: ["127.0.0.1", "localhost"],
	images: {
		unoptimized: true,
		remotePatterns: [
			{
				protocol: "https",
				hostname: "images.unsplash.com",
				pathname: "/**",
			},
		],
	},
};

export default nextConfig;
