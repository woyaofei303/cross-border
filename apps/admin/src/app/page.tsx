import { AdminDashboard } from "@/components/AdminDashboard";
import { loadSiteManagementData } from "@/lib/admin-sites";

export default async function AdminHome() {
	const data = await loadSiteManagementData();

	return <AdminDashboard data={data} />;
}
