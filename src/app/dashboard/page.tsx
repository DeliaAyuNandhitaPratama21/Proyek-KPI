import Link from "next/link";
import { createClient } from "../../lib/supabase/server";

const COLORS = {
  page: "#111111",
  card: "#191919",
  border: "#262626",
  accent: "#B7FE1A",
  secondary: "#A5BDCC",
  muted: "#A1A1AA",
};

const TEXT = {
  sectionTitle: "text-lg font-semibold text-white",
  subtitle: "mt-1 text-sm text-zinc-400",
  secondary: "mt-1 text-xs text-[#A5BDCC]",
  action: "text-sm font-medium text-[#B7FE1A]",
};

type Project = {
  id: number;
  project_name?: string;
  progress: number | null;
  status_id: number | null;
  deadline?: string | null;
  clients?: { company_name: string } | { company_name: string }[] | null;
};

type DeadlineProject = {
  id: number;
  project_name: string;
  deadline: string;
  status_id: number | null;
  clients: { company_name: string } | { company_name: string }[] | null;
};

type ActivityLog = {
  id: number;
  name: string | null;
  description: string | null;
  action: string | null;
  created_at: string;
};

function getJakartaDateKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

const STATUS = {
  WAITING: 1,
  BRIEF: 2,
  MATERIAL: 3,
  DESIGN: 4,
  APPROVAL: 5,
  DEVELOPMENT: 6,
  CONTENT: 7,
  REVISION: 8,
  TESTING: 9,
  LAUNCH: 10,
  COMPLETED: 11,
};

