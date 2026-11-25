import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";
import { requireRole } from "../../../auth/role-guard";
import ArchivedClientsClient from "./ArchivedClientsClient";

type ArchivedClientsPageProps = {
  searchParams: Promise<{
    search?: string;
    success?: string;
  }>;
};

export default async function ArchivedClientsPage({
  searchParams,
}: ArchivedClientsPageProps) {
  const profile = await requireRole(["Admin"]);
  const supabase = await createClient();

  const params = await searchParams;
  const search = (params.search ?? "").trim();
  const restored = params.success === "restored";

  let query = supabase
    .from("clients")
    .select("id, company_name, contact_person, whatsapp, email")
    .eq("status", "Archived");

  // Pencarian server-side berdasarkan data klien.
  const keyword = search.replace(/[,%()]/g, "");

  if (keyword) {
    query = query.or(
      [
        `company_name.ilike.%${keyword}%`,
        `contact_person.ilike.%${keyword}%`,
        `whatsapp.ilike.%${keyword}%`,
        `email.ilike.%${keyword}%`,
      ].join(","),
    );
  }

  const { data: clients, error } = await query.order("created_at", {
    ascending: false,
  });

  if (error) {
    console.error("Gagal mengambil data klien arsip:", error);

    return (
      <main className="min-h-screen bg-[#f7f7f5] px-5 py-6 text-[#1f1e30] sm:px-7 lg:px-8">
        <div className="max-w-4xl rounded-2xl border border-red-200 bg-white p-5 text-sm text-red-600">
          Data arsip klien gagal dimuat. Silakan muat ulang halaman.
        </div>
      </main>
    );
  }

  async function restoreClient(formData: FormData) {
    "use server";

    const profile = await requireRole(["Admin"]);

    if (profile.role !== "Admin") {
      redirect("/dashboard/clients/archive");
    }

    const clientId = Number(formData.get("client_id"));

    if (!Number.isInteger(clientId) || clientId <= 0) {
      redirect("/dashboard/clients/archive");
    }

    const supabase = await createClient();

    const { error } = await supabase.rpc("restore_client_with_projects", {
      p_client_id: clientId,
    });

    if (error) {
      console.error("Gagal memulihkan klien:", error);
      redirect("/dashboard/clients/archive?error=restore");
    }

    redirect("/dashboard/clients/archive?success=restored");
  }

  return (
    <ArchivedClientsClient
      clients={clients ?? []}
      isAdmin={profile.role === "Admin"}
      search={search}
      restored={restored}
      restoreClient={restoreClient}
    />
  );
}
