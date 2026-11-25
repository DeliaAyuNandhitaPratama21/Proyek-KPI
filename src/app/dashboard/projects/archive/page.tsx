import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";
import { requireRole } from "../../../auth/role-guard";
import ArchivedProjectsClient from "./ArchivedProjectsClient";

type ArchivedProjectsPageProps = {
  searchParams: Promise<{
    search?: string;
  }>;
};

export default async function ArchivedProjectsPage({
  searchParams,
}: ArchivedProjectsPageProps) {
  await requireRole(["Admin"]);

  const supabase = await createClient();

  const params = await searchParams;
  const search = (params.search ?? "").trim();

  const { data: projects, error } = await supabase
    .from("projects")
    .select(
      `
      id,
      project_name,
      project_type,
      deadline,
      archived_by_client,
      created_at,
      clients (
        company_name,
        status
      )
    `,
    )
    .eq("is_archived", true)
    .order("updated_at", {
      ascending: false,
    });

  if (error) {
    console.error("Gagal mengambil data arsip proyek:", error);

    return (
      <main className="min-h-screen bg-[#f7f7f5] px-5 py-6 text-[#1f1e30] sm:px-7 lg:px-8">
        <div className="max-w-4xl rounded-2xl border border-red-200 bg-white p-5 text-sm text-red-600 shadow-[0_2px_10px_rgba(31,30,48,0.04)]">
          Data arsip proyek gagal dimuat. Silakan muat ulang halaman.
        </div>
      </main>
    );
  }

  // FILTER PENCARIAN DI SERVER
  const keyword = search.toLowerCase();

  const filteredProjects = (projects ?? []).filter((project) => {
    const clientRelation = project.clients;

    const client = Array.isArray(clientRelation)
      ? clientRelation[0]
      : clientRelation;

    const projectName = project.project_name?.toLowerCase() ?? "";
    const projectType = project.project_type?.toLowerCase() ?? "";
    const clientName = client?.company_name?.toLowerCase() ?? "";

    return (
      !keyword ||
      projectName.includes(keyword) ||
      projectType.includes(keyword) ||
      clientName.includes(keyword)
    );
  });

  // FUNGSI RESTORE PROYEK
  async function restoreProject(formData: FormData) {
    "use server";

    // Halaman arsip hanya dapat diakses Admin, sehingga restore juga Admin-only.
    await requireRole(["Admin"]);

    const projectId = Number(formData.get("projectId"));

    if (!Number.isInteger(projectId) || projectId <= 0) {
      throw new Error("ID proyek tidak valid.");
    }

    const supabase = await createClient();

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select(
        `
        id,
        client_id,
        archived_by_client,
        clients (
          status
        )
      `,
      )
      .eq("id", projectId)
      .eq("is_archived", true)
      .single();

    if (projectError || !project) {
      throw new Error("Proyek tidak ditemukan atau sudah tidak diarsipkan.");
    }

    const clientRelation = project.clients;

    const client = Array.isArray(clientRelation)
      ? clientRelation[0]
      : clientRelation;

    if (client?.status === "Archived") {
      throw new Error(
        "Klien masih diarsipkan. Aktifkan kembali klien terlebih dahulu.",
      );
    }

    if (project.archived_by_client) {
      throw new Error(
        "Proyek ini diarsipkan bersama klien. Aktifkan kembali klien melalui halaman Arsip Klien untuk mengaktifkan proyek ini.",
      );
    }

    const { data: restoredProject, error: updateError } = await supabase
      .from("projects")
      .update({
        is_archived: false,
        archived_by_client: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId)
      .eq("is_archived", true)
      .eq("archived_by_client", false)
      .select("id")
      .maybeSingle();

    if (updateError || !restoredProject) {
      console.error("Gagal memulihkan proyek:", updateError);

      throw new Error(
        "Gagal memulihkan proyek. Data tidak ditemukan atau Anda tidak memiliki izin untuk melakukan tindakan ini.",
      );
    }

    // Tetap di halaman arsip agar notifikasi berhasil diaktifkan muncul.
    redirect("/dashboard/projects/archive?restored=1");
  }

  return (
    <ArchivedProjectsClient
      projects={filteredProjects}
      search={search}
      restoreProject={restoreProject}
    />
  );
}
