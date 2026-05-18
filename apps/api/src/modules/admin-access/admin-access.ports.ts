import type { AdminScope } from "../../common/admin/admin-access.js";

export type AdminAccessRepository = {
	findScopesByAdminUserId(adminUserId: string): Promise<AdminScope[]>;
};
