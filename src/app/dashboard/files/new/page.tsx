"use client";

import { FormEvent, useEffect, useState, ChangeEvent } from "react";
import Link from "next/link";
import type { SelectHTMLAttributes } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase/client";
import { createActivityLog } from "../../../../lib/activity-log";

type Project = {
  id: string;
  project_name: string;
};

type Task = {
  id: string;
  title: string;
  project_id: string;
};

const TEXT = {
  label: "block text-sm font-medium text-[#1f1e30]",

  input:
    "h-[54px] w-full rounded-xl border border-[#EEEEEE] bg-white px-4 text-sm text-[#1f1e30] outline-none transition-colors placeholder:text-[#999999] focus:border-[#1f1e30] disabled:cursor-not-allowed disabled:opacity-50",

  primaryButton:
    "inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#B7FE1A] px-4 text-sm font-medium text-[#1f1e30] transition-colors hover:bg-[#a8ed12] disabled:cursor-not-allowed disabled:opacity-50 sm:w-[130px]",

  secondaryButton:
    "inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#1f1e30] px-4 text-sm font-normal text-white transition-colors hover:bg-[#333247] disabled:cursor-not-allowed disabled:opacity-50 sm:w-[130px]",
};

const fieldClass = "flex flex-col gap-2";

const formClass =
  "flex max-w-5xl flex-col gap-6 rounded-2xl border border-[#EEEEEE] bg-white p-5 shadow-[0_2px_10px_rgba(31,30,48,0.04)] sm:p-8";

