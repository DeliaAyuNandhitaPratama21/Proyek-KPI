import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import FilesClient from "./FilesClient";

export default async function FilesPage() {
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
    redirect("/dashboard");
  }

  const allowedRoles = ["Admin", "Project Manager", "Staff"];

  if (!allowedRoles.includes(profile.role)) {
    redirect("/dashboard");
  }

  return <FilesClient initialRole={profile.role} />;
}
