import { redirect } from "next/navigation";
import { getCurrentUser, getUserProfile } from "@/lib/auth/rbac";
import DashboardLayout from "@/components/layout/DashboardLayout";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardRootLayout({ children }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const profile = await getUserProfile(user.id);
  if (!profile || !profile.is_active) {
    redirect("/login");
  }

  return (
    <DashboardLayout user={user} profile={profile}>
      {children}
    </DashboardLayout>
  );
}
