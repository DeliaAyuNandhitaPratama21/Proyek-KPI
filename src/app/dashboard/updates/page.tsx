import { createClient } from "../../../lib/supabase/server";
import { requireRole } from "../../auth/role-guard";
import UpdatesClient from "./UpdatesClient";

type Update = {
  id: string;
  project_id: string;
  title: string;
  content: string;
  client_visible: boolean | null;
  created_at: string;
  created_by: string | null;
  projects: {
    project_name: string;
    is_archived: boolean;
    pic_id: string | null;
    pic: string | null;
  } | null;
};

type User = {
  id: string;
  name: string;
  email: string;
};

type UpdatesPageProps = {
  searchParams: Promise<{
    search?: string;
  }>;
};

export default async function UpdatesPage({ searchParams }: UpdatesPageProps) {
  const profile = await requireRole(["Admin", "Project Manager"]);
  const supabase = await createClient();

  const params = await searchParams;
  const search = params.search?.trim() || "";

  // QUERY PEMBARUAN PROYEK: ADMIN SEMUA PROYEK AKTIF, PM PROYEK PIC-NYA.
  let updateQuery = supabase
    .from("project_updates")
    .select(
      `
      id,
      project_id,
      title,
      content,
      client_visible,
      created_at,
      created_by,
      projects!inner (
        project_name,
        is_archived,
        pic_id,
        pic
      )
    `,
    )
    .eq("projects.is_archived", false);

  if (profile.role === "Project Manager") {
    updateQuery = updateQuery.eq("projects.pic_id", profile.id);
  }

  const { data: updates, error } = await updateQuery.order("created_at", {
    ascending: false,
  });

  if (error) {
    console.error("Gagal memuat pembaruan proyek:", error);

    return (
      <main className="min-h-screen bg-[#f7f7f5] px-5 py-6 text-[#1f1e30] sm:px-7 lg:px-8">
        <div className="max-w-4xl rounded-2xl border border-red-200 bg-[#fce2d3] p-5 text-sm text-red-700">
          Data pembaruan proyek gagal dimuat. Silakan muat ulang halaman.
        </div>
      </main>
    );
  }

  const semuaPembaruan: Update[] = (updates ?? []) as unknown as Update[];

  // PENCARIAN BERDASARKAN JUDUL UPDATE DAN NAMA PROYEK.
  const keyword = search.toLowerCase();
  const daftarPembaruan = semuaPembaruan.filter(
    (item) =>
      item.title.toLowerCase().includes(keyword) ||
      (item.projects?.project_name ?? "").toLowerCase().includes(keyword),
  );

  // AMBIL DATA PENGGUNA YANG MEMBUAT PEMBARUAN.
  const idPengguna = Array.from(
    new Set(
      daftarPembaruan
        .map((item) => item.created_by)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  let daftarPengguna: User[] = [];

  if (idPengguna.length > 0) {
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, name, email")
      .in("id", idPengguna);

    if (usersError) {
      console.error("Gagal memuat data pengguna:", usersError);
    } else {
      daftarPengguna = (users ?? []) as User[];
    }
  }

  return (
    <UpdatesClient
      updates={daftarPembaruan}
      users={daftarPengguna}
      search={search}
      role={profile.role}
    />
  );
}
