"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase/client";
import { createActivityLog } from "../../../../lib/activity-log";

type Project = {
  id: string;
  project_name: string;
};

const TEXT = {
  pageTitle: "text-3xl font-semibold tracking-tight text-white",
  subtitle: "mt-1 text-sm text-zinc-400",
  label: "block text-sm font-medium text-white",

  input:
    "h-[54px] w-full rounded-xl border border-[#2a2a2a] bg-[#1c1c1c] px-4 text-sm text-white outline-none transition-colors focus:border-[#B7FE1A] disabled:cursor-not-allowed disabled:opacity-50",

  primaryButton:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-[#B7FE1A] px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#caff57] disabled:cursor-not-allowed disabled:opacity-50",

  secondaryButton:
    "inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-50",
};

const fieldClass = "flex flex-col gap-2";

const formClass =
  "flex max-w-4xl flex-col gap-6 rounded-[22px] border border-[#2a2a2a] bg-[#1c1c1c]/80 p-5 sm:p-8";

// =====================================================
// TOMBOL KEMBALI
// =====================================================

function BackLink() {
  return (
    <div className="mb-5">
      <Link
        href="/dashboard/files"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-[#B7FE1A]"
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
          <path d="m15 18-6-6 6-6" />
        </svg>
        Kembali
      </Link>
    </div>
  );
}

// =====================================================
// HEADER HALAMAN
// =====================================================

function PageHeader() {
  return (
    <header className="mb-8">
      <BackLink />

      <h1 className={TEXT.pageTitle}>Upload File</h1>

      <p className={TEXT.subtitle}>
        Tambahkan file ke dalam project.
      </p>
    </header>
  );
}

// =====================================================
// HALAMAN UPLOAD FILE
// =====================================================

export default function NewFilePage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [projects, setProjects] = useState<Project[]>([]);

  const [projectId, setProjectId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [clientVisible, setClientVisible] = useState(false);

  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =====================================================
  // LOAD PROJECTS + CHECK ROLE
  // =====================================================

  useEffect(() => {
    let active = true;

    async function loadProjects() {
      setLoadingProjects(true);
      setError("");

      // CHECK LOGIN
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!active) return;

      if (userError || !user) {
        router.push("/login");
        return;
      }

      // CHECK ROLE
      const { data: profile, error: profileError } =
        await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();

      if (!active) return;

      if (profileError || !profile) {
        router.push("/dashboard");
        return;
      }

      const allowedRoles = [
        "Admin",
        "Project Manager",
        "Staff",
      ];

      if (!allowedRoles.includes(profile.role)) {
        router.push("/dashboard");
        return;
      }

      // LOAD PROJECTS
      const { data, error: projectsError } =
        await supabase
          .from("projects")
          .select("id, project_name")
          .order("project_name", {
            ascending: true,
          });

      if (!active) return;

      if (projectsError) {
        setError(projectsError.message);
        setLoadingProjects(false);
        return;
      }

      setProjects(data || []);

      if (data && data.length > 0) {
        setProjectId(data[0].id);
      }

      setLoadingProjects(false);
    }

    loadProjects();

    return () => {
      active = false;
    };
  }, [router, supabase]);

  // =====================================================
  // FILE CHANGE
  // =====================================================

  function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile = e.target.files?.[0] || null;

    setFile(selectedFile);
    setError("");
    setSuccess("");
  }

  // =====================================================
  // SUBMIT
  // =====================================================

  async function handleSubmit(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!projectId) {
      setError("Silakan pilih project.");
      return;
    }

    if (!file) {
      setError("Silakan pilih file.");
      return;
    }

    // Maksimal 50 MB
    const maxSize = 50 * 1024 * 1024;

    if (file.size > maxSize) {
      setError("Ukuran file maksimal 50 MB.");
      return;
    }

    setLoading(true);

    try {
      // GET CURRENT USER
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(
          "Session login tidak ditemukan. Silakan login kembali."
        );
      }

      // CREATE STORAGE PATH
      const safeFileName = file.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      );

      const filePath =
        `${projectId}/${crypto.randomUUID()}-${safeFileName}`;

      // UPLOAD STORAGE
      const { error: uploadError } = await supabase.storage
        .from("project-files")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType:
            file.type || "application/octet-stream",
        });

      if (uploadError) {
        throw new Error(
          `Upload Storage gagal: ${uploadError.message}`
        );
      }

      // INSERT DATABASE
      const {
        data: insertedFile,
        error: databaseError,
      } = await supabase
        .from("files")
        .insert({
          project_id: projectId,
          task_id: null,
          uploaded_by: user.id,
          file_name: file.name,
          storage_path: filePath,
          mime_type:
            file.type || "application/octet-stream",
          file_size: file.size,
          client_visible: clientVisible,
        })
        .select("id, project_id, file_name")
        .single();

      // ROLLBACK STORAGE JIKA INSERT GAGAL
      if (databaseError) {
        await supabase.storage
          .from("project-files")
          .remove([filePath]);

        throw new Error(
          `Database gagal menyimpan file: ${databaseError.message}`
        );
      }

      // ACTIVITY LOG
      const { error: logError } = await createActivityLog({
        action: "UPLOAD_FILE",
        description: `Mengupload file "${file.name}"`,
        projectId,
        metadata: {
          file_id: insertedFile?.id,
          file_name: file.name,
          storage_path: filePath,
          mime_type:
            file.type || "application/octet-stream",
          file_size: file.size,
          client_visible: clientVisible,
        },
      });

      if (logError) {
        console.error(
          "Activity log error:",
          logError
        );
      }

      // SUCCESS
      setSuccess("File berhasil diupload.");
      setFile(null);

      const fileInput = document.getElementById(
        "file"
      ) as HTMLInputElement | null;

      if (fileInput) {
        fileInput.value = "";
      }

      setTimeout(() => {
        router.push("/dashboard/files");
        router.refresh();
      }, 700);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Terjadi kesalahan saat mengupload file."
        );
      }

      setLoading(false);
    }
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <main className="min-h-screen bg-[#111111] px-5 py-6 text-white sm:px-7 lg:px-8">
      {/* HEADER */}
      <PageHeader />

      {/* ERROR */}
      {error && (
        <div
          role="alert"
          className="mb-6 max-w-4xl rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-400"
        >
          {error}
        </div>
      )}

      {/* SUCCESS */}
      {success && (
        <div
          role="status"
          className="mb-6 max-w-4xl rounded-xl border border-[#B7FE1A]/20 bg-[#B7FE1A]/[0.06] px-4 py-3 text-sm text-[#B7FE1A]"
        >
          {success}
        </div>
      )}

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className={formClass}
      >
        {/* PROJECT */}
        <div className={fieldClass}>
          <label
            htmlFor="project"
            className={TEXT.label}
          >
            Project <span className="text-red-500">*</span>
          </label>

          <select
            id="project"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={loadingProjects || loading}
            className={TEXT.input}
            required
          >
            <option value="" className="bg-[#1c1c1c]">
              {loadingProjects
                ? "Memuat project..."
                : projects.length === 0
                  ? "Belum ada project"
                  : "Pilih project"}
            </option>

            {projects.map((project) => (
              <option
                key={project.id}
                value={project.id}
                className="bg-[#1c1c1c]"
              >
                {project.project_name}
              </option>
            ))}
          </select>
        </div>

        {/* FILE */}
        <div className={fieldClass}>
          <label
            htmlFor="file"
            className={TEXT.label}
          >
            File <span className="text-red-500">*</span>
          </label>

          <div className="rounded-xl border border-[#2a2a2a] bg-[#1c1c1c] p-5">
            <input
              id="file"
              type="file"
              onChange={handleFileChange}
              disabled={loading}
              className="block w-full cursor-pointer text-sm text-zinc-400 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[#B7FE1A] file:px-5 file:py-3 file:font-semibold file:text-black file:transition-colors hover:file:bg-[#caff57] disabled:cursor-not-allowed disabled:opacity-50"
            />

            {file && (
              <div className="mt-5 rounded-xl border border-[#2a2a2a] bg-black/20 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  File terpilih
                </p>

                <p className="mt-2 break-all text-sm text-white">
                  {file.name}
                </p>

                <p className="mt-1 text-xs text-zinc-400">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            )}
          </div>

          <p className="text-xs text-zinc-500">
            Ukuran file maksimal 50 MB.
          </p>
        </div>

        {/* CLIENT VISIBILITY */}
        <div className="rounded-xl border border-[#2a2a2a] bg-[#1c1c1c] p-5">
          <label className="flex cursor-pointer items-start gap-4">
            <input
              type="checkbox"
              checked={clientVisible}
              onChange={(e) =>
                setClientVisible(e.target.checked)
              }
              disabled={loading}
              className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[#B7FE1A] disabled:cursor-not-allowed"
            />

            <div>
              <p className="text-sm font-medium text-white">
                Tampilkan kepada klien
              </p>

              <p className="mt-1 text-sm leading-6 text-zinc-400">
                Jika diaktifkan, file dapat dilihat oleh klien
                melalui halaman project publik.
              </p>
            </div>
          </label>
        </div>

        {/* BUTTONS */}
        <div className="flex flex-col-reverse gap-3 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => router.push("/dashboard/files")}
            disabled={loading}
            className={TEXT.secondaryButton}
          >
            Batal
          </button>

          <button
            type="submit"
            disabled={loading || loadingProjects || projects.length === 0}
            className={TEXT.primaryButton}
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                Mengupload...
              </>
            ) : (
              "Upload File"
            )}
          </button>
        </div>
      </form>
    </main>
  );
}