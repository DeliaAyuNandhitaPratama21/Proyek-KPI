import Link from "next/link";
import { createClient } from "../../../lib/supabase/server";
import { requireRole } from "../../auth/role-guard";
import CopyPublicLink from "../../../components/copy-public-link";
import ProjectActions, { ProjectDeleteNotification, ProjectsSearch } from "./ProjectActions";

type ProjectsPageProps = {
  searchParams: Promise<{
    search?: string;
  }>;
};

const TEXT = {
  sectionTitle: "text-lg font-semibold text-[#1f1e30]",
  subtitle: "mt-1 text-sm text-[#777777]",
  primary: "text-sm font-medium text-[#1f1e30]",
  secondary: "text-sm text-[#555563]",
  primaryButton:
    "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#B7FE1A] px-4 text-sm font-[500] text-[#1f1e30] transition-colors hover:bg-[#a8ed12] sm:w-[130px]",
  secondaryButton:
    "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1f1e30] px-4 text-sm font-[500] text-white transition-colors hover:bg-[#333247] sm:w-[130px]",
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
  status: string | null | undefined,
): DeadlineInfo | null {
  if (!deadline) return null;

  // Proyek selesai tidak dihitung terlambat.
  if (status?.trim().toLowerCase() === "selesai") {
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

export default async function ProjectsPage({
  searchParams,
}: ProjectsPageProps) {
  const profile = await requireRole(["Admin", "Project Manager", "Staff"]);

  const supabase = await createClient();

  const params = await searchParams;
  const search = params.search?.trim() || "";
  const keyword = search.replace(/[,%()]/g, "").trim();

  // Semua role dapat melihat seluruh proyek aktif.
  let query = supabase
    .from("projects")
    .select(
      `
      *,
      clients:clients!projects_client_id_fkey (
        company_name
      ),
      project_statuses (
        name
      ),
      project_manager:users!projects_pic_id_fkey (
        name
      ),
      staff_pic:users!projects_pic_fkey (
        name
      ),
      tasks (
        status
      )
    `,
    )
    .eq("is_archived", false);

  if (keyword) {
    // Cari ID relasi yang cocok agar seluruh pencarian dapat dilakukan
    // langsung melalui query Supabase, termasuk nama klien, status,
    // Project Manager, dan Staff PIC.
    const pattern = `%${keyword}%`;

    const [
      { data: matchingUsers, error: usersError },
      { data: matchingClients, error: clientsError },
      { data: matchingStatuses, error: statusesError },
    ] = await Promise.all([
      supabase.from("users").select("id").ilike("name", pattern),
      supabase.from("clients").select("id").ilike("company_name", pattern),
      supabase.from("project_statuses").select("id").ilike("name", pattern),
    ]);

    if (usersError || clientsError || statusesError) {
      console.error("Gagal mencari data relasi proyek:", {
        usersError,
        clientsError,
        statusesError,
      });

      return (
        <main className="min-h-screen bg-[#f7f7f5] px-5 py-6 text-[#1f1e30] sm:px-7 lg:px-8">
          <div className="max-w-4xl rounded-2xl border border-red-200 bg-white p-5 text-sm text-red-600">
            Pencarian proyek gagal dilakukan. Silakan muat ulang halaman.
          </div>
        </main>
      );
    }

    const matchingUserIds = (matchingUsers ?? []).map((user) => user.id);
    const matchingClientIds = (matchingClients ?? []).map(
      (client) => client.id,
    );
    const matchingStatusIds = (matchingStatuses ?? []).map(
      (status) => status.id,
    );

    const filters = [
      `project_name.ilike.${pattern}`,
      `project_type.ilike.${pattern}`,
    ];

    if (matchingClientIds.length > 0) {
      filters.push(`client_id.in.(${matchingClientIds.join(",")})`);
    }

    if (matchingStatusIds.length > 0) {
      filters.push(`status_id.in.(${matchingStatusIds.join(",")})`);
    }

    if (matchingUserIds.length > 0) {
      filters.push(`pic_id.in.(${matchingUserIds.join(",")})`);
      filters.push(`pic.in.(${matchingUserIds.join(",")})`);
    }

    query = query.or(filters.join(","));
  }

  const { data: projects, error } = await query.order("created_at", {
    ascending: false,
  });

  if (error) {
    console.error("Gagal memuat proyek:", error);

    return (
      <main className="min-h-screen bg-[#f7f7f5] px-5 py-6 text-[#1f1e30] sm:px-7 lg:px-8">
        <div className="max-w-4xl rounded-2xl border border-red-200 bg-white p-5 text-sm text-red-600">
          Data proyek gagal dimuat. Silakan muat ulang halaman.
        </div>
      </main>
    );
  }

  const filteredProjects = projects ?? [];

  const isStaff = profile.role === "Staff";
  const isAdmin = profile.role === "Admin";
  const canManage = isAdmin || profile.role === "Project Manager";

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-5 py-6 text-[#1f1e30] sm:px-7 lg:px-8">
      <ProjectDeleteNotification />
      {/* HEADER */}
      <div className="mb-8 mt-2 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* SEARCH */}
        <ProjectsSearch search={search} />

        {/* TOMBOL AKSI */}
        {canManage && (
          <div className="flex flex-col gap-2 sm:flex-row">
            {isAdmin && (
              <Link
                href="/dashboard/projects/archive"
                className={TEXT.secondaryButton}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="4" width="18" height="4" rx="1" />
                  <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
                  <path d="M10 12h4" />
                </svg>
                Arsip
              </Link>
            )}

            <Link href="/dashboard/projects/new" className={TEXT.primaryButton}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              Tambah
            </Link>
          </div>
        )}
      </div>

      {/* DAFTAR PROYEK */}
      <section className="max-w-full overflow-hidden rounded-2xl border border-[#EEEEEE] bg-white shadow-[0_2px_10px_rgba(31,30,48,0.04)]">
        <div className="border-b border-[#EEEEEE] px-5 py-5 sm:px-6">
          <h2 className={TEXT.sectionTitle}>Daftar Proyek</h2>

          <p className={TEXT.subtitle}>
            {filteredProjects.length} proyek terdaftar
          </p>
        </div>

        {filteredProjects.length > 0 ? (
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-[#D6D3D1] scrollbar-track-transparent hover:scrollbar-thumb-[#A8A8A8]">
            <table
              className={`w-full ${
                isStaff ? "min-w-[1050px]" : "min-w-[1150px]"
              } border-collapse text-left`}
            >
              <thead>
                <tr className="border-b border-[#EEEEEE] bg-[#fafaf9] text-left text-xs font-semibold uppercase tracking-wide text-[#777777]">
                  <th className="w-[360px] min-w-[360px] whitespace-nowrap px-7 py-4">
                    Nama Proyek
                  </th>
                  <th className="whitespace-nowrap px-7 py-4">Nama Klien</th>
                  <th className="whitespace-nowrap px-7 py-4">PIC</th>
                  <th className="whitespace-nowrap px-7 py-4">Status Proyek</th>
                  <th className="px-7 py-4">Progres</th>
                  <th className="whitespace-nowrap px-7 py-4">Tenggat Waktu</th>
                  <th className="whitespace-nowrap px-7 py-4">Visibilitas</th>
                  <th className="px-7 py-4">Tautan Publik</th>
                  {!isStaff && (
                    <th className="px-7 py-4 text-center">Tindakan</th>
                  )}
                </tr>
              </thead>

              <tbody>
                {filteredProjects.map((project) => {
                  const statusRelation = project.project_statuses;

                  const projectStatus = Array.isArray(statusRelation)
                    ? statusRelation[0]?.name
                    : statusRelation?.name;

                  const deadlineInfo = getDeadlineInfo(
                    project.deadline,
                    projectStatus,
                  );

                  const projectTasks = Array.isArray(project.tasks)
                    ? project.tasks
                    : [];

                  const completedTasks = projectTasks.filter(
                    (task: { status: string | null }) => {
                      const taskStatus = task.status?.trim().toLowerCase();

                      return (
                        taskStatus !== undefined &&
                        taskStatus !== null &&
                        ["done", "selesai", "completed"].includes(taskStatus)
                      );
                    },
                  ).length;

                  const progress =
                    projectTasks.length > 0
                      ? Math.round((completedTasks / projectTasks.length) * 100)
                      : 0;

                  return (
                    <tr
                      key={project.id}
                      className="border-b border-[#EEEEEE] last:border-b-0"
                    >
                      {/* NAMA PROYEK */}
                      <td className="w-[360px] min-w-[360px] px-7 py-4">
                        <p className="line-clamp-2 text-sm font-medium text-[#1f1e30]">
                          {project.project_name || "-"}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {project.project_type || "-"}
                        </p>
                      </td>

                      {/* KLIEN */}
                      <td className={`px-7 py-4 ${TEXT.secondary}`}>
                        {Array.isArray(project.clients)
                          ? project.clients[0]?.company_name || "-"
                          : project.clients?.company_name || "-"}
                      </td>

                      {/* PIC PROYEK */}
                      <td className="whitespace-nowrap px-7 py-4">
                        <div className="flex flex-col gap-2">
                          {(() => {
                            const manager = Array.isArray(project.project_manager)
                              ? project.project_manager[0]
                              : project.project_manager;
                            const staff = Array.isArray(project.staff_pic)
                              ? project.staff_pic[0]
                              : project.staff_pic;

                            return (
                              <>
                                <div>
                                  <p className="text-sm font-medium text-[#1f1e30]">
                                    {manager?.name || "-"}
                                  </p>
                                  {manager?.role && (
                                    <p className="mt-0.5 text-xs text-[#777777]">
                                      {manager.role}
                                    </p>
                                  )}
                                </div>
                                {staff?.name && (
                                  <div>
                                    <p className="text-sm font-medium text-[#1f1e30]">
                                      {staff.name}
                                    </p>
                                    {staff.role && (
                                      <p className="mt-0.5 text-xs text-[#777777]">
                                        {staff.role}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </td>

                      {/* STATUS PROYEK */}
                      <td className="px-7 py-4">
                        <ProjectStatusBadge status={projectStatus} />
                      </td>

                      {/* PROGRES */}
                      <td className="px-7 py-4">
                        <div className="w-32">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <span className="text-xs text-[#777777]">
                              Progres
                            </span>

                            <span className="text-xs font-medium text-[#1f1e30]">
                              {progress}%
                            </span>
                          </div>

                          <div className="h-1.5 overflow-hidden rounded-full bg-[#EEEEEE]">
                            <div
                              className="h-full rounded-full bg-[#B7FE1A] transition-all"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(0, progress),
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* TENGGAT WAKTU */}
                      <td className="px-7 py-4">
                        <div className="flex flex-col items-start gap-2">
                          <span className="whitespace-nowrap text-left text-xs text-[#555563]">
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

                      {/* VISIBILITAS */}
                      <td className="whitespace-nowrap px-7 py-4">
                        <span
                          className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium text-[#1f1e30] ${
                            project.public_visibility
                              ? "bg-[#f1ffcc]"
                              : "bg-[#F5F5F4]"
                          }`}
                        >
                          {project.public_visibility ? "Klien" : "Internal"}
                        </span>
                      </td>

                      {/* TAUTAN PUBLIK */}
                      <td className="px-7 py-4">
                        {project.public_visibility && project.public_token ? (
                          <div className="flex items-center gap-2">
                            <a
                              href={`/project/${project.public_token}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-[#1f1e30] px-3 py-1.5 text-sm font-normal text-white transition-colors hover:bg-[#333247]"
                            >
                              Buka
                            </a>

                            <CopyPublicLink token={project.public_token} />
                          </div>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-[#F5F5F4] px-3 py-1 text-xs font-medium text-[#777777]">
                            Nonaktif
                          </span>
                        )}
                      </td>

                      {/* TINDAKAN */}
                      {!isStaff && (
                        <td
                          className={`px-7 py-4 ${isAdmin ? "" : "text-center"}`}
                        >
                          <div className={isAdmin ? "" : "flex justify-center"}>
                            <ProjectActions
                              projectId={project.id}
                              projectName={
                                project.project_name || "Proyek tanpa nama"
                              }
                              canDelete={
                                isAdmin ||
                                (profile.role === "Project Manager" &&
                                  project.pic_id === profile.id)
                              }
                              canArchive={isAdmin}
                            />
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            className={`flex flex-col items-center justify-center px-5 py-13 text-center ${
              isStaff ? "min-h-[254px]" : ""
            }`}
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#F1FFCC]">
              <ProjectIcon />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-[#1f1e30]">
              {search ? "Proyek Tidak Ditemukan" : "Belum Ada Proyek"}
            </h3>

            <p className="mt-1 text-sm text-[#777777]">
              {search
                ? "Tidak ada proyek yang sesuai dengan pencarian."
                : "Belum ada proyek yang terdaftar untuk ditampilkan."}
            </p>

            {!search && canManage && (
              <Link
                href="/dashboard/projects/new"
                className="mt-5 inline-flex items-center justify-center whitespace-nowrap text-sm font-medium text-[#65A30D] transition-colors hover:text-[#4D7C0F]"
              >
                Tambah Proyek Pertama
              </Link>
            )}
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
    overdue: "bg-[#fce2d3] text-[#1f1e30]",
    today: "bg-[#feefd2] text-[#1f1e30]",
    upcoming: "bg-[#E8F5C8] text-[#1f1e30]",
    completed: "bg-[#DCE8F2] text-[#1f1e30]",
  };

  return (
    <span
      className={`inline-flex h-6 w-fit shrink-0 items-center justify-center whitespace-nowrap rounded-full px-4 text-center text-[10px] font-semibold ${styles[type]}`}
    >
      {label}
    </span>
  );
}

function ProjectStatusBadge({ status }: { status: string | null | undefined }) {
  const normalizedStatus = status?.toLowerCase().trim() ?? "";

  const statusStyles: Record<string, string> = {
    "menunggu antrian": "bg-[#e2e8e0]",
    berjalan: "bg-[#f1ffcc]",
    ditunda: "bg-[#feefd2]",
    selesai: "bg-[#DCE8F2]",
  };

  const badgeColor = statusStyles[normalizedStatus] ?? "bg-[#F5F5F4]";

  return (
    <span
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-1 text-xs font-medium text-[#1f1e30] ${badgeColor}`}
    >
      {status || "-"}
    </span>
  );
}

function ProjectIcon() {
  return (
    <span
      className="material-symbols-outlined"
      aria-hidden="true"
      style={{
        fontSize: "22px",
        color: "#1f1e30",
        fontWeight: 400,
        lineHeight: 1,
        fontFeatureSettings: '"liga"',
      }}
    >
      folder_open
    </span>
  );
}
