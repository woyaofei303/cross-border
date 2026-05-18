import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@cross-border/config": fileURLToPath(
				new URL("../../packages/config/src/index.ts", import.meta.url),
			),
			"@cross-border/database": fileURLToPath(
				new URL("../../packages/database/src/index.ts", import.meta.url),
			),
			"@cross-border/shared": fileURLToPath(
				new URL("../../packages/shared/src/index.ts", import.meta.url),
			),
		},
	},
});
