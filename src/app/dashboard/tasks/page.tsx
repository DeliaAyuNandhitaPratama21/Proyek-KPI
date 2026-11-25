import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import TasksClient from "./TasksClient";

export default async function TasksPage() {
  const supabase = await createClient();

  const {
    data: authData,
    error: authError,
  } = await supabase.auth.getClaims();

  if (authError || !authData?.claims?.sub) {
    redirect("/login");
  }

  const userId = authData.claims.sub;

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    redirect("/login");
  }

  if (!["Admin", "Project Manager", "Staff"].includes(profile.role)) {
    redirect("/login");
  }

  return (
    <TasksClient
      isStaff={profile.role === "Staff"}
      isAdmin={profile.role === "Admin"}
      isProjectManager={profile.role === "Project Manager"}
      currentUserId={userId}
    />
  );
}
