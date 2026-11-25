import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import Sidebar from "../../components/sidebar";
import DashboardTopbar from "../../components/topbar";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login");
  }

  const userId = data.claims.sub;

  if (!userId) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("name, email, role")
    .eq("id", userId)
    .single();

  if (!profile) {
    redirect("/login");
  }

  if (!["Admin", "Project Manager", "Staff"].includes(profile.role)) {
    redirect("/login");
  }

  const canManageTasks =
    profile.role === "Admin" || profile.role === "Project Manager";

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-white">
      <Sidebar name={profile.name} role={profile.role} />

      <main
        className="min-h-screen min-w-0 lg:ml-64"
        style={
          {
            "--task-action-display": canManageTasks ? "inline-flex" : "none",
          } as React.CSSProperties
        }
      >
        <DashboardTopbar name={profile.name} role={profile.role} />

        {/* PAGE CONTENT */}
        {children}
      </main>
    </div>
  );
}
