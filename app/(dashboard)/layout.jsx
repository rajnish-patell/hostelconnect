import { requireAuth } from "@/lib/auth/rbac";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default async function DashboardRootLayout({ children }) {
  const { user, profile } = await requireAuth();

  return (
    <DashboardLayout user={user} profile={profile}>
      {children}
    </DashboardLayout>
  );
}
