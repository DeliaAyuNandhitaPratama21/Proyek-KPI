import { createClient } from "../../../lib/supabase/server";
import { requireRole } from "../../auth/role-guard";
import ClientsClient from "./ClientsClient";

type ClientsPageProps = {
  searchParams: Promise<{
    search?: string;
  }>;
};

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const profile = await requireRole(["Admin"]);
  const supabase = await createClient();

  const params = await searchParams;
  const search = params.search?.trim() || "";

  let query = supabase.from("clients").select("*").eq("status", "Active");

  if (search) {
    // Escape karakter khusus untuk filter Supabase.
    const keyword = search.replace(/[,%()]/g, "").trim();

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
  }

  const { data: clients, error } = await query.order("created_at", {
    ascending: false,
  });

  if (error) {
    console.error("Gagal mengambil data klien:", error);

    return (
      <main className="min-h-screen bg-[#f7f7f5] px-5 py-6 text-[#1f1e30] sm:px-7 lg:px-8">
        <div className="max-w-4xl rounded-2xl border border-red-200 bg-white p-5 text-sm text-red-600">
          Data klien gagal dimuat. Silakan muat ulang halaman.
        </div>
      </main>
    );
  }

  return (
    <ClientsClient
      clients={clients ?? []}
      canDelete={profile.role === "Admin"}
      search={search}
    />
  );
}
