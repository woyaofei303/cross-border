import { Injectable } from "@nestjs/common";
import { tableNames } from "@cross-border/database";

@Injectable()
export class DatabaseContractService {
	getCoreTables(): string[] {
		return [
			tableNames.users,
			tableNames.orders,
			tableNames.skuInventory,
			tableNames.domainEvents,
		];
	}
}
