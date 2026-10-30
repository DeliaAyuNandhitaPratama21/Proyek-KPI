import Link from "next/link";
import { createClient } from "../../../lib/supabase/server";
import { requireRole } from "../../auth/role-guard";

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

export default async function TasksPage() {
  await requireRole(["Admin", "Project Manager", "Staff"]);

  const supabase = await createClient();

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select(
      `
      *,
      projects (
        project_name
      ),
      milestones (
        name
      )
    `,
    )
    .order("deadline", { ascending: true });

  if (error) {
    return (
      <main className="min-h-screen bg-[#111111] px-5 py-6 text-white sm:px-7 lg:px-8">
        <div className="mb-8 mt-2">
          <h1 className={TEXT.pageTitle}>Tasks</h1>
          <p className={TEXT.subtitle}>
            Kelola tugas, penanggung jawab, prioritas, dan deadline proyek.
          </p>
        </div>

        <div className="max-w-4xl rounded-[22px] border border-red-500/20 bg-[#1c1c1c]/80 p-5 text-sm text-red-400">
          Data task gagal dimuat. Silakan muat ulang halaman.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#111111] px-5 py-6 text-white sm:px-7 lg:px-8">
      {/* Header */}
      <div className="mb-8 mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className={TEXT.pageTitle}>Tugas</h1>
          <p className={TEXT.subtitle}>
            Kelola tugas, penanggung jawab, prioritas, dan deadline proyek.
          </p>
        </div>

        {/* Tombol tanpa ikon + */}
        <Link
          href="/dashboard/tasks/new"
          className={`${TEXT.primaryButton} w-full sm:w-auto`}
        >
          Tambah Tugas
        </Link>
      </div>

      {/* Daftar Task */}
      <section className="max-w-full overflow-hidden rounded-[22px] border border-[#2a2a2a] bg-[#1c1c1c]/80">
        {/* Card Header */}
        <div className="border-b border-[#262626] px-6 py-5 sm:px-8">
          <h2 className={TEXT.sectionTitle}>Daftar Tugas</h2>
          <p className={TEXT.subtitle}>{tasks?.length ?? 0} task terdaftar</p>
        </div>

        {/* Tabel Task */}
        {tasks && tasks.length > 0 ? (
          <div className="tasks-scrollbar overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="border-b border-[#262626] text-left text-xs font-medium uppercase tracking-wide text-zinc-400">
                  <th className="px-6 py-4">Tugas</th>
                  <th className="px-6 py-4">Proyek</th>
                  <th className="px-6 py-4">Tahapan Proyek</th>
                  <th className="px-6 py-4">Prioritas</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Tenggat Waktu</th>
                  <th className="px-6 py-4">Visibilitas Klien</th>
                  <th className="px-6 py-4">Tindakan</th>
                </tr>
              </thead>

              <tbody>
                {tasks.map((task) => (
                  <tr
                    key={task.id}
                    className="border-b border-[#262626] transition-colors last:border-b-0 hover:bg-white/[0.02]"
                  >
                    {/* Task */}
                    <td className="px-6 py-4">
                      <p className={TEXT.primary}>
                        <span className="block max-w-[240px] truncate">
                          {task.title}
                        </span>
                      </p>

                      {task.description && (
                        <p className="mt-1 max-w-[240px] truncate text-xs text-zinc-400">
                          {task.description}
                        </p>
                      )}
                    </td>

                    {/* Proyek */}
                    <td className={`px-6 py-4 ${TEXT.secondary}`}>
                      {task.projects?.project_name || "-"}
                    </td>

                    {/* Milestone */}
                    <td className={`px-6 py-4 ${TEXT.secondary}`}>
                      {task.milestones?.name || "-"}
                    </td>

                    {/* Prioritas */}
                    <td className="px-6 py-4">
                      <PriorityBadge priority={task.priority} />
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <StatusBadge status={task.status} />
                    </td>

                    {/* Deadline */}
                    <td
                      className={`whitespace-nowrap px-6 py-4 ${TEXT.secondary}`}
                    >
                      {task.deadline || "-"}
                    </td>

                    {/* Visibilitas */}
                    <td className="px-6 py-4">
                      <VisibilityBadge visible={task.client_visible} />
                    </td>

                    {/* Tindakan */}
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/tasks/${task.id}/edit`}
                        className={TEXT.action}
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Empty State */
          <div className="px-5 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#262626]">
              <TaskIcon />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-white">
              Belum Ada Task
            </h3>

            <p className="mt-1 text-sm text-zinc-400">
              Tambahkan task untuk mulai mengelola pekerjaan proyek.
            </p>

            {/* Tombol tanpa ikon + */}
            <Link
              href="/dashboard/tasks/new"
              className={`${TEXT.primaryButton} mt-5`}
            >
              Tambah Task Pertama
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

function PriorityBadge({ priority }: { priority: string | null }) {
  const styles =
    priority === "High"
      ? "bg-red-500/10 text-red-400"
      : priority === "Medium"
        ? "bg-yellow-500/10 text-yellow-400"
        : "bg-[#262626] text-zinc-400";

  const label =
    priority === "High"
      ? "Tinggi"
      : priority === "Medium"
        ? "Sedang"
        : priority === "Low"
          ? "Rendah"
          : priority || "-";

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${styles}`}
    >
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const isCompleted = status === "Completed";
  const isInProgress = status === "In Progress";

  const label =
    status === "Completed"
      ? "Selesai"
      : status === "In Progress"
        ? "Dalam Proses"
        : status === "Todo"
          ? "Belum Dimulai"
          : status || "-";

  const styles = isCompleted
    ? "bg-[#075C3C] text-[#6EE7B7]"
    : isInProgress
      ? "bg-yellow-500/10 text-yellow-400"
      : "bg-[#262626] text-zinc-400";

  const dotStyles = isCompleted
    ? "bg-[#6EE7B7]"
    : isInProgress
      ? "bg-yellow-400"
      : "bg-zinc-500";

  return (
    <span
      className={`inline-flex min-w-[112px] items-center justify-start gap-2 rounded-full px-3 py-1 text-xs font-medium ${styles}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotStyles}`} />
      {label}
    </span>
  );
}

function VisibilityBadge({ visible }: { visible: boolean | null }) {
  return (
    <span
      className={`inline-flex min-w-[100px] items-center justify-center rounded-full px-3 py-1 text-xs font-medium ${
        visible ? "bg-[#075C3C] text-[#6EE7B7]" : "bg-[#262626] text-zinc-400"
      }`}
    >
      {visible ? "Client" : "Internal"}
    </span>
  );
}

function TaskIcon() {
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
      task_alt
    </span>
  );
}