// CUSTOM SELECT
function SelectArrow() {
  return (
    <svg
      className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777777]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CustomSelect({
  children,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative w-full">
      <select
        {...props}
        className={`${TEXT.input} appearance-none pr-12 ${className || ""}`}
      >
        {children}
      </select>

      <SelectArrow />
    </div>
  );
}

// TOMBOL KEMBALI
function BackLink() {
  return (
    <div className="mb-6">
      <Link
        href="/dashboard/files"
        className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#65A30D] transition-colors hover:text-[#4D7C0F]"
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

// HALAMAN UPLOAD FILE
export default function NewFilePage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [role, setRole] = useState("");
  const [userId, setUserId] = useState("");

  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [clientVisible, setClientVisible] = useState(false);

  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isStaff = role === "Staff";
  const canManageVisibility = role === "Admin" || role === "Project Manager";

  // LOAD PROJECTS + CHECK ROLE
  useEffect(() => {
    let active = true;

    async function loadProjects() {
      setLoadingProjects(true);
      setError("");

      try {
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

        setUserId(user.id);

        // CHECK ROLE
        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();

        if (!active) return;

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

        if (profile.role === "Staff") {
          // Staff hanya memuat tugas yang ditugaskan kepadanya.
          setLoadingTasks(true);

          const { data: taskData, error: tasksError } = await supabase
            .from("tasks")
            .select("id, title, project_id")
            .eq("assigned_to", user.id)
            .order("title", {
              ascending: true,
            });

          if (!active) return;

          if (tasksError) {
            throw new Error(`Gagal memuat tugas: ${tasksError.message}`);
          }

          const assignedTasks = (taskData || []) as Task[];
          setTasks(assignedTasks);

          const assignedProjectIds = [
            ...new Set(assignedTasks.map((task) => task.project_id)),
          ];

          if (assignedProjectIds.length === 0) {
            setProjects([]);
            return;
          }

          // Staff tidak memiliki akses SELECT langsung ke seluruh data proyek.
          // project_id tetap diperoleh dari task yang memang ditugaskan kepadanya.
          // Nama proyek tidak dimuat dari tabel projects agar tidak melanggar RLS.
          setProjects(
            assignedProjectIds.map((id) => ({
              id,
              project_name: "Proyek terkait tugas",
            })),
          );
        } else {
          // Admin dan Project Manager dapat memilih semua proyek aktif.
          const { data: projectData, error: projectsError } = await supabase
            .from("projects")
            .select("id, project_name")
            .eq("is_archived", false)
            .order("project_name", {
              ascending: true,
            });

          if (!active) return;

          if (projectsError) {
            throw new Error(`Gagal memuat proyek: ${projectsError.message}`);
          }

          setProjects((projectData || []) as Project[]);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Terjadi kesalahan saat memuat data.",
          );
        }
      } finally {
        if (active) {
          setLoadingProjects(false);
          setLoadingTasks(false);
        }
      }
    }

    loadProjects();

    return () => {
      active = false;
    };
  }, [router, supabase]);

  // ADMIN / PROJECT MANAGER:
  // LOAD TASKS BASED ON SELECTED PROJECT
  useEffect(() => {
    let active = true;

    async function loadProjectTasks() {
      // Tugas Staff sudah dimuat berdasarkan assigned_to saat halaman dibuka.
      // Jangan kosongkan daftar tugas ketika projectId terisi otomatis dari tugas pilihan.
      if (role === "Staff") {
        return;
      }

      if (!projectId) {
        setTasks([]);
        return;
      }

      setLoadingTasks(true);

      const { data, error: tasksError } = await supabase
        .from("tasks")
        .select("id, title, project_id")
        .eq("project_id", projectId)
        .order("title", {
          ascending: true,
        });

      if (!active) return;

      if (tasksError) {
        setTasks([]);
        setError(`Gagal memuat tugas: ${tasksError.message}`);
      } else {
        setTasks((data || []) as Task[]);
      }

      setLoadingTasks(false);
    }

    loadProjectTasks();

    return () => {
      active = false;
    };
  }, [projectId, role, supabase]);

  // PROJECT CHANGE
  function handleProjectChange(value: string) {
    setProjectId(value);
    setTaskId("");
    setError("");
    setSuccess("");
  }

  // TASK CHANGE
  function handleTaskChange(value: string) {
    setTaskId(value);
    setError("");
    setSuccess("");

    const selectedTask = tasks.find(
      (task) => String(task.id) === String(value),
    );

    // Staff mendapatkan project_id dari tugas yang dipilih
    if (isStaff && selectedTask) {
      setProjectId(selectedTask.project_id);
    }

    if (isStaff && !value) {
      setProjectId("");
    }
  }

  // FILE CHANGE
  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0] || null;

    setFile(selectedFile);
    setError("");
    setSuccess("");
  }

  // SUBMIT
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!file) {
      setError("Silakan pilih file.");
      return;
    }

    if (!projectId) {
      setError("Silakan pilih proyek terlebih dahulu.");
      return;
    }

    if (isStaff && !taskId) {
      setError("Staff wajib memilih tugas yang ditugaskan kepadanya.");
      return;
    }

    // MAKSIMAL 50 MB
    const maxSize = 50 * 1024 * 1024;

    if (file.size > maxSize) {
      setError("Ukuran file maksimal 50 MB.");
      return;
    }

    setLoading(true);

    let uploadedStoragePath: string | null = null;

    try {
      // =====================================
      // 1. VERIFIKASI USER DAN SESSION
      // =====================================
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(
          "Session login tidak ditemukan. Silakan login kembali.",
        );
      }

      if (user.id !== userId) {
        throw new Error("Sesi pengguna berubah. Silakan muat ulang halaman.");
      }

      // =====================================
      // 2. VERIFIKASI ROLE TERBARU
      // =====================================
      const { data: currentProfile, error: profileError } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError || !currentProfile) {
        throw new Error("Gagal memverifikasi hak akses pengguna.");
      }

      const allowedRoles = ["Admin", "Project Manager", "Staff"];

      if (!allowedRoles.includes(currentProfile.role)) {
        throw new Error("Kamu tidak memiliki izin mengunggah file.");
      }

      if (currentProfile.role !== role) {
        throw new Error(
          "Hak akses pengguna berubah. Silakan muat ulang halaman.",
        );
      }

      const currentIsStaff = currentProfile.role === "Staff";
      const currentCanManageVisibility =
        currentProfile.role === "Admin" ||
        currentProfile.role === "Project Manager";

      // Staff selalu mengunggah file internal.
      const visibilityForUpload = currentCanManageVisibility
        ? clientVisible
        : false;

      const taskIdForUpload = taskId || null;

      if (currentIsStaff && !taskIdForUpload) {
        throw new Error("Staff wajib memilih tugas.");
      }

      // =====================================
      // 3. VERIFIKASI PROYEK AKTIF
      // RLS membatasi daftar proyek sesuai role.
      // =====================================
      // Admin dan Project Manager dapat memverifikasi proyek aktif
      // melalui akses SELECT pada tabel projects.
      // Staff memverifikasi proyek melalui task yang ditugaskan kepadanya,
      // karena RLS projects tidak memberikan akses baca proyek secara umum.
      let verifiedProjectId = projectId;

      if (!currentIsStaff) {
        const { data: selectedProject, error: projectError } = await supabase
          .from("projects")
          .select("id")
          .eq("id", projectId)
          .eq("is_archived", false)
          .maybeSingle();

        if (projectError || !selectedProject) {
          throw new Error(
            "Proyek tidak ditemukan, sudah diarsipkan, atau kamu tidak memiliki akses.",
          );
        }
      }

      // =====================================
      // 4. VERIFIKASI TASK UNTUK SEMUA ROLE
      // Pastikan task berasal dari project_id yang dipilih.
      // Staff juga harus menjadi assignee task.
      // =====================================
      if (taskIdForUpload) {
        let taskQuery = supabase
          .from("tasks")
          .select("id, project_id, assigned_to")
          .eq("id", taskIdForUpload);

        if (currentIsStaff) {
          taskQuery = taskQuery.eq("assigned_to", user.id);
        } else {
          taskQuery = taskQuery.eq("project_id", projectId);
        }

        const { data: selectedTask, error: taskError } =
          await taskQuery.maybeSingle();

        if (taskError || !selectedTask) {
          throw new Error(
            currentIsStaff
              ? "Tugas tidak ditemukan atau bukan tugas yang ditugaskan kepadamu."
              : "Tugas tidak ditemukan atau tidak termasuk dalam proyek yang dipilih.",
          );
        }

        if (currentIsStaff) {
          // Gunakan project_id dari task terverifikasi, bukan nilai form.
          verifiedProjectId = selectedTask.project_id;

          if (String(projectId) !== String(verifiedProjectId)) {
            throw new Error("Proyek tidak sesuai dengan tugas yang dipilih.");
          }
        }
      }

      // =====================================
      // 5. BUAT STORAGE PATH
      // Format:
      // project_id/filename
      // project_id/task_id/filename
      // =====================================
      const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const uniqueFileName = `${crypto.randomUUID()}-${safeFileName}`;

      const filePath = taskIdForUpload
        ? `${projectId}/${taskIdForUpload}/${uniqueFileName}`
        : `${projectId}/${uniqueFileName}`;

      // =====================================
      // 6. UPLOAD KE SUPABASE STORAGE
      // =====================================
      const { error: uploadError } = await supabase.storage
        .from("project-files")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "application/octet-stream",
        });

      if (uploadError) {
        throw new Error(`Unggah Storage gagal: ${uploadError.message}`);
      }

      // Simpan path agar bisa dibersihkan jika insert database gagal.
      uploadedStoragePath = filePath;

      // =====================================
      // 7. SIMPAN METADATA KE DATABASE
      // Composite FK memastikan task_id dan project_id cocok.
      // RLS files membatasi akses berdasarkan role.
      // =====================================
      const { data: insertedFile, error: databaseError } = await supabase
        .from("files")
        .insert({
          project_id: verifiedProjectId,
          task_id: taskIdForUpload,
          uploaded_by: user.id,
          file_name: file.name,
          storage_path: filePath,
          mime_type: file.type || "application/octet-stream",
          file_size: file.size,
          client_visible: visibilityForUpload,
        })
        .select("id, project_id, file_name")
        .single();

      if (databaseError || !insertedFile) {
        throw new Error(
          `Database gagal menyimpan file: ${
            databaseError?.message || "Data file tidak ditemukan."
          }`,
        );
      }

      // Metadata berhasil tersimpan. Jangan hapus objek Storage lagi,
      // sekalipun pencatatan activity log berikutnya mengalami kegagalan.
      uploadedStoragePath = null;

      // =====================================
      // 8. ACTIVITY LOG (BEST-EFFORT)
      // =====================================
      try {
        const { error: logError } = await createActivityLog({
          action: "UPLOAD_FILE",
          description: `Mengunggah file "${file.name}"`,
          projectId: verifiedProjectId,
          metadata: {
            file_id: insertedFile.id,
            file_name: file.name,
            storage_path: filePath,
            mime_type: file.type || "application/octet-stream",
            file_size: file.size,
            task_id: taskIdForUpload,
            client_visible: visibilityForUpload,
          },
        });

        if (logError) {
          console.error("Activity log error:", logError);
        }
      } catch (logErr) {
        console.error("Activity log error:", logErr);
      }

      // =====================================
      // 9. SUCCESS
      // =====================================
      setSuccess("File berhasil diunggah.");
      setFile(null);
      setTaskId("");

      if (currentIsStaff) {
        setProjectId("");
      }

      setClientVisible(false);

      const fileInput = document.getElementById(
        "file",
      ) as HTMLInputElement | null;

      if (fileInput) {
        fileInput.value = "";
      }

      setTimeout(() => {
        router.push("/dashboard/files");
        router.refresh();
      }, 700);
    } catch (err) {
      let errorMessage =
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat mengunggah file.";

      // =====================================
      // 10. CLEANUP STORAGE JIKA INSERT GAGAL
      // Jika cleanup gagal, beri tahu agar objek yatim dapat diperiksa.
      // =====================================
      if (uploadedStoragePath) {
        try {
          const { error: cleanupError } = await supabase.storage
            .from("project-files")
            .remove([uploadedStoragePath]);

          if (cleanupError) {
            console.error("Gagal membersihkan file Storage:", cleanupError);
            errorMessage +=
              " File juga gagal dibersihkan dari Storage. Perlu pemeriksaan Storage lebih lanjut.";
          } else {
            uploadedStoragePath = null;
          }
        } catch (cleanupErr) {
          console.error("Gagal membersihkan file Storage:", cleanupErr);
          errorMessage +=
            " Pembersihan file Storage mengalami kendala. Perlu pemeriksaan Storage lebih lanjut.";
        }
      }

      setError(errorMessage);
      setLoading(false);
    }
  }

  const selectedProject = projects.find(
    (project) => String(project.id) === String(projectId),
  );

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-5 py-6 text-[#1f1e30] sm:px-7 lg:px-8">
      {/* TOMBOL KEMBALI */}
      <BackLink />

      {/* ERROR */}
      {error && (
        <div
          role="alert"
          className="mb-6 max-w-5xl rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-red-600"
        >
          {error}
        </div>
      )}

      {/* SUCCESS */}
      {success && (
        <div
          role="status"
          className="mb-6 max-w-4xl rounded-xl border border-[#B7FE1A]/40 bg-[#f1ffcc] px-4 py-3 text-sm text-[#3F6212]"
        >
          {success}
        </div>
      )}

      {/* FORM */}
      <form onSubmit={handleSubmit} className={formClass}>
        {/* PROJECT */}
        {!isStaff && (
          <div className={fieldClass}>
            <label htmlFor="project" className={TEXT.label}>
              Proyek <span className="text-red-500">*</span>
            </label>

            <CustomSelect
              id="project"
              value={projectId}
              onChange={(e) => handleProjectChange(e.target.value)}
              required
              disabled={loadingProjects || loading}
            >
              <option value="" disabled hidden>
                Pilih proyek
              </option>

              {loadingProjects && (
                <option value="" disabled>
                  Memuat proyek...
                </option>
              )}

              {!loadingProjects && projects.length === 0 && (
                <option value="" disabled>
                  Belum ada proyek
                </option>
              )}

              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.project_name}
                </option>
              ))}
            </CustomSelect>

            {projects.length === 0 && !loadingProjects && (
              <p className="text-xs leading-5 text-[#777777]">
                Belum ada proyek. Tambahkan proyek terlebih dahulu sebelum
                mengunggah file.
              </p>
            )}
          </div>
        )}

        {/* STAFF PROJECT INFORMATION */}
        {isStaff && (
          <div className={fieldClass}>
            <label className={TEXT.label}>Proyek</label>

            <div className="flex min-h-[54px] w-full items-center rounded-xl border border-[#EEEEEE] bg-[#f7f7f5] px-4 text-sm text-[#777777]">
              {selectedProject
                ? selectedProject.project_name
                : "Proyek akan terisi otomatis setelah memilih tugas"}
            </div>
          </div>
        )}

        {/* TASK */}
        <div className={fieldClass}>
          <label htmlFor="task" className={TEXT.label}>
            Tugas {isStaff && <span className="text-red-500">*</span>}
            {!isStaff && (
              <span className="font-normal text-[#999999]">(Opsional)</span>
            )}
          </label>

          <CustomSelect
            id="task"
            value={taskId}
            onChange={(e) => handleTaskChange(e.target.value)}
            required={isStaff}
            disabled={
              loading ||
              loadingProjects ||
              loadingTasks ||
              (!isStaff && !projectId) ||
              (isStaff && tasks.length === 0)
            }
          >
            <option value="">
              {loadingTasks
                ? "Memuat tugas..."
                : isStaff
                  ? tasks.length === 0
                    ? "Tidak ada tugas yang ditugaskan"
                    : "Pilih tugas"
                  : !projectId
                    ? "Pilih proyek terlebih dahulu"
                    : tasks.length === 0
                      ? "Tidak ada tugas pada proyek ini"
                      : "File tidak terkait tugas"}
            </option>

            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </CustomSelect>
        </div>

        {/* FILE */}
        <div className="rounded-xl border border-[#EEEEEE] bg-[#f7f7f5] p-5">
          <div className="flex flex-wrap items-center gap-3">
            <label
              htmlFor="file"
              className={`inline-flex h-11 items-center justify-center rounded-xl !bg-[#B7FE1A] px-4 text-sm font-medium text-[#1f1e30] transition-colors hover:!bg-[#a8ed12] ${
                loading ? "cursor-not-allowed opacity-50" : "cursor-pointer"
              }`}
            >
              Pilih File
            </label>

            <span className="break-all text-sm text-[#777777]">
              {file ? file.name : "Belum ada file dipilih"}
            </span>

            <input
              id="file"
              type="file"
              onChange={handleFileChange}
              disabled={loading}
              className="hidden"
            />
          </div>

          {file && (
            <div className="mt-5 rounded-xl border border-[#EEEEEE] bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-[#777777]">
                File terpilih
              </p>

              <p className="mt-2 break-all text-sm font-medium text-[#1f1e30]">
                {file.name}
              </p>

              <p className="mt-1 text-xs text-[#777777]">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          )}

          <p className="mt-3 text-xs text-[#777777]">
            Ukuran file maksimal 50 MB.
          </p>
        </div>

        {/* CLIENT VISIBILITY */}
        {canManageVisibility && (
          <div className="flex items-start gap-3 rounded-xl border border-[#EEEEEE] bg-[#f7f7f5] p-4">
            <input
              id="clientVisible"
              type="checkbox"
              checked={clientVisible}
              onChange={(e) => setClientVisible(e.target.checked)}
              disabled={loading}
              className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[#B7FE1A] disabled:cursor-not-allowed"
            />

            <div>
              <label
                htmlFor="clientVisible"
                className="cursor-pointer text-sm font-medium text-[#1f1e30]"
              >
                Tampilkan kepada klien
              </label>

              <p className="mt-1 text-sm leading-6 text-[#777777]">
                Jika diaktifkan, file dapat dilihat oleh klien melalui halaman
                proyek publik.
              </p>
            </div>
          </div>
        )}

        {/* STAFF VISIBILITY INFORMATION */}
        {isStaff && (
          <div className="flex items-start gap-3 rounded-2xl border border-[#EEEEEE] bg-[#f7f7f5] p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f1ffcc] text-[#1f1e30]">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-base font-medium leading-6 text-[#1f1e30]">
                Visibilitas file: Internal
              </p>
              <p className="mt-1 text-sm leading-6 text-[#777777]">
                File yang diunggah oleh Staff berstatus Internal dan hanya dapat
                dibagikan kepada klien setelah ditinjau oleh Admin atau Project
                Manager.
              </p>
            </div>
          </div>
        )}

        {/* BUTTONS */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
            disabled={
              loading ||
              loadingProjects ||
              loadingTasks ||
              projects.length === 0 ||
              (isStaff && tasks.length === 0)
            }
            className={TEXT.primaryButton}
          >
            {loading ? "Mengunggah..." : "Unggah"}
          </button>
        </div>
      </form>
    </main>
  );
}
