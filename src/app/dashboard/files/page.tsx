"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import { createActivityLog } from "../../../lib/activity-log";

type FileRecord = {
  id: string;
  project_id: string;
  task_id: string | null;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  file_size: number | null;
  client_visible: boolean;
  created_at: string;
  projects:
    | {
        project_name: string;
      }
    | {
        project_name: string;
      }[]
    | null;
};

const TEXT = {
  pageTitle: "text-3xl font-semibold tracking-tight text-white",
  sectionTitle: "text-lg font-semibold text-white",
  subtitle: "mt-1 text-sm text-zinc-400",
  primary: "text-sm font-medium text-white",
  secondary: "text-sm text-[#A5BDCC]",

  primaryButton:
    "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#B7FE1A] px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#caff57] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto",

  action:
    "inline-flex items-center justify-center rounded-lg border border-[#2a2a2a] px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-[#B7FE1A] hover:text-[#B7FE1A] disabled:cursor-not-allowed disabled:opacity-50",

  card: "overflow-hidden rounded-[22px] border border-[#2a2a2a] bg-[#1c1c1c]/80",
};

export default function FilesPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [role, setRole] = useState("");

  // CHECK ROLE + LOAD FILES
  useEffect(() => {
    async function initializePage() {
      setLoading(true);
      setError("");

      // CHECK LOGIN
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      // CHECK ROLE
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        router.push("/dashboard");
        return;
      }

      const allowedRoles = ["Admin", "Project Manager", "Staff"];

      if (!allowedRoles.includes(profile.role)) {
        router.push("/dashboard");
        return;
      }

      setRole(profile.role);

      await loadFiles();

      setLoading(false);
    }

    initializePage();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, supabase]);

  // LOAD FILES
  async function loadFiles() {
    setError("");

    const { data, error } = await supabase
      .from("files")
      .select(
        `
        id,
        project_id,
        task_id,
        file_name,
        storage_path,
        mime_type,
        file_size,
        client_visible,
        created_at,
        projects (
          project_name
        )
      `,
      )
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      setError(error.message);
      return;
    }

    setFiles((data || []) as FileRecord[]);
  }

  // FORMAT SIZE
  function formatSize(size: number | null) {
    if (size === null || size === undefined) return "-";

    if (size < 1024) {
      return `${size} B`;
    }

    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  // FORMAT DATE
  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  // GET PROJECT
  function getProject(projects: FileRecord["projects"]) {
    if (Array.isArray(projects)) {
      return projects[0] || null;
    }

    return projects;
  }

  // DOWNLOAD FILE
  async function handleDownload(file: FileRecord) {
    setError("");

    const { data, error } = await supabase.storage
      .from("project-files")
      .createSignedUrl(file.storage_path, 60);

    if (error || !data?.signedUrl) {
      setError(error?.message || "Gagal membuat link download.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  // DELETE FILE
  async function handleDelete(file: FileRecord) {
    const confirmed = window.confirm(
      `Hapus file "${file.file_name}"?\n\nFile akan dihapus dari Storage dan database.`,
    );

    if (!confirmed) return;

    setDeletingId(file.id);
    setError("");

    try {
      // DELETE FROM STORAGE
      const { error: storageError } = await supabase.storage
        .from("project-files")
        .remove([file.storage_path]);

      if (storageError) {
        throw new Error(
          `Gagal menghapus file dari Storage: ${storageError.message}`,
        );
      }

      // DELETE DATABASE RECORD
      const { error: databaseError } = await supabase
        .from("files")
        .delete()
        .eq("id", file.id);

      if (databaseError) {
        throw new Error(
          `Gagal menghapus data file: ${databaseError.message}`,
        );
      }

      // ACTIVITY LOG
      const { error: logError } = await createActivityLog({
        action: "DELETE_FILE",
        description: `Menghapus file "${file.file_name}"`,
        projectId: file.project_id,
        metadata: {
          file_id: file.id,
          file_name: file.file_name,
          storage_path: file.storage_path,
          mime_type: file.mime_type,
          file_size: file.file_size,
          client_visible: file.client_visible,
        },
      });

      if (logError) {
        console.error("Activity log error:", logError);
      }

      // UPDATE UI
      setFiles((current) =>
        current.filter((item) => item.id !== file.id),
      );
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Terjadi kesalahan saat menghapus file.");
      }
    } finally {
      setDeletingId(null);
    }
  }

  // LOADING
  if (loading) {
    return (
      <main className="min-h-screen bg-[#111111] px-5 py-6 text-white sm:px-7 lg:px-8">
        <div className="mb-8 mt-2">
          <h1 className={TEXT.pageTitle}>File Proyek</h1>
          <p className={TEXT.subtitle}>
            Kelola file yang berkaitan dengan proyek.
          </p>
        </div>

        <section className={`${TEXT.card} max-w-full p-6 sm:p-8`}>
          <p className="text-sm text-zinc-400">Memuat data file...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#111111] px-5 py-6 text-white sm:px-7 lg:px-8">
      {/* HEADER */}
      <div className="mb-8 mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className={TEXT.pageTitle}>File Proyek</h1>

          <p className={TEXT.subtitle}>
            Kelola file yang berkaitan dengan proyek.
          </p>
        </div>

        <Link
          href="/dashboard/files/new"
          className={TEXT.primaryButton}
        >
          Upload File
        </Link>
      </div>

      {/* ERROR */}
      {error && (
        <div
          role="alert"
          className="mb-6 max-w-full rounded-xl border border-red-500/20 bg-[#1c1c1c]/80 px-5 py-4 text-sm text-red-400"
        >
          {error}
        </div>
      )}

      {/* FILE LIST */}
      <section className={TEXT.card}>
        {/* SECTION HEADER */}
        <div className="border-b border-[#262626] px-6 py-5 sm:px-8">
          <h2 className={TEXT.sectionTitle}>Daftar File</h2>

          <p className={TEXT.subtitle}>
            {files.length} file terdaftar
          </p>
        </div>

        {files.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-[#262626] text-left text-xs font-medium uppercase tracking-wide text-zinc-400">
                  <th className="px-6 py-4">Nama File</th>
                  <th className="px-6 py-4">Proyek</th>
                  <th className="px-6 py-4">Ukuran</th>
                  <th className="px-6 py-4">Visibilitas</th>
                  <th className="px-6 py-4">Tanggal</th>
                  <th className="px-6 py-4 text-right">Tindakan</th>
                </tr>
              </thead>

              <tbody>
                {files.map((file) => {
                  const project = getProject(file.projects);

                  return (
                    <tr
                      key={file.id}
                      className="border-b border-[#262626] transition-colors last:border-b-0 hover:bg-white/[0.02]"
                    >
                      {/* FILE */}
                      <td className="max-w-[280px] px-6 py-4">
                        <p className={TEXT.primary}>
                          <span className="break-all">
                            {file.file_name}
                          </span>
                        </p>

                        <p className="mt-1 break-all text-xs text-zinc-500">
                          {file.mime_type || "Tipe file tidak diketahui"}
                        </p>
                      </td>

                      {/* PROJECT */}
                      <td className={`px-6 py-4 ${TEXT.secondary}`}>
                        {project?.project_name || "-"}
                      </td>

                      {/* SIZE */}
                      <td className={`whitespace-nowrap px-6 py-4 ${TEXT.secondary}`}>
                        {formatSize(file.file_size)}
                      </td>

                      {/* VISIBILITY */}
                      <td className="px-6 py-4">
                        <VisibilityBadge
                          clientVisible={file.client_visible}
                        />
                      </td>

                      {/* DATE */}
                      <td className={`whitespace-nowrap px-6 py-4 ${TEXT.secondary}`}>
                        {formatDate(file.created_at)}
                      </td>

                      {/* ACTION */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleDownload(file)}
                            className={TEXT.action}
                          >
                            Download
                          </button>

                          {(role === "Admin" ||
                            role === "Project Manager") && (
                            <button
                              type="button"
                              onClick={() => handleDelete(file)}
                              disabled={deletingId === file.id}
                              className="inline-flex items-center justify-center rounded-lg border border-red-500/20 px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/[0.06] hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {deletingId === file.id
                                ? "Menghapus..."
                                : "Hapus"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* EMPTY STATE */
          <div className="px-5 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#262626]">
              <FileIcon />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-white">
              Belum Ada File
            </h3>

            <p className="mt-1 text-sm text-zinc-400">
              Upload file untuk mulai mengelola dokumen proyek.
            </p>

            <Link
              href="/dashboard/files/new"
              className={`${TEXT.primaryButton} mt-5`}
            >
              Upload File Pertama
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

// BADGE VISIBILITAS
function VisibilityBadge({
  clientVisible,
}: {
  clientVisible: boolean;
}) {
  return (
    <span
      className={`inline-flex min-w-[100px] items-center justify-start gap-2 rounded-full px-3 py-1 text-xs font-medium ${
        clientVisible
          ? "bg-[#075C3C] text-[#6EE7B7]"
          : "bg-[#262626] text-zinc-400"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          clientVisible ? "bg-[#6EE7B7]" : "bg-zinc-500"
        }`}
      />

      {clientVisible ? "Klien" : "Internal"}
    </span>
  );
}

// IKON FILE
function FileIcon() {
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
      folder
    </span>
  );
}

