
import { createClient } from "../../../lib/supabase/server";
import { requireRole } from "../../auth/role-guard";

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
    ARCHIVE_PROJECT: "Arsipkan proyek",
    RESTORE_PROJECT: "Pulihkan proyek",
    UNARCHIVE_PROJECT: "Pulihkan proyek",

    CREATE_TASK: "Tambah tugas",
    UPDATE_TASK: "Edit tugas",
    DELETE_TASK: "Hapus tugas",

    CREATE_CLIENT: "Tambah klien",
    UPDATE_CLIENT: "Edit klien",
    DELETE_CLIENT: "Hapus klien",
    ARCHIVE_CLIENT: "Arsipkan klien",
    RESTORE_CLIENT: "Pulihkan klien",
    UNARCHIVE_CLIENT: "Pulihkan klien",

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
    UPLOAD_FILE: "Unggah berkas",
    UPDATE_FILE: "Edit berkas",
    UPDATE_FILE_VISIBILITY: "Ubah visibilitas berkas",
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
    ARCHIVE: "Arsipkan",
    RESTORE: "Pulihkan",
    UNARCHIVE: "Pulihkan",
    ACTIVATE: "Aktifkan",
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

  const fallbackLabel = normalized
    .split("_")
    .map((word) => parts[word] || word.toLowerCase())
    .join(" ");

  // Pastikan label pill selalu diawali huruf kapital.
  return fallbackLabel.charAt(0).toUpperCase() + fallbackLabel.slice(1);
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
  await requireRole(["Admin", "Project Manager"]);

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
      <main className="min-h-screen bg-[#f7f7f5] px-5 py-6 text-[#1f1e30] sm:px-7 lg:px-8">
        <div
          role="alert"
          className="max-w-4xl rounded-2xl border border-red-200 bg-white p-5 shadow-[0_2px_10px_rgba(31,30,48,0.04)]"
        >
          <h2 className="text-sm font-medium text-red-700">
            Gagal memuat riwayat aktivitas
          </h2>
          <p className="mt-2 text-sm text-[#777777]">
            Terjadi kesalahan saat mengambil data aktivitas. Silakan muat ulang halaman.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-5 py-6 text-[#1f1e30] sm:px-7 lg:px-8">
      <section className="max-w-full overflow-hidden rounded-2xl border border-[#EEEEEE] bg-white shadow-[0_2px_10px_rgba(31,30,48,0.04)]">
        {/* Header Bagian */}
        <div className="border-b border-[#EEEEEE] px-6 py-5 sm:px-8">
          <h2 className="text-lg font-semibold text-[#1f1e30]">
            Daftar Aktivitas
          </h2>
          <p className="mt-1 text-sm text-[#777777]">
            {logs?.length ?? 0} aktivitas tercatat
          </p>
        </div>

        {!logs || logs.length === 0 ? (
          /* Tampilan Ketika Belum Ada Aktivitas */
          <div className="flex min-h-[338px] flex-col items-center justify-center px-5 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#f1ffcc]">
              <ActivityIcon />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-[#1f1e30]">
              Belum Ada Aktivitas
            </h3>
            <p className="mt-1 text-sm text-[#777777]">
              Belum ada aktivitas pengguna yang tercatat untuk ditampilkan.
            </p>
          </div>
        ) : (
          /* Daftar Aktivitas */
          <div className="divide-y divide-[#EEEEEE]">
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
                  className="px-6 py-5 sm:px-8 sm:py-6"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
                    <div className="flex min-w-0 gap-4">
                      {/* Avatar Pengguna */}
                      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1f1e30]">
                        <span className="text-sm font-semibold text-[#B7FE1A]">
                          {initial}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-[#1f1e30]">
                            {user?.name || "Pengguna tidak diketahui"}
                          </p>

                          {log.action && (
                            <span className="inline-flex items-center rounded-full bg-[#E8F5C8] px-3 py-1 text-xs font-medium text-[#1f1e30]">
                              {translateAction(log.action)}
                            </span>
                          )}
                        </div>

                        {user?.email && (
                          <p className="mt-1 text-xs text-[#999999]">
                            {user.email}
                          </p>
                        )}

                        {log.description && (
                          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-[#555563]">
                            {translateDescription(log.description)}
                          </p>
                        )}

                        {project?.project_name && (
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                            <span className="text-[#999999]">Proyek:</span>
                            <span className="font-medium text-[#555563]">
                              {project.project_name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Waktu Aktivitas */}
                    <div className="shrink-0 pl-14 lg:min-w-[220px] lg:pl-0 lg:text-right">
                      <p className="text-xs text-[#999999]">
                        Waktu aktivitas
                      </p>
                      <p className="mt-1 whitespace-nowrap text-sm text-[#555563]">
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
        color: "#1f1e30",
      }}
    >
      history
    </span>
  );
}
