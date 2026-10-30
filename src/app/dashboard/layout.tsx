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

  return (
    <div className="min-h-screen bg-[#02090d] text-white">
      <Sidebar name={profile.name} role={profile.role} />

      <main className="min-h-screen min-w-0 lg:ml-64">
        <DashboardTopbar name={profile.name} role={profile.role} />

        {/* PAGE CONTENT */}
        {children}
      </main>
    </div>
  );
}
