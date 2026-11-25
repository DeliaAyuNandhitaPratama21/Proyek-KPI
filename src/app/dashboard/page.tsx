import Link from "next/link";
import { createClient } from "../../lib/supabase/server";
import { requireRole } from "../auth/role-guard";

const TEXT = {
  sectionTitle: "text-lg font-semibold text-[#1f1e30]",
  subtitle: "mt-1 text-sm text-[#1f1e30]",
  secondary: "mt-1 text-xs text-[#1f1e30]",
  action: "text-sm font-medium text-[#1f1e30]",
};

type Project = {
  id: number;
  project_name?: string;
  progress: number | null;
  status_id: number | null;
  deadline?: string | null;
  created_at?: string | null;
  clients?: { company_name: string } | { company_name: string }[] | null;
};

type DeadlineProject = {
  id: number;
  project_name: string;
  deadline: string;
  status_id: number | null;
  clients: { company_name: string } | { company_name: string }[] | null;
};

type Task = {
  id: number;
  project_id: number | null;
  title: string;
  status: string;
  deadline?: string | null;
  due_date?: string | null;
  projects?: { project_name: string } | { project_name: string }[] | null;
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
  IN_PROGRESS: 2,
  ON_HOLD: 12,
  COMPLETED: 11,
};

function getTaskStatusGroup(status: string | null | undefined) {
  const normalized = (status ?? "").trim().toLowerCase();

  if (["completed", "complete", "done", "selesai"].includes(normalized)) {
    return "completed" as const;
  }

  if (
    [
      "in progress",
      "in_progress",
      "doing",
      "review",
      "revision",
      "revisi",
      "dikerjakan",
      "sedang dikerjakan",
    ].includes(normalized)
  ) {
    return "inProgress" as const;
  }

  return "pending" as const;
}

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
    ARCHIVE_PROJECT: "Arsipkan proyek",
    RESTORE_PROJECT: "Pulihkan proyek",
    UNARCHIVE_PROJECT: "Pulihkan proyek",

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
    ARCHIVE_CLIENT: "Arsipkan klien",
    RESTORE_CLIENT: "Pulihkan klien",
    UNARCHIVE_CLIENT: "Pulihkan klien",

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

  return fallbackLabel.charAt(0).toUpperCase() + fallbackLabel.slice(1);
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

  if (normalized.startsWith("DELETE_") || normalized.startsWith("REMOVE_")) {
    return "red";
  }

  if (
    normalized.startsWith("CREATE_") ||
    normalized.startsWith("ADD_") ||
    normalized.startsWith("GENERATE_") ||
    normalized.startsWith("UPLOAD_") ||
    normalized.startsWith("ARCHIVE_") ||
    normalized.startsWith("RESTORE_") ||
    normalized.startsWith("UNARCHIVE_")
  ) {
    return "green";
  }

  if (normalized === "LOGIN" || normalized === "LOGOUT") {
    return "purple";
  }

  return "blue";
}

