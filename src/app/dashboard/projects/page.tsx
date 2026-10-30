import Link from "next/link";
import { createClient } from "../../../lib/supabase/server";
import { requireRole } from "../../auth/role-guard";
import CopyPublicLink from "../../../components/copy-public-link";
import ProjectActions from "./ProjectActions";

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

const STATUS = {
  COMPLETED: 11,
};

type DeadlineInfo = {
  label: string;
  type: "overdue" | "today" | "upcoming" | "completed";
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

function getDeadlineInfo(
  deadline: string | null | undefined,
  statusId: number | null | undefined,
): DeadlineInfo | null {
  if (!deadline) return null;

  // Proyek selesai tidak dihitung terlambat.
  if (statusId === STATUS.COMPLETED) {
    return {
      label: "Selesai",
      type: "completed",
    };
  }

  const today = getJakartaDateKey();
  const deadlineDate = deadline.slice(0, 10);

  const [todayYear, todayMonth, todayDay] = today.split("-").map(Number);
  const [deadlineYear, deadlineMonth, deadlineDay] = deadlineDate
    .split("-")
    .map(Number);

  const todayTime = Date.UTC(todayYear, todayMonth - 1, todayDay);
  const deadlineTime = Date.UTC(deadlineYear, deadlineMonth - 1, deadlineDay);

  const difference = Math.round((deadlineTime - todayTime) / 86400000);

  if (difference < 0) {
    return {
      label: `Terlambat ${Math.abs(difference)} hari`,
      type: "overdue",
    };
  }

  if (difference === 0) {
    return {
      label: "Deadline hari ini",
      type: "today",
    };
  }

  return {
    label: `${difference} hari lagi`,
    type: "upcoming",
  };
}

export default async function ProjectsPage() {
  const profile = await requireRole(["Admin", "Project Manager", "Staff"]);

  const supabase = await createClient();

  const { data: projects, error } = await supabase
    .from("projects")
    .select(
      `
      *,
      clients (
        company_name
      ),
      project_statuses (
        name
      )
    `,
    )
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    return (
      <main className="min-h-screen bg-[#111111] px-5 py-6 text-white sm:px-7 lg:px-8">
        <div className="mb-8 mt-2">
          <h1 className={TEXT.pageTitle}>Data Proyek</h1>
          <p className={TEXT.subtitle}>
            Kelola proyek pengembangan website klien
          </p>
        </div>

        <div className="max-w-4xl rounded-[22px] border border-red-500/20 bg-[#1c1c1c]/80 p-5 text-sm text-red-400">
          Data proyek gagal dimuat. Silakan muat ulang halaman.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#111111] px-5 py-6 text-white sm:px-7 lg:px-8">
      {/* HEADER */}
      <div className="mb-8 mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className={TEXT.pageTitle}>Data Proyek</h1>
          <p className={TEXT.subtitle}>
            Kelola proyek pengembangan website klien
          </p>
        </div>

        <Link
          href="/dashboard/projects/new"
          className={`${TEXT.primaryButton} w-full sm:w-auto`}
        >
          Tambah Proyek
        </Link>
      </div>

      {/* DAFTAR PROYEK */}
      <section className="max-w-full overflow-hidden rounded-[22px] border border-[#2a2a2a] bg-[#1c1c1c]/80">
        <div className="border-b border-[#262626] px-6 py-5 sm:px-8">
          <h2 className={TEXT.sectionTitle}>Daftar Proyek</h2>
          <p className={TEXT.subtitle}>
            {projects?.length ?? 0} proyek terdaftar
          </p>
        </div>

        {projects && projects.length > 0 ? (
          <div className="projects-scrollbar overflow-x-auto">
            <table className="w-full min-w-[1050px]">
              <thead>
                <tr className="border-b border-[#262626] text-left text-xs font-medium uppercase tracking-wide text-zinc-400">
                  <th className="px-6 py-4">Nama Proyek</th>
                  <th className="px-6 py-4">Nama Klien</th>
                  <th className="px-6 py-4">Status Proyek</th>
                  <th className="px-6 py-4">Progres</th>
                  <th className="px-6 py-4">Tenggat Waktu</th>
                  <th className="px-6 py-4">Tautan Publik</th>
                  <th className="px-6 py-4">Tindakan</th>
                </tr>
              </thead>

              <tbody>
                {projects.map((project) => {
                  const statusRelation = project.project_statuses;
                  const projectStatus = Array.isArray(statusRelation)
                    ? statusRelation[0]?.name
                    : statusRelation?.name;

                  const deadlineInfo = getDeadlineInfo(
                    project.deadline,
                    project.status_id,
                  );

                  return (
                    <tr
                      key={project.id}
                      className="border-b border-[#262626] transition-colors last:border-b-0 hover:bg-white/[0.02]"
                    >
                      {/* NAMA PROYEK */}
                      <td className="px-6 py-4">
                        <p className={TEXT.primary}>
                          {project.project_name || "-"}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {project.project_type || "-"}
                        </p>
                      </td>

                      {/* KLIEN */}
                      <td className={`px-6 py-4 ${TEXT.secondary}`}>
                        {Array.isArray(project.clients)
                          ? project.clients[0]?.company_name || "-"
                          : project.clients?.company_name || "-"}
                      </td>

                      {/* STATUS TAHAP PROYEK */}
                      <td className="px-6 py-4">
                        <ProjectStatusBadge status={projectStatus} />
                      </td>

                      {/* PROGRES */}
                      <td className="px-6 py-4">
                        <div className="w-32">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <span className="text-xs text-zinc-400">
                              Progres
                            </span>
                            <span className="text-xs font-medium text-white">
                              {project.progress ?? 0}%
                            </span>
                          </div>

                          <div className="h-1.5 overflow-hidden rounded-full bg-[#333333]">
                            <div
                              className="h-full rounded-full bg-[#B7FE1A] transition-all"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(0, Number(project.progress ?? 0)),
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* TENGGAT WAKTU */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-start gap-2">
                          <span className={TEXT.secondary}>
                            {project.deadline
                              ? new Date(
                                  `${String(project.deadline).slice(0, 10)}T00:00:00Z`,
                                ).toLocaleDateString("id-ID", {
                                  timeZone: "UTC",
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "-"}
                          </span>

                          {deadlineInfo && (
                            <DeadlineBadge
                              label={deadlineInfo.label}
                              type={deadlineInfo.type}
                            />
                          )}
                        </div>
                      </td>

                      {/* TAUTAN PUBLIK */}
                      <td className="px-6 py-4">
                        {project.public_visibility && project.public_token ? (
                          <div className="flex items-center gap-2">
                            <a
                              href={`/project/${project.public_token}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center rounded-lg border border-[#333333] px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-[#B7FE1A] hover:text-[#B7FE1A]"
                            >
                              Buka
                            </a>

                            <CopyPublicLink token={project.public_token} />
                          </div>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-[#262626] px-3 py-1 text-xs font-medium text-zinc-500">
                            Nonaktif
                          </span>
                        )}
                      </td>

                      {/* TINDAKAN */}
                      <td className="px-6 py-4">
                        <ProjectActions
                          projectId={project.id}
                          projectName={
                            project.project_name || "Proyek tanpa nama"
                          }
                          canDelete={profile.role === "Admin"}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#262626]">
              <ProjectIcon />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-white">
              Belum Ada Proyek
            </h3>

            <p className="mt-1 text-sm text-zinc-400">
              Tambahkan proyek untuk mulai memantau progres pekerjaan klien.
            </p>

            <Link
              href="/dashboard/projects/new"
              className={`${TEXT.primaryButton} mt-5`}
            >
              Tambah Proyek Pertama
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

function DeadlineBadge({
  label,
  type,
}: {
  label: string;
  type: "overdue" | "today" | "upcoming" | "completed";
}) {
  const styles = {
    overdue: "bg-[#451D26] text-[#FF7185]",
    today: "bg-[#49351A] text-[#FFC46B]",
    upcoming: "bg-[#202D24] text-[#86D9A1]",
    completed: "bg-[#075C3C] text-[#6EE7B7]",
  };

  const dots = {
    overdue: "bg-[#FF4567]",
    today: "bg-[#FFC46B]",
    upcoming: "bg-[#86D9A1]",
    completed: "bg-[#6EE7B7]",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${styles[type]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dots[type]}`} />
      {label}
    </span>
  );
}

function ProjectStatusBadge({ status }: { status: string | null | undefined }) {
  const normalizedStatus = status?.toLowerCase().trim() ?? "";

  const isCompleted =
    normalizedStatus.includes("completed") ||
    normalizedStatus.includes("selesai");

  const isActive =
    normalizedStatus.includes("progress") ||
    normalizedStatus.includes("berjalan") ||
    normalizedStatus.includes("active");

  const badgeClass = isCompleted
    ? "bg-[#075C3C] text-[#6EE7B7]"
    : isActive
      ? "bg-[#343B19] text-[#B7FE1A]"
      : "bg-[#262626] text-zinc-400";

  const dotClass = isCompleted
    ? "bg-[#6EE7B7]"
    : isActive
      ? "bg-[#B7FE1A]"
      : "bg-zinc-500";

  return (
    <span
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${badgeClass}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />
      {status || "-"}
    </span>
  );
}

function ProjectIcon() {
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
      folder_open
    </span>
  );
}