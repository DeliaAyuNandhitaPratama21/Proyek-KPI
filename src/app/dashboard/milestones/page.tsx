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

function getStatusStyle(status: string) {
  switch (status) {
    case "Completed":
      return "bg-[#075C3C] text-[#6EE7B7]";

    case "In Progress":
      return "bg-yellow-500/10 text-yellow-400";

    default:
      return "bg-[#262626] text-zinc-400";
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "Completed":
      return "Selesai";
    case "In Progress":
      return "Dalam Proses";
    case "Pending":
      return "Pending";
    default:
      return status || "-";
  }
}

function formatDate(date: string | null) {
  if (!date) return "-";

  const parsedDate = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) return date;

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
}

export default async function MilestonesPage() {
  await requireRole(["Admin", "Project Manager"]);

  const supabase = await createClient();

  const { data: milestones, error } = await supabase
    .from("milestones")
    .select(
      `
        *,
        projects (
          project_name
        )
      `,
    )
    .order("due_date", { ascending: true });

  if (error) {
    return (
      <main className="min-h-screen bg-[#111111] px-5 py-6 text-white sm:px-7 lg:px-8">
        <div className="mb-8 mt-2">
          <h1 className={TEXT.pageTitle}>Milestone</h1>
          <p className={TEXT.subtitle}>
            Kelola tahapan dan tenggat waktu proyek.
          </p>
        </div>

        <div className="max-w-4xl rounded-[22px] border border-red-500/20 bg-[#1c1c1c]/80 p-5 text-sm text-red-400">
          Data tahapan proyek gagal dimuat. Silakan muat ulang halaman.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#111111] px-5 py-6 text-white sm:px-7 lg:px-8">
      {/* Header */}
      <div className="mb-8 mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className={TEXT.pageTitle}>Tahapan Proyek</h1>
          <p className={TEXT.subtitle}>
            Kelola tahapan dan tenggat waktu proyek.
          </p>
        </div>

        <Link
          href="/dashboard/milestones/new"
          className={`${TEXT.primaryButton} w-full sm:w-auto`}
        >
          Tambah Tahapan
        </Link>
      </div>

      {/* Daftar Tahapan Proyek */}
      <section className="max-w-full overflow-hidden rounded-[22px] border border-[#2a2a2a] bg-[#1c1c1c]/80">
        {/* Card Header */}
        <div className="border-b border-[#262626] px-6 py-5 sm:px-8">
          <h2 className={TEXT.sectionTitle}>Daftar Tahapan Proyek</h2>
          <p className={TEXT.subtitle}>
            {milestones?.length ?? 0} tahapan terdaftar
          </p>
        </div>

        {/* Tabel Tahapan Proyek */}
        {milestones && milestones.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px]">
              <thead>
                <tr className="border-b border-[#262626] text-left text-xs font-medium uppercase tracking-wide text-zinc-400">
                  <th className="px-6 py-4">Nama Tahapan</th>
                  <th className="px-6 py-4">Proyek</th>
                  <th className="px-6 py-4">Tenggat Waktu</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Tindakan</th>
                </tr>
              </thead>

              <tbody>
                {milestones.map((milestone) => (
                  <tr
                    key={milestone.id}
                    className="border-b border-[#262626] transition-colors last:border-b-0 hover:bg-white/[0.02]"
                  >
                    {/* Nama Tahapan */}
                    <td className="px-6 py-4">
                      <p className={TEXT.primary}>
                        <span className="block max-w-[280px] truncate">
                          {milestone.name}
                        </span>
                      </p>

                      {milestone.description && (
                        <p className="mt-1 max-w-[280px] truncate text-xs text-zinc-400">
                          {milestone.description}
                        </p>
                      )}
                    </td>

                    {/* Proyek */}
                    <td className={`px-6 py-4 ${TEXT.secondary}`}>
                      {milestone.projects?.project_name || "-"}
                    </td>

                    {/* Tenggat Waktu */}
                    <td
                      className={`whitespace-nowrap px-6 py-4 ${TEXT.secondary}`}
                    >
                      {formatDate(milestone.due_date)}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <StatusBadge status={milestone.status} />
                    </td>

                    {/* Tindakan */}
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/milestones/${milestone.id}/edit`}
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
              <MilestoneIcon />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-white">
              Belum Ada Tahapan Proyek
            </h3>

            <p className="mt-1 text-sm text-zinc-400">
              Tambahkan tahapan untuk mengatur proses pengerjaan proyek.
            </p>

            <Link
              href="/dashboard/milestones/new"
              className={`${TEXT.primaryButton} mt-5`}
            >
              Tambah Tahapan Pertama
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const isCompleted = status === "Completed";
  const isInProgress = status === "In Progress";

  const dotStyles = isCompleted
    ? "bg-[#6EE7B7]"
    : isInProgress
      ? "bg-yellow-400"
      : "bg-zinc-500";

  return (
    <span
      className={`inline-flex w-fit items-center justify-start gap-2 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${getStatusStyle(
        status || "",
      )}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotStyles}`} />
      {getStatusLabel(status || "")}
    </span>
  );
}

function MilestoneIcon() {
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
      flag
    </span>
  );
}