export default async function DashboardPage() {
  const profile = await requireRole(["Admin", "Project Manager", "Staff"]);

  const supabase = await createClient();
  const userId = profile.id;
  const isStaff = profile.role === "Staff";

  // Tugas Staff diambil langsung berdasarkan assigned_to.
  const taskQuery = isStaff
    ? supabase
        .from("tasks")
        .select(
          `
        id,
        project_id,
        title,
        status,
        deadline,
        due_date,
        projects (
          project_name
        )
      `,
        )
        .eq("assigned_to", userId)
    : supabase
        .from("tasks")
        .select(
          `
          id,
          project_id,
          title,
          status,
          deadline,
          due_date,
          projects!inner (
            project_name,
            is_archived
          )
        `,
        )
        .eq("projects.is_archived", false);

  const { data: taskData, error: taskError } = await taskQuery;

  // Mengambil ID proyek dari task yang ditugaskan kepada Staff.
  const assignedProjectIds = isStaff
    ? [
        ...new Set(
          (taskData ?? [])
            .map((task) => task.project_id)
            .filter((id): id is number => id !== null),
        ),
      ]
    : [];

  // STATISTIK PROYEK
  const scopedProjectPromise = (() => {
    let query = supabase
      .from("projects")
      .select("id, project_name, progress, status_id, deadline, created_at")
      .eq("is_archived", false);

    if (isStaff) {
      if (assignedProjectIds.length > 0) {
        query = query.or(
          `pic.eq.${userId},id.in.(${assignedProjectIds.join(",")})`,
        );
      } else {
        query = query.eq("pic", userId);
      }
    }

    return query;
  })();

  // TREN PROYEK BULANAN
  const monthlyProjectPromise = (() => {
    let query = supabase.from("projects").select("id, created_at");

    if (isStaff) {
      if (assignedProjectIds.length > 0) {
        query = query.or(
          `pic.eq.${userId},id.in.(${assignedProjectIds.join(",")})`,
        );
      } else {
        query = query.eq("pic", userId);
      }
    }

    return query;
  })();

  // DEADLINE PROYEK
  const deadlinePromise = (() => {
    let query = supabase
      .from("projects")
      .select(
        `
        id,
        project_name,
        deadline,
        status_id,
        clients (
          company_name
        )
      `,
      )
      .eq("is_archived", false)
      .not("deadline", "is", null);

    if (isStaff) {
      if (assignedProjectIds.length > 0) {
        query = query.or(
          `pic.eq.${userId},id.in.(${assignedProjectIds.join(",")})`,
        );
      } else {
        query = query.eq("pic", userId);
      }
    }

    return query.order("deadline", { ascending: true });
  })();

  // AKTIVITAS TERBARU
  // Staff tidak memiliki akses ke Log Aktivitas.
  // Aktivitas PM tetap dibatasi oleh RLS activity_logs.
  const activityPromise = isStaff
    ? Promise.resolve({ data: [], error: null })
    : supabase
        .from("activity_logs")
        .select(
          `
          id,
          action,
          description,
          created_at,
          users (
            name
          )
        `,
        )
        .order("created_at", { ascending: false })
        .limit(3);

  const [
    { data: projectData, error: projectError },
    { data: monthlyProjectData, error: monthlyProjectError },
    { data: deadlineData, error: deadlineError },
    { data: activityData, error: activityError },
  ] = await Promise.all([
    scopedProjectPromise,
    monthlyProjectPromise,
    deadlinePromise,
    activityPromise,
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

  const activeProjects = projects.filter(
    (project) =>
      project.status_id === STATUS.IN_PROGRESS &&
      !overdueProjectIds.has(project.id),
  );

  const overdueProjects = overdueProjectList.length;

  // DATA TASK DAN DISTRIBUSI TASK BERDASARKAN STATUS
  const tasks = (taskData ?? []) as Task[];
  const taskStatusItems = [
    {
      label: "Selesai",
      value: tasks.filter(
        (task) => getTaskStatusGroup(task.status) === "completed",
      ).length,
      color: "#1F1E30",
    },
    {
      label: "Sedang Dikerjakan",
      value: tasks.filter(
        (task) => getTaskStatusGroup(task.status) === "inProgress",
      ).length,
      color: "#B7FE1A",
    },
    {
      label: "Belum Dikerjakan",
      value: tasks.filter(
        (task) => getTaskStatusGroup(task.status) === "pending",
      ).length,
      color: "#D6D3D1",
    },
  ];

  const taskChartTotal = taskStatusItems.reduce(
    (sum, item) => sum + item.value,
    0,
  );
  let currentPercentage = 0;

  const taskChartSegments = taskStatusItems
    .filter((item) => item.value > 0)
    .map((item) => {
      const start = currentPercentage;
      currentPercentage +=
        taskChartTotal > 0 ? (item.value / taskChartTotal) * 100 : 0;
      return `${item.color} ${start}% ${currentPercentage}%`;
    });

  const taskChartBackground =
    taskChartSegments.length > 0
      ? `conic-gradient(${taskChartSegments.join(", ")})`
      : "#E5E5E5";

  // TASK MENDEKATI DEADLINE: task belum selesai dengan deadline terdekat.
  const upcomingTasks = tasks
    .map((task) => ({
      ...task,
      effectiveDeadline: task.deadline || task.due_date || null,
    }))
    .filter(
      (task) =>
        getTaskStatusGroup(task.status) !== "completed" &&
        task.effectiveDeadline !== null,
    )
    .sort((a, b) =>
      (a.effectiveDeadline || "9999-12-31").localeCompare(
        b.effectiveDeadline || "9999-12-31",
      ),
    )
    .slice(0, 3);

  // JUMLAH PROYEK PER BULAN (berdasarkan tanggal dibuat)
  const jakartaParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  const currentYear = Number(
    jakartaParts.find((part) => part.type === "year")?.value,
  );
  const currentMonth = Number(
    jakartaParts.find((part) => part.type === "month")?.value,
  );

  const monthlyProjects = Array.from({ length: 6 }, (_, index) => {
    // Menampilkan 5 bulan sebelumnya sampai bulan berjalan.
    const date = new Date(Date.UTC(currentYear, currentMonth - 6 + index, 1));
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const key = `${year}-${String(month).padStart(2, "0")}`;

    return {
      key,
      label: date.toLocaleDateString("id-ID", {
        month: "short",
        timeZone: "UTC",
      }),
      value: (
        (monthlyProjectData ?? []) as { created_at?: string | null }[]
      ).filter((project) => {
        if (!project.created_at) return false;

        const createdParts = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Jakarta",
          year: "numeric",
          month: "2-digit",
        }).formatToParts(new Date(project.created_at));

        const createdYear = createdParts.find(
          (part) => part.type === "year",
        )?.value;

        const createdMonth = createdParts.find(
          (part) => part.type === "month",
        )?.value;

        return `${createdYear}-${createdMonth}` === key;
      }).length,
    };
  });

  const monthlyMax = Math.max(...monthlyProjects.map((item) => item.value), 1);
  const chartAxisStep = Math.max(1, Math.ceil(monthlyMax / 4));
  const chartAxisMax = chartAxisStep * 4;
  const chartAxisTicks = [
    chartAxisMax,
    chartAxisStep * 3,
    chartAxisStep * 2,
    chartAxisStep,
    0,
  ];

  // DEADLINE PROYEK
  const deadlineProjects: DeadlineProject[] = (
    (deadlineData ?? []) as unknown as DeadlineProject[]
  )
    .filter((project) => project.status_id !== STATUS.COMPLETED)
    .slice(0, 3);

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
    <main className="min-h-screen bg-[#f7f7f5] px-5 pt-3 pb-6 text-[#1f1e30] sm:px-7 lg:px-8">
      <style>{`
        @property --pie-angle {
          syntax: "<angle>";
          inherits: false;
          initial-value: 0deg;
        }

        @property --task-count {
          syntax: "<integer>";
          inherits: false;
          initial-value: 0;
        }

        @property --stat-count {
          syntax: "<integer>";
          inherits: false;
          initial-value: 0;
        }

        @keyframes stat-icon-enter {
          from { opacity: 0; transform: scale(0.72); }
          to { opacity: 1; transform: scale(1); }
        }

        @keyframes stat-count-up {
          from { --stat-count: 0; }
          to { --stat-count: var(--stat-total); }
        }

        .dashboard-stat-icon {
          opacity: 0;
          animation: stat-icon-enter 500ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .dashboard-stat-count {
          counter-reset: stat-number var(--stat-count);
          animation: stat-count-up 1200ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .dashboard-stat-count::before {
          content: counter(stat-number);
        }

        @keyframes pie-fill {
          from { --pie-angle: 0deg; }
          to { --pie-angle: 360deg; }
        }

        @keyframes task-count-up {
          from { --task-count: 0; }
          to { --task-count: var(--task-total); }
        }

        @keyframes center-label-enter {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes legend-enter {
          from { opacity: 0; transform: translateX(14px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes bar-grow {
          from { transform: scaleY(0); opacity: 0.35; }
          to { transform: scaleY(1); opacity: 1; }
        }

        @keyframes chart-axis-enter {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes chart-grid-enter {
          from { opacity: 0; transform: scaleX(0); }
          to { opacity: 1; transform: scaleX(1); }
        }

        .dashboard-chart-axis-label {
          animation: chart-axis-enter 450ms ease-out both;
        }

        .dashboard-chart-grid-line {
          transform-origin: left center;
          animation: chart-grid-enter 650ms ease-out both;
        }

        .dashboard-task-count {
          counter-reset: task-number var(--task-count);
          animation: task-count-up 1400ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .dashboard-task-count::before {
          content: counter(task-number);
        }

        .dashboard-center-label {
          animation: center-label-enter 500ms ease-out 250ms both;
        }

        .dashboard-legend-item {
          opacity: 0;
          animation: legend-enter 550ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .dashboard-monthly-bar {
          transform-origin: bottom;
          animation: bar-grow 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        @media (prefers-reduced-motion: reduce) {
          .dashboard-donut-animation,
          .dashboard-task-count,
          .dashboard-center-label,
          .dashboard-legend-item,
          .dashboard-monthly-bar,
          .dashboard-chart-axis-label,
          .dashboard-chart-grid-line {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

      {(projectError || taskError) && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#1f1e30]"
        >
          Data dashboard gagal dimuat. Silakan muat ulang halaman.
        </div>
      )}

      {/* STATISTIK */}
      <section
        aria-label="Statistik proyek"
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        <StatCard
          label="Total Proyek"
          value={totalProjects}
          icon="layers"
          animationIndex={0}
        />

        <StatCard
          label="Dalam Proses"
          value={activeProjects.length}
          icon="play"
          animationIndex={1}
        />

        <StatCard
          label="Menunggu"
          value={waitingProjects.length}
          icon="clock"
          animationIndex={2}
        />

        <StatCard
          label="Selesai"
          value={completedProjects.length}
          icon="check"
          animationIndex={3}
        />
      </section>

      {/* GRAFIK DASHBOARD */}
      <section className="mt-5 grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
        {/* DISTRIBUSI TASK */}
        <section className="min-w-0 min-h-[340px] rounded-2xl border border-[#EEEEEE] bg-white p-5 shadow-[0_2px_10px_rgba(31,30,48,0.04)] sm:p-6">
          <div>
            <h2 className="text-lg font-semibold text-[#1f1e30]">
              Distribusi Tugas
            </h2>
            <p className="mt-1 text-sm text-[#777777]">
              Jumlah tugas berdasarkan status pengerjaan
            </p>
          </div>

          <div className="mt-8 flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-7">
            <div className="relative h-[190px] w-[190px] shrink-0">
              <div
                className="dashboard-donut-animation h-full w-full rounded-full"
                style={{ background: taskChartBackground }}
                role="img"
                aria-label={`Distribusi status dari ${taskChartTotal} task`}
              />
              <div className="absolute inset-[36px] flex flex-col items-center justify-center rounded-full bg-white">
                <p
                  className="dashboard-task-count text-[34px] font-semibold leading-none tracking-tight text-[#1f1e30] tabular-nums"
                  style={
                    { "--task-total": taskChartTotal } as React.CSSProperties
                  }
                  aria-label={`${taskChartTotal} task`}
                />
                <p className="dashboard-center-label mt-1 text-sm font-medium text-[#777777]">
                  Tugas
                </p>
              </div>
            </div>

            <div className="w-full min-w-0 flex-1">
              <div className="space-y-4">
                {taskStatusItems.map((item) => (
                  <div
                    key={item.label}
                    className="dashboard-legend-item flex items-start gap-3"
                    style={{
                      animationDelay: `${500 + taskStatusItems.indexOf(item) * 180}ms`,
                    }}
                  >
                    <span
                      className="mt-0.5 h-4 w-4 shrink-0 rounded-md"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-tight text-[#1f1e30]">
                        {item.label}
                      </p>
                      <p className="mt-1 text-xs text-[#555563]">
                        {item.value} tugas
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {taskError && (
            <p className="mt-3 text-xs text-red-600">
              Data task gagal dimuat. Silakan muat ulang halaman.
            </p>
          )}
        </section>

        {/* TREN PROYEK BULANAN */}
        <section className="flex h-full min-w-0 flex-col rounded-2xl border border-[#EEEEEE] bg-white p-5 shadow-[0_2px_10px_rgba(31,30,48,0.04)] sm:p-6">
          <div>
            <h2 className="text-lg font-semibold text-[#1f1e30]">
              Tren Proyek Bulanan
            </h2>
            <p className="mt-1 text-sm text-[#777777]">
              Jumlah proyek yang dibuat selama 6 bulan terakhir
            </p>
          </div>

          <div
            className="mt-12 flex h-[145px] gap-2"
            role="img"
            aria-label="Diagram batang jumlah proyek yang dibuat per bulan selama 6 bulan terakhir"
          >
            <div className="relative h-[145px] w-6 shrink-0 text-right text-[10px] text-[#777777]">
              {chartAxisTicks.map((tick, index) => (
                <span
                  key={tick}
                  className="dashboard-chart-axis-label absolute -translate-y-1/2 leading-none"
                  style={{
                    top: `${(index / (chartAxisTicks.length - 1)) * 100}%`,
                    right: tick === 1 ? "1px" : "0px",
                    animationDelay: `${index * 100}ms`,
                  }}
                >
                  {tick}
                </span>
              ))}
            </div>

            <div className="relative flex h-[145px] min-w-0 flex-1 items-end justify-between">
              <div className="pointer-events-none absolute inset-0">
                {chartAxisTicks.map((tick, index) => (
                  <div
                    key={tick}
                    className="dashboard-chart-grid-line absolute inset-x-0 border-t border-[#EEEEEE]"
                    style={{
                      top: `${(index / 4) * 100}%`,
                      animationDelay: `${150 + index * 100}ms`,
                    }}
                  />
                ))}
              </div>
              {monthlyProjects.map((item) => {
                const barHeight = (item.value / chartAxisMax) * 145;
                const isCurrentMonth =
                  item.key ===
                  `${currentYear}-${String(currentMonth).padStart(2, "0")}`;

                return (
                  <div
                    key={item.key}
                    className="relative z-10 flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                  >
                    <div
                      className={`dashboard-monthly-bar w-[12px] rounded-t-md ${
                        isCurrentMonth ? "bg-[#B7FE1A]" : "bg-[#1f1e30]"
                      }`}
                      style={
                        {
                          height: `${barHeight}px`,
                          animationDelay: `${monthlyProjects.indexOf(item) * 100}ms`,
                        } as React.CSSProperties
                      }
                      title={`${item.label}: ${item.value} proyek`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {monthlyProjectError && (
            <p role="alert" className="mt-2 text-xs text-red-600">
              Data tren proyek gagal dimuat. Silakan muat ulang halaman.
            </p>
          )}

          <div className="relative top-2 ml-8 mt-1 flex justify-between gap-1">
            {monthlyProjects.map((item) => (
              <span
                key={item.key}
                className="dashboard-chart-axis-label min-w-0 flex-1 text-center text-[10px] font-medium capitalize text-[#777777]"
                style={{
                  animationDelay: `${650 + monthlyProjects.indexOf(item) * 100}ms`,
                }}
              >
                {item.label}
              </span>
            ))}
          </div>
        </section>
      </section>

      {/* DAFTAR DEADLINE */}
      <section className="mt-5 grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
        {/* DEADLINE TASK TERDEKAT */}
        <section className="flex h-full min-w-0 flex-col rounded-2xl border border-[#EEEEEE] bg-white p-5 shadow-[0_2px_10px_rgba(31,30,48,0.04)] sm:p-6">
          {/* HEADER */}
          <div className="mb-4 flex min-h-[52px] items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className={TEXT.sectionTitle}>Deadline Tugas Terdekat</h2>
              <p className={TEXT.subtitle}>
                Daftar tugas yang perlu segera diselesaikan
              </p>
            </div>

            <Link
              href="/dashboard/tasks"
              className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#65A30D] transition-colors hover:text-[#4D7C0F]"
            >
              Lihat Semua
            </Link>
          </div>

          {/* DAFTAR TASK */}
          {taskError ? (
            <p className="flex flex-1 items-center py-4 text-sm text-[#555563]">
              Data task gagal dimuat. Silakan muat ulang halaman.
            </p>
          ) : upcomingTasks.length === 0 ? (
            <div className="flex min-h-[190px] flex-1 flex-col items-center justify-center px-5 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f1ffcc] text-[#1f1e30]">
                <DashboardIcon name="task" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-[#1f1e30]">
                Belum Ada Tugas
              </h3>
              <p className="mt-1 text-sm text-[#777777]">
                Tidak ada tugas yang mendekati deadline.
              </p>
            </div>
          ) : (
            <div className="flex-1">
              {upcomingTasks.map((task) => {
                const info = getDeadlineInfo(task.effectiveDeadline as string);
                const projectRelation = task.projects;
                const project = Array.isArray(projectRelation)
                  ? projectRelation[0]
                  : projectRelation;

                return (
                  <div
                    key={task.id}
                    className="flex min-h-[76px] items-center gap-3 py-3"
                  >
                    {/* ICON TASK */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F1FFCC] text-[#1f1e30]">
                      <span
                        className="material-symbols-outlined"
                        aria-hidden="true"
                        style={{
                          fontSize: "23px",
                          fontWeight: 400,
                          lineHeight: 1,
                          fontFeatureSettings: '"liga"',
                        }}
                      >
                        task
                      </span>
                    </div>

                    {/* INFORMASI TASK */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#1f1e30]">
                        {task.title}
                      </p>

                      <p className="mt-1 truncate text-xs text-[#555563]">
                        {project?.project_name ||
                          (isStaff
                            ? "Proyek terkait"
                            : "Proyek tidak diketahui")}
                      </p>

                      <p className="mt-1 text-xs text-[#777777] sm:hidden">
                        Deadline: {info.date}
                      </p>
                    </div>

                    {/* TANGGAL DAN STATUS DEADLINE */}
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className="hidden text-xs text-[#555563] sm:block">
                        {info.date}
                      </span>

                      <span
                        className={`inline-flex h-6 w-fit shrink-0 items-center justify-center whitespace-nowrap rounded-full px-4 text-center text-[10px] font-semibold ${
                          info.color === "red"
                            ? "bg-[#fce2d3] text-[#1f1e30]"
                            : info.color === "yellow"
                              ? "bg-[#ffffc2] text-[#1f1e30]"
                              : "bg-[#E8F5C8] text-[#1f1e30]"
                        }`}
                      >
                        {info.remaining}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* DEADLINE PROYEK TERDEKAT */}
        <section className="flex h-full min-w-0 flex-col rounded-2xl border border-[#EEEEEE] bg-white p-5 shadow-[0_2px_10px_rgba(31,30,48,0.04)] sm:p-6">
          {/* HEADER */}
          <div className="mb-4 flex min-h-[52px] items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className={TEXT.sectionTitle}>Deadline Proyek Terdekat</h2>
              <p className={TEXT.subtitle}>
                Daftar proyek dengan deadline terdekat
              </p>
            </div>

            <Link
              href="/dashboard/projects"
              className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#65A30D] transition-colors hover:text-[#4D7C0F]"
            >
              Lihat Semua
            </Link>
          </div>

          {/* DAFTAR PROYEK */}
          {deadlineError ? (
            <p className="flex flex-1 items-center py-4 text-sm text-[#555563]">
              Data deadline gagal dimuat. Silakan muat ulang halaman.
            </p>
          ) : deadlineProjects.length === 0 ? (
            <div className="flex min-h-[190px] flex-1 flex-col items-center justify-center px-5 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f1ffcc] text-[#1f1e30]">
                <DashboardIcon name="folder" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-[#1f1e30]">
                Belum Ada Proyek
              </h3>
              <p className="mt-1 text-sm text-[#777777]">
                Belum ada proyek dengan deadline yang perlu ditampilkan.
              </p>
            </div>
          ) : (
            <div className="flex-1">
              {deadlineProjects.map((item) => {
                const deadlineInfo = getDeadlineInfo(item.deadline);
                const clientRelation = item.clients;
                const client = Array.isArray(clientRelation)
                  ? clientRelation[0]
                  : clientRelation;

                return (
                  <div
                    key={item.id}
                    className="flex min-h-[76px] items-center gap-3 py-3"
                  >
                    {/* ICON PROYEK */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F1FFCC] text-[#1f1e30]">
                      <span
                        className="material-symbols-outlined"
                        aria-hidden="true"
                        style={{
                          fontSize: "23px",
                          fontWeight: 400,
                          lineHeight: 1,
                          fontFeatureSettings: '"liga"',
                        }}
                      >
                        folder_open
                      </span>
                    </div>

                    {/* INFORMASI PROYEK */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#1f1e30]">
                        {item.project_name}
                      </p>

                      <p className="mt-1 truncate text-xs text-[#555563]">
                        {client?.company_name || "Klien tidak diketahui"}
                      </p>

                      <p className="mt-1 text-xs text-[#777777] sm:hidden">
                        Deadline: {deadlineInfo.date}
                      </p>
                    </div>

                    {/* TANGGAL DAN STATUS DEADLINE */}
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className="hidden text-xs text-[#555563] sm:block">
                        {deadlineInfo.date}
                      </span>

                      <span
                        className={`inline-flex h-6 w-fit shrink-0 items-center justify-center whitespace-nowrap rounded-full px-4 text-center text-[10px] font-semibold ${
                          deadlineInfo.color === "red"
                            ? "bg-[#fce2d3] text-[#1f1e30]"
                            : deadlineInfo.color === "yellow"
                              ? "bg-[#ffffc2] text-[#1f1e30]"
                              : "bg-[#E8F5C8] text-[#1f1e30]"
                        }`}
                      >
                        {deadlineInfo.remaining}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </section>

      {/* AKTIVITAS TERBARU: hanya untuk Admin dan Project Manager */}
      {!isStaff && (
        <section className="mt-5 flex min-w-0 flex-col rounded-2xl border border-[#EEEEEE] bg-white p-5 shadow-[0_2px_10px_rgba(31,30,48,0.04)] sm:p-6">
          {/* HEADER */}
          <div className="mb-4 flex min-h-[52px] items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className={TEXT.sectionTitle}>Ringkasan Aktivitas Terbaru</h2>
              <p className={TEXT.subtitle}>
                Daftar aktivitas terbaru yang dapat diakses
              </p>
            </div>

            <Link
              href="/dashboard/activity-logs"
              className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#65A30D] transition-colors hover:text-[#4D7C0F]"
            >
              Lihat Semua
            </Link>
          </div>

          {/* DAFTAR AKTIVITAS */}
          {activityError ? (
            <p className="flex min-h-[76px] items-center py-4 text-sm text-[#555563]">
              Data aktivitas gagal dimuat. Silakan muat ulang halaman.
            </p>
          ) : activities.length === 0 ? (
            <div className="flex min-h-[190px] flex-1 flex-col items-center justify-center px-5 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f1ffcc] text-[#1f1e30]">
                <DashboardIcon name="clock" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-[#1f1e30]">
                Belum Ada Aktivitas
              </h3>
              <p className="mt-1 text-sm text-[#777777]">
                Aktivitas pengguna yang tercatat akan ditampilkan di sini.
              </p>
            </div>
          ) : (
            <div className="flex-1">
              {activities.map((item) => {
                const type = getActivityType(item.action);
                const color = getActivityColor(item.action);

                return (
                  <div
                    key={item.id}
                    className="flex min-h-[76px] items-center gap-3 py-3"
                  >
                    {/* AVATAR DAN INFORMASI AKTIVITAS */}
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {/* AVATAR USER */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1f1e30]">
                        <span className="font-semibold text-[#B7FE1A]">
                          {item.name?.trim()?.charAt(0)?.toUpperCase() || "U"}
                        </span>
                      </div>

                      {/* NAMA DAN DESKRIPSI AKTIVITAS */}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#1f1e30]">
                          {item.name}
                        </p>
                        <p className="mt-1 text-xs text-[#555563]">
                          {item.description || type}
                        </p>
                      </div>
                    </div>

                    {/* JENIS AKTIVITAS DAN WAKTU */}
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className="inline-flex h-6 w-fit max-w-[150px] items-center justify-center truncate whitespace-nowrap rounded-full bg-[#E8F5C8] px-3 text-[10px] font-semibold text-[#1f1e30]">
                        {type}
                      </span>

                      <p className="text-xs text-[#777777]">
                        {formatRelativeTime(item.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
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
  animationIndex,
}: {
  label: string;
  value: number | string;
  icon: "layers" | "clock" | "play" | "check";
  animationIndex: number;
}) {
  const iconColor = "bg-[#F1FFCC] text-[#1f1e30]";

  return (
    <div className="flex min-w-0 items-center gap-4 rounded-xl border border-[#EEEEEE] bg-white px-5 py-4 shadow-[0_2px_10px_rgba(31,30,48,0.04)]">
      <div
        className={`dashboard-stat-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconColor}`}
        style={{ animationDelay: `${animationIndex * 120 + 120}ms` }}
      >
        <DashboardIcon name={icon} />
      </div>

      <div className="min-w-0">
        {typeof value === "number" ? (
          <p
            className="dashboard-stat-count text-[26px] font-semibold leading-tight tracking-tight text-[#1f1e30] tabular-nums"
            style={
              {
                "--stat-total": value,
                animationDelay: `${animationIndex * 120 + 180}ms`,
              } as React.CSSProperties
            }
            aria-label={String(value)}
          />
        ) : (
          <p className="text-[26px] font-semibold leading-tight tracking-tight text-[#1f1e30] tabular-nums">
            {value}
          </p>
        )}

        <p className="mt-0.5 truncate text-sm font-medium leading-tight text-[#1f1e30]">
          {label}
        </p>
      </div>
    </div>
  );
}

function DashboardIcon({
  name,
}: {
  name: "folder" | "clock" | "play" | "check" | "task" | "calendar" | "layers";
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
      width="23"
      height="23"
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

      {name === "task" && (
        <>
          <rect x="5" y="4" width="14" height="17" rx="2" />
          <path d="M9 4.5h6M8 11l2 2 5-5M8 17h8" />
        </>
      )}

      {name === "calendar" && (
        <>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M7 3v4M17 3v4M3 10h18" />
        </>
      )}

      {name === "layers" && (
        <path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5" />
      )}
    </svg>
  );
}
