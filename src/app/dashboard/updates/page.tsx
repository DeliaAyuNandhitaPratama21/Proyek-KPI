import Link from "next/link";
import { createClient } from "../../../lib/supabase/server";
import { requireRole } from "../../auth/role-guard";

type Update = {
  id: string;
  project_id: string;
  title: string;
  content: string;
  client_visible: boolean | null;
  created_at: string;
  created_by: string | null;
};

type Project = {
  id: string;
  project_name: string;
};

type User = {
  id: string;
  name: string;
  email: string;
};

const TEXT = {
  pageTitle: "text-3xl font-semibold tracking-tight text-white",
  sectionTitle: "text-lg font-semibold text-white",
  subtitle: "mt-1 text-sm text-zinc-400",
  primary: "text-sm font-medium text-white",
  secondary: "text-sm text-[#A5BDCC]",
  action:
    "rounded-lg px-3 py-2 text-sm font-medium text-[#B7FE1A] transition-colors hover:bg-white/[0.05] hover:text-[#caff57]",
  primaryButton:
    "inline-flex w-fit items-center gap-2 rounded-xl bg-[#B7FE1A] px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#caff57]",
};

export default async function UpdatesPage() {
  await requireRole(["Admin", "Project Manager", "Staff"]);

  const supabase = await createClient();

  // Mengambil data pembaruan proyek
  const { data: updates, error } = await supabase
    .from("project_updates")
    .select(
      `
      id,
      project_id,
      title,
      content,
      client_visible,
      created_at,
      created_by
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-[#111111] px-5 py-6 text-white sm:px-7 lg:px-8">
        <div className="mb-8 mt-2">
          <h1 className={TEXT.pageTitle}>Pembaruan Proyek</h1>
          <p className={TEXT.subtitle}>
            Catat dan pantau perkembangan proyek untuk tim dan klien.
          </p>
        </div>

        <div className="max-w-4xl rounded-[22px] border border-red-500/20 bg-[#1c1c1c]/80 p-5 text-sm text-red-400">
          Data pembaruan proyek gagal dimuat. Silakan muat ulang halaman.
        </div>
      </main>
    );
  }

  const daftarPembaruan: Update[] = updates || [];

  // Mengambil data proyek yang berkaitan dengan pembaruan
  const idProyek = Array.from(
    new Set(
      daftarPembaruan
        .map((item) => item.project_id)
        .filter(Boolean),
    ),
  );

  let daftarProyek: Project[] = [];

  if (idProyek.length > 0) {
    const { data: projects } = await supabase
      .from("projects")
      .select("id, project_name")
      .in("id", idProyek);

    daftarProyek = (projects || []) as Project[];
  }

  // Mengambil data pengguna yang membuat pembaruan
  const idPengguna = Array.from(
    new Set(
      daftarPembaruan
        .map((item) => item.created_by)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  let daftarPengguna: User[] = [];

  if (idPengguna.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("id, name, email")
      .in("id", idPengguna);

    daftarPengguna = (users || []) as User[];
  }

  // Memetakan data agar mudah digunakan pada tabel
  const petaProyek = new Map(
    daftarProyek.map((proyek) => [proyek.id, proyek]),
  );

  const petaPengguna = new Map(
    daftarPengguna.map((pengguna) => [pengguna.id, pengguna]),
  );

  return (
    <main className="min-h-screen bg-[#111111] px-5 py-6 text-white sm:px-7 lg:px-8">
      {/* Header */}
      <div className="mb-8 mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className={TEXT.pageTitle}>Pembaruan Proyek</h1>
          <p className={TEXT.subtitle}>
            Catat dan pantau perkembangan proyek untuk tim dan klien.
          </p>
        </div>

        <Link
          href="/dashboard/updates/new"
          className={`${TEXT.primaryButton} w-full sm:w-auto`}
        >
          Tambah Pembaruan
        </Link>
      </div>

      {/* Daftar Pembaruan */}
      <section className="max-w-full overflow-hidden rounded-[22px] border border-[#2a2a2a] bg-[#1c1c1c]/80">
        {/* Card Header */}
        <div className="border-b border-[#262626] px-6 py-5 sm:px-8">
          <h2 className={TEXT.sectionTitle}>Daftar Pembaruan</h2>
          <p className={TEXT.subtitle}>
            {daftarPembaruan.length} pembaruan terdaftar
          </p>
        </div>

        {/* Tabel Pembaruan */}
        {daftarPembaruan.length > 0 ? (
          <div className="tasks-scrollbar overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-[#262626] text-left text-xs font-medium uppercase tracking-wide text-zinc-400">
                  <th className="px-6 py-4">Pembaruan</th>
                  <th className="px-6 py-4">Proyek</th>
                  <th className="px-6 py-4">Dibuat Oleh</th>
                  <th className="px-6 py-4">Visibilitas Klien</th>
                  <th className="px-6 py-4">Tanggal</th>
                  <th className="px-6 py-4">Tindakan</th>
                </tr>
              </thead>

              <tbody>
                {daftarPembaruan.map((item) => {
                  const proyek = petaProyek.get(item.project_id);

                  const pengguna = item.created_by
                    ? petaPengguna.get(item.created_by)
                    : null;

                  return (
                    <tr
                      key={item.id}
                      className="border-b border-[#262626] transition-colors last:border-b-0 hover:bg-white/[0.02]"
                    >
                      {/* Informasi Pembaruan */}
                      <td className="px-6 py-4">
                        <p className={TEXT.primary}>
                          <span className="block max-w-[260px] truncate">
                            {item.title}
                          </span>
                        </p>

                        {item.content && (
                          <p className="mt-1 line-clamp-2 max-w-[280px] text-xs leading-5 text-zinc-400">
                            {item.content}
                          </p>
                        )}
                      </td>

                      {/* Proyek */}
                      <td className={`px-6 py-4 ${TEXT.secondary}`}>
                        <span className="block max-w-[200px] truncate">
                          {proyek?.project_name || "-"}
                        </span>
                      </td>

                      {/* Pembuat Pembaruan */}
                      <td className="px-6 py-4">
                        {pengguna ? (
                          <div>
                            <p className={TEXT.primary}>{pengguna.name}</p>
                            <p className="mt-1 text-xs text-zinc-500">
                              {pengguna.email}
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-zinc-500">-</span>
                        )}
                      </td>

                      {/* Visibilitas Klien */}
                      <td className="px-6 py-4">
                        <VisibilityBadge visible={item.client_visible} />
                      </td>

                      {/* Tanggal */}
                      <td
                        className={`whitespace-nowrap px-6 py-4 ${TEXT.secondary}`}
                      >
                        {new Date(item.created_at).toLocaleDateString(
                          "id-ID",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          },
                        )}
                      </td>

                      {/* Tindakan */}
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/updates/${item.id}/edit`}
                          className={TEXT.action}
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Empty State */
          <div className="px-5 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#262626]">
              <UpdateIcon />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-white">
              Belum Ada Pembaruan
            </h3>

            <p className="mt-1 text-sm text-zinc-400">
              Tambahkan pembaruan untuk mencatat perkembangan proyek.
            </p>

            <Link
              href="/dashboard/updates/new"
              className={`${TEXT.primaryButton} mt-5`}
            >
              Tambah Pembaruan Pertama
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

function VisibilityBadge({ visible }: { visible: boolean | null }) {
  return (
    <span
      className={`inline-flex min-w-[100px] items-center justify-center rounded-full px-3 py-1 text-xs font-medium ${
        visible
          ? "bg-[#075C3C] text-[#6EE7B7]"
          : "bg-[#262626] text-zinc-400"
      }`}
    >
      {visible ? "Client" : "Internal"}
    </span>
  );
}

function UpdateIcon() {
  return (
    <span
      className="material-symbols-outlined inline-flex items-center justify-center"
      aria-hidden="true"
      style={{
        fontSize: "22px",
        fontWeight: 400,
        fontStyle: "normal",
        lineHeight: 1,
        letterSpacing: "normal",
        textTransform: "none",
        whiteSpace: "nowrap",
        wordWrap: "normal",
        direction: "ltr",
        fontFeatureSettings: '"liga"',
        WebkitFontSmoothing: "antialiased",
        color: "#B7FE1A",
      }}
    >
      update
    </span>
  );
}