function getDeadlineInfo(deadline: string) {
  const today = getJakartaDateKey();
  const deadlineDate = deadline.slice(0, 10);

  const todayTime = Date.parse(`${today}T00:00:00Z`);
  const deadlineTime = Date.parse(`${deadlineDate}T00:00:00Z`);

  const difference = Math.round((deadlineTime - todayTime) / 86400000);

  const [year, month, day] = deadlineDate.split("-").map(Number);

  const formattedDate = new Date(
    Date.UTC(year, month - 1, day),
  ).toLocaleDateString("id-ID", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  if (difference < 0) {
    return {
      date: formattedDate,
      remaining: `Terlambat ${Math.abs(difference)} hari`,
      color: "red" as const,
    };
  }

  if (difference === 0) {
    return {
      date: formattedDate,
      remaining: "Hari ini",
      color: "red" as const,
    };
  }

  if (difference === 1) {
    return {
      date: formattedDate,
      remaining: "Besok",
      color: "yellow" as const,
    };
  }

  return {
    date: formattedDate,
    remaining: `${difference} hari lagi`,
    color: "blue" as const,
  };
}

/**
 * Mengubah kode action menjadi label aktivitas berbahasa Indonesia.
 * Mendukung action dengan spasi maupun underscore.
 */
function translateAction(action: string | null) {
  if (!action) return "Aktivitas lainnya";

  const normalized = action.trim().toUpperCase().replace(/\s+/g, "_");

  const translations: Record<string, string> = {
    CREATE_PROJECT: "Tambah proyek",
    ADD_PROJECT: "Tambah proyek",
    UPDATE_PROJECT: "Edit proyek",
    EDIT_PROJECT: "Edit proyek",
    DELETE_PROJECT: "Hapus proyek",
    REMOVE_PROJECT: "Hapus proyek",

    CREATE_TASK: "Tambah tugas",
    ADD_TASK: "Tambah tugas",
    UPDATE_TASK: "Edit tugas",
    EDIT_TASK: "Edit tugas",
    DELETE_TASK: "Hapus tugas",
    REMOVE_TASK: "Hapus tugas",

    CREATE_CLIENT: "Tambah klien",
    ADD_CLIENT: "Tambah klien",
    UPDATE_CLIENT: "Edit klien",
    EDIT_CLIENT: "Edit klien",
    DELETE_CLIENT: "Hapus klien",
    REMOVE_CLIENT: "Hapus klien",

    CREATE_USER: "Tambah pengguna",
    ADD_USER: "Tambah pengguna",
    UPDATE_USER: "Edit pengguna",
    EDIT_USER: "Edit pengguna",
    DELETE_USER: "Hapus pengguna",
    REMOVE_USER: "Hapus pengguna",
    UPDATE_USER_ROLE: "Edit peran pengguna",

    CREATE_MILESTONE: "Tambah tahapan proyek",
    ADD_MILESTONE: "Tambah tahapan proyek",
    UPDATE_MILESTONE: "Edit tahapan proyek",
    EDIT_MILESTONE: "Edit tahapan proyek",
    DELETE_MILESTONE: "Hapus tahapan proyek",
    REMOVE_MILESTONE: "Hapus tahapan proyek",

    CREATE_PROJECT_UPDATE: "Tambah pembaruan proyek",
    ADD_PROJECT_UPDATE: "Tambah pembaruan proyek",
    UPDATE_PROJECT_UPDATE: "Edit pembaruan proyek",
    EDIT_PROJECT_UPDATE: "Edit pembaruan proyek",
    DELETE_PROJECT_UPDATE: "Hapus pembaruan proyek",
    REMOVE_PROJECT_UPDATE: "Hapus pembaruan proyek",

    CREATE_FILE: "Unggah berkas",
    UPLOAD_FILE: "Unggah berkas",
    UPDATE_FILE: "Edit berkas",
    EDIT_FILE: "Edit berkas",
    DELETE_FILE: "Hapus berkas",
    REMOVE_FILE: "Hapus berkas",

    LOGIN: "Masuk ke sistem",
    LOGOUT: "Keluar dari sistem",

    GENERATE_PROJECT_TOKEN: "Buat tautan proyek",
    UPDATE_PROJECT_TOKEN: "Edit tautan proyek",
    EDIT_PROJECT_TOKEN: "Edit tautan proyek",
  };

  if (translations[normalized]) {
    return translations[normalized];
  }

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
 * Menerjemahkan istilah pada deskripsi aktivitas tanpa mengubah
 * nama proyek, nama klien, atau nama berkas.
 */
function translateDescription(description: string | null) {
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

  const result = replacements.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    description.trim(),
  );

  return result.charAt(0).toUpperCase() + result.slice(1);
}

function formatRelativeTime(date: string) {
  const timestamp = new Date(date).getTime();
  const now = Date.now();
  const difference = now - timestamp;

  if (!Number.isFinite(timestamp)) return "-";

  const minutes = Math.floor(difference / 60000);
  const hours = Math.floor(difference / 3600000);
  const days = Math.floor(difference / 86400000);

  if (minutes < 1 && difference >= 0) return "Baru saja";
  if (minutes < 60 && minutes >= 0) return `${minutes} menit lalu`;
  if (hours < 24 && hours >= 0) return `${hours} jam lalu`;
  if (days < 7 && days >= 0) return `${days} hari lalu`;

  return new Date(date).toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getActivityType(action: string | null) {
  return translateAction(action);
}

function getActivityColor(action: string | null) {
  if (!action) return "blue";

  const normalized = action.trim().toUpperCase().replace(/\s+/g, "_");

  if (
    normalized.startsWith("DELETE_") ||
    normalized.startsWith("REMOVE_")
  ) {
    return "red";
  }

  if (
    normalized.startsWith("CREATE_") ||
    normalized.startsWith("ADD_") ||
    normalized.startsWith("GENERATE_") ||
    normalized.startsWith("UPLOAD_")
  ) {
    return "green";
  }

  if (normalized === "LOGIN" || normalized === "LOGOUT") {
    return "purple";
  }

  return "blue";
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    { data: projectData, error: projectError },
    { data: deadlineData, error: deadlineError },
    { data: activityData, error: activityError },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id, project_name, progress, status_id, deadline"),

    supabase
      .from("projects")
      .select(`
        id,
        project_name,
        deadline,
        status_id,
        clients (
          company_name
        )
      `)
      .not("deadline", "is", null)
      .order("deadline", { ascending: true }),

    supabase
      .from("activity_logs")
      .select(`
        id,
        action,
        description,
        created_at,
        users (
          name
        )
      `)
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  // DATA PROYEK
  const projects = (projectData ?? []) as Project[];
  const totalProjects = projects.length;
  const today = getJakartaDateKey();

  const completedProjects = projects.filter(
    (project) => project.status_id === STATUS.COMPLETED,
  );

  // Proyek terlambat dan belum selesai.
  const overdueProjectList = projects.filter((project) => {
    const deadline = project.deadline?.slice(0, 10);

    return (
      project.status_id !== STATUS.COMPLETED &&
      deadline != null &&
      deadline < today
    );
  });

  const overdueProjectIds = new Set(
    overdueProjectList.map((project) => project.id),
  );

  const waitingProjects = projects.filter(
    (project) =>
      project.status_id === STATUS.WAITING &&
      !overdueProjectIds.has(project.id),
  );

  const reviewProjects = projects.filter(
    (project) =>
      project.status_id === STATUS.APPROVAL &&
      !overdueProjectIds.has(project.id),
  );

  const activeStatusIds = [
    STATUS.BRIEF,
    STATUS.MATERIAL,
    STATUS.DESIGN,
    STATUS.DEVELOPMENT,
    STATUS.CONTENT,
    STATUS.REVISION,
    STATUS.TESTING,
    STATUS.LAUNCH,
  ];

  const activeProjects = projects.filter(
    (project) =>
      project.status_id !== null &&
      activeStatusIds.includes(project.status_id) &&
      !overdueProjectIds.has(project.id),
  );

  const overdueProjects = overdueProjectList.length;

  const getPercentage = (value: number) =>
    totalProjects > 0 ? Math.round((value / totalProjects) * 100) : 0;

  const statusItems = [
    {
      label: "Dalam Proses",
      value: activeProjects.length,
      color: "#29C5F6",
    },
    {
      label: "Selesai",
      value: completedProjects.length,
      color: COLORS.accent,
    },
    {
      label: "Menunggu",
      value: waitingProjects.length,
      color: "#83A9D4",
    },
    {
      label: "Persetujuan",
      value: reviewProjects.length,
      color: "#9667F5",
    },
    {
      label: "Terlambat",
      value: overdueProjects,
      color: "#FF4567",
    },
  ];

  let currentPercentage = 0;

  const chartSegments = statusItems
    .filter((item) => item.value > 0)
    .map((item) => {
      const start = currentPercentage;

      currentPercentage +=
        totalProjects > 0 ? (item.value / totalProjects) * 100 : 0;

      return `${item.color} ${start}% ${currentPercentage}%`;
    });

  const chartBackground =
    chartSegments.length > 0
      ? `conic-gradient(${chartSegments.join(", ")})`
      : COLORS.border;

  // DEADLINE PROYEK
  const deadlineProjects: DeadlineProject[] = (
    (deadlineData ?? []) as unknown as DeadlineProject[]
  )
    .filter((project) => project.status_id !== STATUS.COMPLETED)
    .slice(0, 4);

  // AKTIVITAS TERBARU
  const activities: ActivityLog[] = (activityData ?? []).map((item) => {
    const userRelation = item.users;
    const user = Array.isArray(userRelation) ? userRelation[0] : userRelation;

    return {
      id: item.id,
      name: user?.name || "Pengguna tidak diketahui",
      description: translateDescription(item.description),
      action: item.action,
      created_at: item.created_at,
    };
  });

  return (
    <main className="min-h-screen bg-[#111111] px-5 py-6 text-white sm:px-7 lg:px-8">
      {projectError && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          Data proyek gagal dimuat. Silakan muat ulang halaman.
        </div>
      )}

      {/* STATISTIK */}
      <section
        aria-label="Statistik proyek"
        className="grid grid-cols-2 gap-4 sm:grid-cols-4"
      >
        <StatCard
          label="Total Proyek"
          value={totalProjects}
          icon="folder"
          color="green"
        />

        <StatCard
          label="Dalam Proses"
          value={activeProjects.length}
          icon="play"
          color="blue"
        />

        <StatCard
          label="Menunggu"
          value={waitingProjects.length}
          icon="clock"
          color="amber"
        />

        <StatCard
          label="Selesai"
          value={completedProjects.length}
          icon="check"
          color="purple"
        />
      </section>

      {/* STATUS PROYEK DAN DEADLINE */}
      <section className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.05fr_1fr]">
        {/* PIE CHART STATUS PROYEK */}
        <section className="min-w-0 rounded-xl bg-[#191919] p-5 sm:p-6">
          <h2 className={TEXT.sectionTitle}>
            Proyek Berdasarkan Status
          </h2>

          <p className={TEXT.subtitle}>
            Distribusi proyek berdasarkan status pengerjaan
          </p>

          <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:gap-7">
            <div
              className="h-44 w-44 shrink-0 rounded-full sm:h-[185px] sm:w-[185px]"
              style={{ background: chartBackground }}
              role="img"
              aria-label={`Distribusi status dari ${totalProjects} proyek`}
            />

            <div className="w-full min-w-0 flex-1">
              {statusItems.map((item) => (
                <div
                  key={item.label}
                  className="flex min-h-[39px] items-center gap-3 border-b border-[#262626] last:border-0"
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />

                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">
                    {item.label}
                  </span>

                  <span className="w-7 text-right text-sm tabular-nums text-white">
                    {item.value}
                  </span>

                  <span className="w-10 text-right text-sm tabular-nums text-[#A5BDCC]">
                    {getPercentage(item.value)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* DEADLINE TERDEKAT */}
        <section className="min-w-0 rounded-xl bg-[#191919] p-5 sm:p-6">
          <SectionHeader
            title="Deadline Proyek Terdekat"
            subtitle="Daftar proyek dengan deadline terdekat"
          />

          {deadlineError ? (
            <p className="py-4 text-sm text-red-300">
              Data deadline gagal dimuat. Silakan muat ulang halaman.
            </p>
          ) : deadlineProjects.length === 0 ? (
            <p className="py-4 text-sm text-zinc-400">
              Belum ada proyek dengan deadline yang perlu ditampilkan.
            </p>
          ) : (
            <div>
              {deadlineProjects.map((item, index) => {
                const deadlineInfo = getDeadlineInfo(item.deadline);

                const clientRelation = item.clients;
                const client = Array.isArray(clientRelation)
                  ? clientRelation[0]
                  : clientRelation;

                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-4 py-3 ${
                      index !== deadlineProjects.length - 1
                        ? "border-b border-[#262626]"
                        : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {item.project_name}
                      </p>

                      <p className={TEXT.secondary}>
                        {client?.company_name || "Klien tidak diketahui"}
                      </p>

                      <p className="mt-1 text-xs text-[#A5BDCC] md:hidden">
                        {deadlineInfo.date}
                      </p>
                    </div>

                    <span className="hidden shrink-0 text-xs text-[#A5BDCC] md:block">
                      {deadlineInfo.date}
                    </span>

                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${
                        deadlineInfo.color === "red"
                          ? "bg-[#451D26] text-[#FF7185]"
                          : deadlineInfo.color === "yellow"
                            ? "bg-[#49351A] text-[#FFC46B]"
                            : "bg-[#202D24] text-[#86D9A1]"
                      }`}
                    >
                      {deadlineInfo.remaining}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </section>

      {/* AKTIVITAS TERBARU */}
      <section className="mt-5 rounded-xl bg-[#191919] p-5 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className={TEXT.sectionTitle}>
              Ringkasan Aktivitas Terbaru
            </h2>

            <p className={TEXT.subtitle}>
              Daftar aktivitas terbaru dari seluruh proyek
            </p>
          </div>

          <Link
            href="/dashboard/activity-logs"
            className={`${TEXT.action} shrink-0 transition-colors hover:text-white`}
          >
            Lihat Semua
          </Link>
        </div>

        {activityError ? (
          <p className="py-4 text-sm text-red-300">
            Data aktivitas gagal dimuat. Silakan muat ulang halaman.
          </p>
        ) : activities.length === 0 ? (
          <p className="py-4 text-sm text-zinc-400">
            Belum ada aktivitas yang tercatat.
          </p>
        ) : (
          <div>
            {activities.map((item, index) => {
              const type = getActivityType(item.action);
              const color = getActivityColor(item.action);

              return (
                <div
                  key={item.id}
                  className={`grid grid-cols-1 gap-2 py-3 sm:grid-cols-[130px_minmax(0,1fr)_auto_100px] sm:items-center sm:gap-4 ${
                    index !== activities.length - 1
                      ? "border-b border-[#262626]"
                      : ""
                  }`}
                >
                  <p className="truncate text-sm font-medium text-white">
                    {item.name}
                  </p>

                  <p className={TEXT.secondary}>
                    {item.description || type}
                  </p>

                  <span
                    className={`w-fit rounded-full px-3 py-1 text-[11px] font-semibold ${
                      color === "green"
                        ? "bg-[#075C3C] text-white"
                        : color === "blue"
                          ? "bg-[#075078] text-white"
                          : color === "purple"
                            ? "bg-[#8052DB] text-white"
                            : color === "red"
                              ? "bg-[#B91F3B] text-white"
                              : "bg-[#FFC02E] text-[#17130A]"
                    }`}
                  >
                    {type}
                  </span>

                  <p className="mt-1 truncate text-xs text-[#A5BDCC] sm:mt-0 sm:text-right">
                    {formatRelativeTime(item.created_at)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-4">
      <h2 className={TEXT.sectionTitle}>{title}</h2>
      <p className={TEXT.subtitle}>{subtitle}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: "folder" | "clock" | "play" | "check";
  color: "green" | "blue" | "amber" | "purple";
}) {
  const colors = {
    green: "bg-[#075E46] text-[#6EE7B7]",
    blue: "bg-[#084C70] text-[#7DD3FC]",
    amber: "bg-[#49380A] text-[#FACC15]",
    purple: "bg-[#4C267A] text-[#D8B4FE]",
  };

  return (
    <div className="min-w-0 rounded-xl bg-[#191919] p-4 transition-colors sm:p-5">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${colors[color]}`}
        >
          <DashboardIcon name={icon} />
        </div>

        <p className="text-sm text-[#D4E1EB]">{label}</p>
      </div>

      <p className="mt-3 text-3xl font-semibold leading-none tracking-tight text-white tabular-nums">
        {value}
      </p>
    </div>
  );
}

function DashboardIcon({
  name,
}: {
  name: "folder" | "clock" | "play" | "check";
}) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      aria-hidden="true"
      {...common}
    >
      {name === "folder" && (
        <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
      )}

      {name === "clock" && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </>
      )}

      {name === "play" && <path d="m8 5 11 7-11 7V5Z" />}

      {name === "check" && <path d="m5 12 4 4L19 6" />}
    </svg>
  );
}
