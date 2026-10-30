import { createClient } from "../../../lib/supabase/server";
import { requireRole } from "../../auth/role-guard";

const TEXT = {
  pageTitle: "text-3xl font-semibold tracking-tight text-white",
  sectionTitle: "text-lg font-semibold text-white",
  subtitle: "mt-1 text-sm text-zinc-400",
};

type ActivityLog = {
  id: number;
  action: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  users:
    | { name: string; email: string }
    | { name: string; email: string }[]
    | null;
  projects:
    | { project_name: string }
    | { project_name: string }[]
    | null;
};

/**
 * Mengubah kode action menjadi label aktivitas berbahasa Indonesia.
 */
function translateAction(action: string | null): string {
  if (!action) return "Aktivitas lainnya";

  const translations: Record<string, string> = {
    CREATE_PROJECT: "Tambah proyek",
    UPDATE_PROJECT: "Edit proyek",
    DELETE_PROJECT: "Hapus proyek",

    CREATE_TASK: "Tambah tugas",
    UPDATE_TASK: "Edit tugas",
    DELETE_TASK: "Hapus tugas",

    CREATE_CLIENT: "Tambah klien",
    UPDATE_CLIENT: "Edit klien",
    DELETE_CLIENT: "Hapus klien",

    CREATE_USER: "Tambah pengguna",
    UPDATE_USER: "Edit pengguna",
    DELETE_USER: "Hapus pengguna",
    UPDATE_USER_ROLE: "Edit peran pengguna",

    CREATE_MILESTONE: "Tambah tahapan proyek",
    UPDATE_MILESTONE: "Edit tahapan proyek",
    DELETE_MILESTONE: "Hapus tahapan proyek",

    CREATE_PROJECT_UPDATE: "Tambah pembaruan proyek",
    UPDATE_PROJECT_UPDATE: "Edit pembaruan proyek",
    DELETE_PROJECT_UPDATE: "Hapus pembaruan proyek",

    CREATE_FILE: "Unggah berkas",
    UPDATE_FILE: "Edit berkas",
    DELETE_FILE: "Hapus berkas",

    LOGIN: "Masuk ke sistem",
    LOGOUT: "Keluar dari sistem",

    GENERATE_PROJECT_TOKEN: "Buat tautan proyek",
    UPDATE_PROJECT_TOKEN: "Edit tautan proyek",
  };

  const normalized = action.trim().toUpperCase().replace(/\s+/g, "_");

  if (translations[normalized]) {
    return translations[normalized];
  }

  // Menangani action yang tidak tercantum secara spesifik.
  const parts: Record<string, string> = {
    CREATE: "Tambah",
    ADD: "Tambah",
    UPDATE: "Edit",
    EDIT: "Edit",
    DELETE: "Hapus",
    REMOVE: "Hapus",
    VIEW: "Lihat",
    UPLOAD: "Unggah",
    DOWNLOAD: "Unduh",
    GENERATE: "Buat",
    PROJECT: "proyek",
    TASK: "tugas",
    CLIENT: "klien",
    USER: "pengguna",
    ROLE: "peran",
    MILESTONE: "tahapan proyek",
    FILE: "berkas",
    SETTINGS: "pengaturan",
    ACTIVITY: "aktivitas",
    TOKEN: "tautan",
  };

  return normalized
    .split("_")
    .map((word) => parts[word] || word.toLowerCase())
    .join(" ");
}

/**
 * Menerjemahkan istilah pada deskripsi tanpa mengubah nama proyek,
 * nama klien, atau nama berkas.
 */
function translateDescription(description: string | null): string {
  if (!description) return "";

  const replacements: [RegExp, string][] = [
    [/\bproject\s+updates?\b/gi, "pembaruan proyek"],
    [/\bprojects?\b/gi, "proyek"],
    [/\btasks?\b/gi, "tugas"],
    [/\bclients?\b/gi, "klien"],
    [/\busers?\b/gi, "pengguna"],
    [/\bmilestones?\b/gi, "tahapan proyek"],
    [/\bfiles?\b/gi, "berkas"],
    [/\battachments?\b/gi, "lampiran"],
    [/\bdeadlines?\b/gi, "batas waktu"],
    [/\bprogress\b/gi, "progres"],
    [/\bdescription\b/gi, "deskripsi"],
    [/\btitle\b/gi, "judul"],
    [/\bpriority\b/gi, "prioritas"],
    [/\bpublic\s+link\b/gi, "tautan publik"],
    [/\bproject\s+token\b/gi, "tautan proyek"],

    [/\bhas\s+been\s+updated\b/gi, "telah diedit"],
    [/\bwas\s+updated\b/gi, "telah diedit"],
    [/\bupdated\b/gi, "diedit"],
    [/\bupdating\b/gi, "mengedit"],
    [/\bcreated\b/gi, "ditambahkan"],
    [/\bcreating\b/gi, "menambahkan"],
    [/\bdeleted\b/gi, "dihapus"],
    [/\bdeleting\b/gi, "menghapus"],
    [/\buploaded\b/gi, "diunggah"],
    [/\bdownloaded\b/gi, "diunduh"],
    [/\bchanged\b/gi, "diubah"],
    [/\bcompleted\b/gi, "diselesaikan"],
  ];

  let result = description.trim();

  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }

  result = result.replace(/\s+/g, " ").trim();

  if (result.length > 0) {
    result = result.charAt(0).toUpperCase() + result.slice(1);
  }

  return result;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getUser(users: ActivityLog["users"]) {
  return Array.isArray(users) ? users[0] || null : users;
}

