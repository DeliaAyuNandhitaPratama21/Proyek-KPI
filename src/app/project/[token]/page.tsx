import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import { createAdminClient } from "../../../lib/supabase/admin";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Detail Proyek | Enika",
  robots: {
    index: false,
    follow: false,
  },
};

type PublicProjectPageProps = {
  params: Promise<{
    token: string;
  }>;
};

function formatDate(date: string | null) {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatFileSize(size: number | null) {
  if (size == null || size < 0) return "-";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isBriefStatus(status: string | null) {
  return status?.trim().toLowerCase() === "brief";
}

function getStatusClass(status: string | null) {
  const normalized = status?.trim().toLowerCase() ?? "";

  const statusStyles: Record<string, string> = {
    "menunggu antrian": "bg-[#e2e8e0] text-[#1f1e30]",
    "belum dimulai": "bg-[#e2e8e0] text-[#1f1e30]",
    pending: "bg-[#e2e8e0] text-[#1f1e30]",
    "not started": "bg-[#e2e8e0] text-[#1f1e30]",
    berjalan: "bg-[#f1ffcc] text-[#1f1e30]",
    "in progress": "bg-[#f1ffcc] text-[#1f1e30]",
    ditunda: "bg-[#feefd2] text-[#1f1e30]",
    "on hold": "bg-[#feefd2] text-[#1f1e30]",
    selesai: "bg-[#DCE8F2] text-[#1f1e30]",
    completed: "bg-[#DCE8F2] text-[#1f1e30]",
    complete: "bg-[#DCE8F2] text-[#1f1e30]",
    done: "bg-[#DCE8F2] text-[#1f1e30]",
  };

  return statusStyles[normalized] ?? "bg-[#F5F5F4] text-[#1f1e30]";
}

function getStatusLabel(status: string | null) {
  if (!status) return "Belum ada status";

  const normalized = status.trim().toLowerCase();

  const translations: Record<string, string> = {
    pending: "Belum Dimulai",
    "not started": "Belum Dimulai",
    "in progress": "Berjalan",
    berjalan: "Berjalan",
    completed: "Selesai",
    selesai: "Selesai",
    done: "Selesai",
    "on hold": "Ditunda",
    ditunda: "Ditunda",
  };

  return translations[normalized] || status;
}

function StatusBadge({ status }: { status: string | null }) {
  if (isBriefStatus(status)) {
    return <span className="text-xs font-medium text-[#1f1e30]">{status}</span>;
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full px-4 py-1 text-xs font-medium ${getStatusClass(
        status,
      )}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#EEEEEE] px-5 py-7 text-center">
      <p className="text-sm text-[#777777]">{text}</p>
    </div>
  );
}

export default async function PublicProjectPage({
  params,
}: PublicProjectPageProps) {
  const { token } = await params;
  const supabase = await createClient();

  // MENGAMBIL DATA PROYEK
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select(
      `
      id,
      project_name,
      project_type,
      description,
      start_date,
      deadline,
      clients (
        company_name,
        contact_person
      ),
      project_statuses (
        name
      )
    `,
    )
    .eq("public_token", token)
    .eq("public_visibility", true)
    .maybeSingle();

  if (projectError || !project) {
    notFound();
  }

  // Token publik sudah tervalidasi. Ambil status seluruh tugas hanya untuk
  // menghitung progress keseluruhan; detail tugas internal tidak ditampilkan.
  const adminSupabase = createAdminClient();

  const { data: allTasks, error: allTasksError } = await adminSupabase
    .from("tasks")
    .select("status")
    .eq("project_id", project.id);

  if (allTasksError) {
    console.error("Gagal menghitung progress proyek:", {
      message: allTasksError.message,
      code: allTasksError.code,
      details: allTasksError.details,
      hint: allTasksError.hint,
    });

    throw new Error("Gagal menghitung progress proyek.");
  }

  // MENGAMBIL MILESTONE YANG DAPAT DILIHAT KLIEN
  const { data: milestones, error: milestonesError } = await supabase
    .from("milestones")
    .select(
      `
      id,
      name,
      description,
      due_date,
      status,
      client_visible
    `,
    )
    .eq("project_id", project.id)
    .eq("client_visible", true)
    .order("sort_order", { ascending: true });

  if (milestonesError) {
    console.error("Gagal memuat milestone proyek:", milestonesError);
    throw new Error("Gagal memuat milestone proyek.");
  }

  // MENGAMBIL TUGAS YANG DAPAT DILIHAT KLIEN
  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select(
      `
      id,
      title,
      description,
      status,
      deadline,
      client_visible
    `,
    )
    .eq("project_id", project.id)
    .eq("client_visible", true)
    .order("deadline", { ascending: true });

  if (tasksError) {
    console.error("Gagal memuat tugas proyek:", tasksError);
    throw new Error("Gagal memuat daftar tugas proyek.");
  }

  // MENGAMBIL PEMBARUAN PROYEK YANG DAPAT DILIHAT KLIEN
  const { data: updates, error: updatesError } = await supabase
    .from("project_updates")
    .select(
      `
      id,
      title,
      content,
      client_visible,
      created_at
    `,
    )
    .eq("project_id", project.id)
    .eq("client_visible", true)
    .order("created_at", { ascending: false });

  if (updatesError) {
    console.error("Gagal memuat pembaruan proyek:", updatesError);
    throw new Error("Gagal memuat pembaruan proyek.");
  }

  // MENGAMBIL FILE BERDASARKAN TOKEN PROYEK
  // RPC memvalidasi token dan hanya mengembalikan file yang boleh dilihat klien.
  const { data: publicFiles, error: publicFilesError } = await supabase.rpc(
    "get_public_project_files",
    {
      p_token: token,
    },
  );

  if (publicFilesError) {
    console.error("Gagal memvalidasi file publik:", publicFilesError);
    throw new Error("Gagal memuat berkas proyek.");
  }

  const publicFileIds = (publicFiles || []).map(
    (file: { id: number }) => file.id,
  );

  let filesWithUrl: {
    id: number;
    file_name: string;
    storage_path: string;
    mime_type: string | null;
    file_size: number | null;
    task_id: number | null;
    client_visible: boolean;
    created_at: string;
    signedUrl: string | null;
  }[] = [];

  if (publicFileIds.length > 0) {
    // Admin client hanya digunakan di server setelah token proyek tervalidasi.
    const { data: files, error: filesError } = await adminSupabase
      .from("files")
      .select(
        `
        id,
        file_name,
        storage_path,
        mime_type,
        file_size,
        task_id,
        client_visible,
        created_at
        `,
      )
      .eq("project_id", project.id)
      .eq("client_visible", true)
      .in("id", publicFileIds)
      .order("created_at", { ascending: false });

    if (filesError) {
      console.error("Gagal memuat metadata file:", filesError);
      throw new Error("Gagal memuat berkas proyek.");
    }

    filesWithUrl = await Promise.all(
      (files || []).map(async (file) => {
        const { data, error } = await adminSupabase.storage
          .from("project-files")
          .createSignedUrl(file.storage_path, 300, {
            download: file.file_name,
          });

        if (error) {
          console.error(
            `Gagal membuat link unduhan ${file.file_name}:`,
            error.message,
          );
        }

        return {
          ...file,
          signedUrl: data?.signedUrl ?? null,
        };
      }),
    );
  }

  // MENGAMBIL RELASI KLIEN
  const client = Array.isArray(project.clients)
    ? project.clients[0]
    : project.clients;

  // MENGAMBIL STATUS PROYEK
  const projectStatus = Array.isArray(project.project_statuses)
    ? project.project_statuses[0]
    : project.project_statuses;

  // MENGHITUNG PROGRESS KESELURUHAN BERDASARKAN SEMUA TUGAS PROYEK.
  // Detail tugas internal tetap tidak ditampilkan kepada klien.
  const totalTasks = allTasks?.length ?? 0;

  const completedTasks = (allTasks ?? []).filter((task) =>
    ["selesai", "completed", "complete", "done"].includes(
      task.status?.trim().toLowerCase() ?? "",
    ),
  ).length;

  const progress =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // MEMERIKSA KETERLAMBATAN
  const isOverdue =
    project.deadline &&
    new Date(project.deadline).getTime() <
      new Date(new Date().toDateString()).getTime() &&
    progress < 100;

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#1f1e30] antialiased">
      {/* HEADER */}
      <header className="border-b border-[#EEEEEE] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
          <Image
            src="/images/enika%20logo%20hitam.png"
            alt="Enika"
            width={120}
            height={40}
            className="h-8 w-auto object-contain"
            priority
          />
          <span className="text-xs font-medium tracking-wide text-[#777777] sm:text-sm">
            PORTAL MONITORING PROYEK
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
        {/* PROJECT HERO */}
        <section className="mb-6 overflow-hidden rounded-2xl bg-[#1f1e30] p-5 text-white shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="min-w-0 flex-1">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full px-4 py-1 text-xs font-medium ${
                    ["berjalan", "in progress"].includes(
                      projectStatus?.name?.trim().toLowerCase() ?? "",
                    )
                      ? "bg-[#B7FE1A] text-[#1f1e30]"
                      : getStatusClass(projectStatus?.name ?? null)
                  }`}
                >
                  {projectStatus?.name || "Proyek"}
                </span>
                {isOverdue && (
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white">
                    Terlambat
                  </span>
                )}
              </div>
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-white/55">
                Monitoring Proyek
              </p>
              <h1 className="max-w-4xl break-words text-2xl font-semibold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
                {project.project_name}
              </h1>
              <p className="mt-3 text-sm text-white/65">
                {client?.company_name || "Proyek Klien"}
                {client?.contact_person ? ` · ${client.contact_person}` : ""}
              </p>
            </div>

            <div className="grid shrink-0 grid-cols-2 gap-3 lg:min-w-[310px]">
              <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
                <p className="text-xs text-white/55">Tanggal Mulai</p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {formatDate(project.start_date)}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
                <p className="text-xs text-white/55">Tenggat Proyek</p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {formatDate(project.deadline)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-white/10 pt-5">
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-white/75">
                  Progress Proyek
                </p>
                <p className="mt-1 text-xs text-white/45">
                  Persentase penyelesaian pekerjaan
                </p>
              </div>
              <p className="text-3xl font-bold tracking-tight text-[#B7FE1A] sm:text-4xl">
                {progress}%
              </p>
            </div>
            <div
              className="h-2.5 overflow-hidden rounded-full bg-white/15"
              role="progressbar"
              aria-label="Kemajuan proyek"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-[#B7FE1A] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-white/45">
              <span>Proyek dimulai</span>
              <span>
                {progress === 100 ? "Proyek selesai" : "Sedang berjalan"}
              </span>
            </div>
          </div>
        </section>

        {/* PROJECT SUMMARY */}
        <section className="mb-8">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
                Ringkasan Proyek
              </h2>
              <p className="mt-1 text-sm text-[#777777]">
                Informasi utama proyek dalam satu tampilan.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[#EEEEEE] bg-white p-4 sm:p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-[#888888]">
                Klien
              </p>
              <p className="mt-2 break-words text-base font-semibold text-[#1f1e30]">
                {client?.company_name || "-"}
              </p>
              {client?.contact_person && (
                <p className="mt-1 text-sm text-[#777777]">
                  {client.contact_person}
                </p>
              )}
            </div>
            <div className="rounded-xl border border-[#EEEEEE] bg-white p-4 sm:p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-[#888888]">
                Jenis Proyek
              </p>
              <p className="mt-2 break-words text-base font-semibold text-[#1f1e30]">
                {project.project_type || "-"}
              </p>
            </div>
            <div className="rounded-xl border border-[#EEEEEE] bg-white p-4 sm:p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-[#888888]">
                Status Proyek
              </p>
              <div className="mt-2">
                <span
                  className={`inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full px-4 py-1 text-xs font-medium ${getStatusClass(
                    projectStatus?.name ?? null,
                  )}`}
                >
                  {projectStatus?.name || "-"}
                </span>
              </div>
            </div>
          </div>
          {project.description && (
            <div className="mt-3 rounded-xl border border-[#EEEEEE] bg-white p-4 sm:p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-[#888888]">
                Deskripsi Proyek
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#555555]">
                {project.description}
              </p>
            </div>
          )}
        </section>

        {/* MILESTONES */}
        <section className="mb-8">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
                Milestone
              </h2>
              <p className="mt-1 text-sm text-[#777777]">
                Pantau urutan dan status setiap tahapan pekerjaan.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-medium text-[#666666] ring-1 ring-[#EEEEEE]">
              {milestones?.length || 0} tahapan
            </span>
          </div>

          {milestones && milestones.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-[#EEEEEE] bg-white">
              {milestones.map((milestone, index) => {
                const normalized = milestone.status?.trim().toLowerCase() || "";
                const isComplete = [
                  "selesai",
                  "completed",
                  "complete",
                  "done",
                ].includes(normalized);
                const isActive = [
                  "berjalan",
                  "in progress",
                  "progress",
                ].includes(normalized);
                return (
                  <div
                    key={milestone.id}
                    className="flex gap-3 border-b border-[#EEEEEE] p-4 last:border-b-0 sm:gap-4 sm:px-5 sm:py-4"
                  >
                    <div className="flex shrink-0 flex-col items-center">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                          isComplete
                            ? "bg-[#B7FE1A] text-[#1f1e30]"
                            : isActive
                              ? "border-2 border-[#B7FE1A] bg-white text-[#1f1e30]"
                              : "bg-[#F1F1EF] text-[#777777]"
                        }`}
                      >
                        {isComplete ? (
                          <span
                            className="material-symbols-outlined text-base"
                            aria-hidden="true"
                          >
                            check
                          </span>
                        ) : (
                          String(index + 1).padStart(2, "0")
                        )}
                      </div>
                      {index !== milestones.length - 1 && (
                        <div className="mt-1 min-h-5 w-px flex-1 bg-[#EAEAEA]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 pb-1">
                      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                        <div className="min-w-0">
                          <h3 className="break-words text-sm font-semibold text-[#1f1e30]">
                            {milestone.name}
                          </h3>
                          {milestone.description && (
                            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#777777]">
                              {milestone.description}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                          <StatusBadge status={milestone.status} />
                          <span className="text-xs text-[#777777]">
                            Tenggat {formatDate(milestone.due_date)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState text="Belum ada milestone proyek yang ditampilkan." />
          )}
        </section>

        {/* TASKS */}
        <section className="mb-8">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
                Daftar Tugas
              </h2>
              <p className="mt-1 text-sm text-[#777777]">
                Rincian pekerjaan yang termasuk dalam proyek ini.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-medium text-[#666666] ring-1 ring-[#EEEEEE]">
              {tasks?.length || 0} tugas
            </span>
          </div>

          {tasks && tasks.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {tasks.map((task, index) => (
                <article
                  key={task.id}
                  className="rounded-xl border border-[#EEEEEE] bg-white p-4 sm:p-5"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F1FFCC] text-xs font-semibold text-[#1f1e30]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                        <h3 className="break-words text-sm font-semibold leading-5 text-[#1f1e30]">
                          {task.title}
                        </h3>
                        <StatusBadge status={task.status} />
                      </div>
                      {task.description && (
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#777777]">
                          {task.description}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#777777]">
                        {task.deadline && (
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="material-symbols-outlined text-sm"
                              aria-hidden="true"
                            >
                              calendar_today
                            </span>
                            Tenggat {formatDate(task.deadline)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState text="Belum ada tugas yang ditampilkan untuk klien." />
          )}
        </section>

        {/* UPDATES */}
        <section className="mb-8">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
                Update Proyek
              </h2>
              <p className="mt-1 text-sm text-[#777777]">
                Informasi terbaru dari tim Enika mengenai perkembangan proyek.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-medium text-[#666666] ring-1 ring-[#EEEEEE]">
              {updates?.length || 0} pembaruan
            </span>
          </div>

          {updates && updates.length > 0 ? (
            <div className="rounded-xl border border-[#EEEEEE] bg-white">
              {updates.map((update, index) => (
                <article
                  key={update.id}
                  className="flex gap-3 border-b border-[#EEEEEE] p-4 last:border-b-0 sm:gap-4 sm:p-5"
                >
                  <div className="flex shrink-0 flex-col items-center">
                    <span
                      className="material-symbols-outlined mt-1 text-[10px] leading-none text-[#B7FE1A]"
                      aria-hidden="true"
                    >
                      fiber_manual_record
                    </span>
                    {index !== updates.length - 1 && (
                      <span className="mt-1 min-h-6 w-px flex-1 bg-[#EAEAEA]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-start">
                      <h3 className="break-words text-sm font-semibold text-[#1f1e30]">
                        {update.title}
                      </h3>
                      <time className="shrink-0 text-xs text-[#888888]">
                        {formatDate(update.created_at)}
                      </time>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#666666]">
                      {update.content}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState text="Belum ada informasi terbaru mengenai proyek ini." />
          )}
        </section>

        {/* FILES */}
        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
              File Proyek
            </h2>
            <p className="mt-1 text-sm text-[#777777]">
              Dokumen dan file yang dibagikan untuk proyek ini.
            </p>
          </div>

          {filesWithUrl.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-[#EEEEEE] bg-white">
              {filesWithUrl.map((file) => (
                <div
                  key={file.id}
                  className="flex flex-col justify-between gap-3 border-b border-[#EEEEEE] p-4 last:border-b-0 sm:flex-row sm:items-center sm:px-5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F1FFCC] text-[#1f1e30]">
                      <span
                        className="material-symbols-outlined text-[21px]"
                        aria-hidden="true"
                      >
                        description
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="break-all text-sm font-semibold text-[#1f1e30]">
                        {file.file_name}
                      </p>
                      <p className="mt-1 text-xs text-[#888888]">
                        {formatFileSize(file.file_size)}{" "}
                        <span className="px-1 text-[#CCCCCC]">·</span>{" "}
                        {formatDate(file.created_at)}
                      </p>
                      {file.task_id != null && (
                        <p className="mt-1 text-xs text-[#666666]">
                          Tugas:{" "}
                          {tasks?.find((task) => task.id === file.task_id)
                            ?.title || "Tugas tidak ditampilkan"}
                        </p>
                      )}
                    </div>
                  </div>
                  {file.signedUrl ? (
                    <a
                      href={file.signedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#B7FE1A] px-4 text-sm font-semibold text-[#1f1e30] transition-colors hover:bg-[#a8ed12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B7FE1A] focus-visible:ring-offset-2"
                    >
                      <span
                        className="material-symbols-outlined text-[18px]"
                        aria-hidden="true"
                      >
                        download
                      </span>
                      Unduh File
                    </a>
                  ) : (
                    <span className="text-xs text-[#777777]">
                      File belum dapat diunduh
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="Belum ada berkas yang dibagikan kepada klien." />
          )}
        </section>
      </main>
    </div>
  );
}
