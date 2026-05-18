import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";
import { AppModule } from "./app.module.js";

describe("AppModule", () => {
	it("compiles the API module graph", async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		expect(moduleRef).toBeDefined();

		await moduleRef.close();
	});
});