function getProject(projects: ActivityLog["projects"]) {
  return Array.isArray(projects) ? projects[0] || null : projects;
}

export default async function ActivityLogsPage() {
  await requireRole(["Admin"]);

  const supabase = await createClient();

  const { data: logs, error } = await supabase
    .from("activity_logs")
    .select(`
      id,
      action,
      description,
      metadata,
      created_at,
      users (
        name,
        email
      ),
      projects (
        project_name
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-[#111111] px-5 py-6 text-white sm:px-7 lg:px-8">
        <div className="mb-8 mt-2">
          <h1 className={TEXT.pageTitle}>Riwayat Aktivitas</h1>
          <p className={TEXT.subtitle}>
            Pantau seluruh aktivitas pengguna dalam sistem.
          </p>
        </div>

        <div
          role="alert"
          className="max-w-4xl rounded-[22px] border border-red-500/20 bg-[#1c1c1c]/80 p-5"
        >
          <h2 className="text-sm font-medium text-red-400">
            Gagal memuat riwayat aktivitas
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Terjadi kesalahan saat mengambil data aktivitas. Silakan muat ulang halaman.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#111111] px-5 py-6 text-white sm:px-7 lg:px-8">
      <div className="mb-8 mt-2">
        <h1 className={TEXT.pageTitle}>Riwayat Aktivitas</h1>
        <p className={TEXT.subtitle}>
          Pantau seluruh aktivitas pengguna yang tercatat dalam sistem.
        </p>
      </div>

      <section className="max-w-full overflow-hidden rounded-[22px] border border-[#2a2a2a] bg-[#1c1c1c]/80">
        <div className="border-b border-[#262626] px-6 py-5 sm:px-8">
          <h2 className={TEXT.sectionTitle}>Daftar Aktivitas</h2>
          <p className={TEXT.subtitle}>
            {logs?.length ?? 0} aktivitas tercatat
          </p>
        </div>

        {!logs || logs.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#262626]">
              <ActivityIcon />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-white">
              Belum ada aktivitas
            </h3>
            <p className="mt-1 text-sm text-zinc-400">
              Aktivitas pengguna yang tercatat akan ditampilkan di sini.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#262626]">
            {logs.map((log: ActivityLog) => {
              const user = getUser(log.users);
              const project = getProject(log.projects);

              const initial = (
                user?.name?.trim() ||
                user?.email?.trim() ||
                "?"
              )
                .charAt(0)
                .toUpperCase();

              return (
                <article
                  key={log.id}
                  className="px-6 py-5 transition-colors hover:bg-white/[0.02] sm:px-8 sm:py-6"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
                    <div className="flex min-w-0 gap-4">
                      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#B7FE1A]/10">
                        <span className="text-sm font-semibold text-[#B7FE1A]">
                          {initial}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-white">
                            {user?.name || "Pengguna tidak diketahui"}
                          </p>

                          {log.action && (
                            <span className="inline-flex items-center rounded-full bg-[#B7FE1A]/10 px-3 py-1 text-xs font-medium text-[#B7FE1A]">
                              {translateAction(log.action)}
                            </span>
                          )}
                        </div>

                        {user?.email && (
                          <p className="mt-1 text-xs text-zinc-500">
                            {user.email}
                          </p>
                        )}

                        {log.description && (
                          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-400">
                            {translateDescription(log.description)}
                          </p>
                        )}

                        {project?.project_name && (
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                            <span className="text-zinc-500">Proyek:</span>
                            <span className="font-medium text-[#A5BDCC]">
                              {project.project_name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 pl-14 lg:pl-0 lg:text-right">
                      <p className="text-xs text-zinc-500">
                        Waktu aktivitas
                      </p>
                      <p className="mt-1 whitespace-nowrap text-sm text-[#A5BDCC]">
                        {formatDate(log.created_at)}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function ActivityIcon() {
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
      history
    </span>
  );
}
