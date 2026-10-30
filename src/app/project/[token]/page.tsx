import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";

export const metadata: Metadata = {
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

export default async function PublicProjectPage({
  params,
}: PublicProjectPageProps) {
  const { token } = await params;

  const supabase = await createClient();

  // =====================================================
  // GET PROJECT
  // =====================================================

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select(
      `
      id,
      project_name,
      project_type,
      description,
      pic,
      start_date,
      deadline,
      progress,
      public_visibility,
      public_token,
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

  // GET CLIENT VISIBLE MILESTONES
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
    console.error("Failed to load public milestones:", milestonesError);
  }

  // =====================================================
  // GET CLIENT VISIBLE TASKS
  // =====================================================

  const { data: tasks } = await supabase
    .from("tasks")
    .select(
      `
      id,
      title,
      description,
      status,
      priority,
      deadline,
      client_visible
    `,
    )
    .eq("project_id", project.id)
    .eq("client_visible", true)
    .order("deadline", {
      ascending: true,
    });

  // =====================================================
  // GET CLIENT VISIBLE UPDATES
  // =====================================================

  const { data: updates } = await supabase
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
    .order("created_at", {
      ascending: false,
    });

  // =====================================================
  // GET CLIENT VISIBLE FILES
  // =====================================================

  const { data: files } = await supabase
    .from("files")
    .select(
      `
      id,
      file_name,
      storage_path,
      mime_type,
      file_size,
      client_visible,
      created_at
    `,
    )
    .eq("project_id", project.id)
    .eq("client_visible", true)
    .order("created_at", {
      ascending: false,
    });

  // =====================================================
  // STORAGE PUBLIC URL
  // =====================================================

  const filesWithUrl = (files || []).map((file) => {
    const {
      data: { publicUrl },
    } = supabase.storage.from("project-files").getPublicUrl(file.storage_path);

    return {
      ...file,
      publicUrl,
    };
  });

  // =====================================================
  // HELPERS
  // =====================================================

  function formatDate(date: string | null) {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  function formatFileSize(size: number | null) {
    if (!size) return "-";

    if (size < 1024) {
      return `${size} B`;
    }

    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getStatusClass(status: string | null) {
    if (!status) {
      return "border-zinc-700 bg-zinc-900 text-zinc-400";
    }

    const normalized = status.toLowerCase();

    if (
      normalized.includes("selesai") ||
      normalized.includes("complete") ||
      normalized.includes("done")
    ) {
      return "border-lime-400/30 bg-lime-400/10 text-lime-400";
    }

    if (
      normalized.includes("progress") ||
      normalized.includes("development") ||
      normalized.includes("design") ||
      normalized.includes("testing")
    ) {
      return "border-blue-400/30 bg-blue-400/10 text-blue-400";
    }

    if (normalized.includes("revisi") || normalized.includes("revision")) {
      return "border-yellow-400/30 bg-yellow-400/10 text-yellow-400";
    }

    return "border-zinc-700 bg-zinc-900 text-zinc-400";
  }

  const client = Array.isArray(project.clients)
    ? project.clients[0]
    : project.clients;

  const projectStatus = Array.isArray(project.project_statuses)
    ? project.project_statuses[0]
    : project.project_statuses;

  const progress = project.progress ?? 0;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="border-b border-zinc-800 bg-zinc-950">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-bold tracking-widest text-lime-400">
                ENIKA
              </p>

              <p className="text-[10px] text-zinc-600 tracking-[0.25em] mt-1">
                PROJECT DEVELOPMENT
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs text-zinc-600">CLIENT PROJECT PAGE</p>

              <p className="text-sm text-zinc-400 mt-1">
                {client?.company_name || "Client"}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* PROJECT HERO */}

        <section className="mb-12">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-lime-400">
                PROJECT
              </p>

              <h1 className="text-4xl md:text-5xl font-bold mt-3">
                {project.project_name}
              </h1>

              {project.project_type && (
                <p className="text-zinc-500 mt-3">{project.project_type}</p>
              )}
            </div>

            {/* STATUS */}

            <div>
              <span
                className={`inline-flex rounded-full border px-4 py-2 text-sm ${getStatusClass(
                  projectStatus?.name || null,
                )}`}
              >
                {projectStatus?.name || "No Status"}
              </span>
            </div>
          </div>
        </section>

        {/* =====================================================
            PROGRESS
        ===================================================== */}

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-7 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-zinc-500">Project Progress</p>

              <p className="text-3xl font-bold mt-1">{progress}%</p>
            </div>

            <div className="text-right">
              <p className="text-xs text-zinc-600">Deadline</p>

              <p className="text-sm text-zinc-300 mt-1">
                {formatDate(project.deadline)}
              </p>
            </div>
          </div>

          <div className="h-3 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-lime-400 rounded-full transition-all"
              style={{
                width: `${Math.min(Math.max(progress, 0), 100)}%`,
              }}
            />
          </div>
        </section>

        {/* =====================================================
            PROJECT INFO
        ===================================================== */}

        <section className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-xs uppercase tracking-widest text-zinc-600">
              Client
            </p>

            <p className="text-lg font-semibold mt-2">
              {client?.company_name || "-"}
            </p>

            {client?.contact_person && (
              <p className="text-sm text-zinc-500 mt-1">
                {client.contact_person}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-xs uppercase tracking-widest text-zinc-600">
              Start Date
            </p>

            <p className="text-lg font-semibold mt-2">
              {formatDate(project.start_date)}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-xs uppercase tracking-widest text-zinc-600">
              Deadline
            </p>

            <p className="text-lg font-semibold mt-2">
              {formatDate(project.deadline)}
            </p>
          </div>
        </section>

        {/* =====================================================
            DESCRIPTION
        ===================================================== */}

        {project.description && (
          <section className="mb-12">
            <p className="text-sm uppercase tracking-[0.2em] text-lime-400">
              ABOUT PROJECT
            </p>

            <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-7">
              <p className="text-zinc-400 leading-7 whitespace-pre-wrap">
                {project.description}
              </p>
            </div>
          </section>
        )}

        {/* =====================================================
            MILESTONES
        ===================================================== */}

        <section className="mb-12">
          <div className="mb-5">
            <p className="text-sm uppercase tracking-[0.2em] text-lime-400">
              PROJECT TIMELINE
            </p>

            <h2 className="text-2xl font-bold mt-2">Milestones</h2>
          </div>

          {milestones && milestones.length > 0 ? (
            <div className="space-y-4">
              {milestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {milestone.name}
                      </h3>

                      {milestone.description && (
                        <p className="text-sm text-zinc-500 mt-2">
                          {milestone.description}
                        </p>
                      )}
                    </div>

                    <div className="text-left md:text-right">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs ${getStatusClass(
                          milestone.status,
                        )}`}
                      >
                        {milestone.status || "No Status"}
                      </span>

                      <p className="text-xs text-zinc-600 mt-2">
                        Due {formatDate(milestone.due_date)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center">
              <p className="text-zinc-600">No milestones available.</p>
            </div>
          )}
        </section>

        {/* =====================================================
            TASKS
        ===================================================== */}

        <section className="mb-12">
          <div className="mb-5">
            <p className="text-sm uppercase tracking-[0.2em] text-lime-400">
              TASKS
            </p>

            <h2 className="text-2xl font-bold mt-2">Client Visible Tasks</h2>
          </div>

          {tasks && tasks.length > 0 ? (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h3 className="font-medium">{task.title}</h3>

                      {task.description && (
                        <p className="text-sm text-zinc-500 mt-1">
                          {task.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {task.priority && (
                        <span className="text-xs text-zinc-500">
                          {task.priority}
                        </span>
                      )}

                      <span
                        className={`rounded-full border px-3 py-1 text-xs ${getStatusClass(
                          task.status,
                        )}`}
                      >
                        {task.status || "No Status"}
                      </span>
                    </div>
                  </div>

                  {task.deadline && (
                    <p className="text-xs text-zinc-600 mt-3">
                      Deadline: {formatDate(task.deadline)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center">
              <p className="text-zinc-600">No client-visible tasks.</p>
            </div>
          )}
        </section>

        {/* =====================================================
            PROJECT UPDATES
        ===================================================== */}

        <section className="mb-12">
          <div className="mb-5">
            <p className="text-sm uppercase tracking-[0.2em] text-lime-400">
              LATEST INFORMATION
            </p>

            <h2 className="text-2xl font-bold mt-2">Project Updates</h2>
          </div>

          {updates && updates.length > 0 ? (
            <div className="space-y-4">
              {updates.map((update) => (
                <div
                  key={update.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <h3 className="font-semibold text-lg">{update.title}</h3>

                    <p className="text-xs text-zinc-600">
                      {formatDate(update.created_at)}
                    </p>
                  </div>

                  <p className="text-sm text-zinc-400 leading-7 mt-4 whitespace-pre-wrap">
                    {update.content}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center">
              <p className="text-zinc-600">No project updates yet.</p>
            </div>
          )}
        </section>

        {/* =====================================================
            FILES
        ===================================================== */}

        <section className="mb-12">
          <div className="mb-5">
            <p className="text-sm uppercase tracking-[0.2em] text-lime-400">
              PROJECT FILES
            </p>

            <h2 className="text-2xl font-bold mt-2">Files</h2>

            <p className="text-sm text-zinc-500 mt-2">
              Files shared by the Enika team.
            </p>
          </div>

          {filesWithUrl.length > 0 ? (
            <div className="space-y-3">
              {filesWithUrl.map((file) => (
                <div
                  key={file.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-white break-all">
                        {file.file_name}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <span className="text-xs text-zinc-600">
                          {formatFileSize(file.file_size)}
                        </span>

                        <span className="text-xs text-zinc-700">•</span>

                        <span className="text-xs text-zinc-600">
                          {formatDate(file.created_at)}
                        </span>
                      </div>
                    </div>

                    <a
                      href={file.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-xl bg-lime-400 px-5 py-3 text-sm font-semibold text-black hover:bg-lime-300 transition"
                    >
                      Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center">
              <p className="text-zinc-600">No files shared with client.</p>
            </div>
          )}
        </section>
      </main>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="border-t border-zinc-800 bg-zinc-950">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <p className="text-xs text-zinc-600">
            This project page is provided by Enika Media Group.
          </p>

          <p className="text-xs text-zinc-700 mt-1">
            This page is read-only for project monitoring purposes.
          </p>
        </div>
      </footer>
    </div>
  );
}
