"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from "react";
import type { SelectHTMLAttributes } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/client";
import { createActivityLog } from "../../../../../lib/activity-log";

type Project = {
  id: string;
  project_name: string;
};

type Task = {
  id: string;
  title: string;
  project_id: string;
};

type FileRecord = {
  id: string;
  project_id: string;
  uploaded_by: string;
  task_id: string | null;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  file_size: number | null;
  client_visible: boolean;
};

const TEXT = {
  label: "block text-sm font-medium text-[#1f1e30]",
  input:
    "h-[54px] w-full rounded-xl border border-[#EEEEEE] bg-white px-4 text-sm text-[#1f1e30] outline-none transition-colors placeholder:text-[#999999] focus:border-[#1f1e30] disabled:cursor-not-allowed disabled:opacity-50",
  primaryButton:
    "inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#B7FE1A] px-4 text-sm font-medium text-[#1f1e30] transition-colors hover:bg-[#a8ed12] disabled:cursor-not-allowed disabled:opacity-50 sm:w-[150px]",
  secondaryButton:
    "inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#1f1e30] px-4 text-sm font-normal text-white transition-colors hover:bg-[#333247] disabled:cursor-not-allowed disabled:opacity-50 sm:w-[130px]",
};

const fieldClass = "flex flex-col gap-2";
const formClass =
  "flex max-w-5xl flex-col gap-6 rounded-2xl border border-[#EEEEEE] bg-white p-5 shadow-[0_2px_10px_rgba(31,30,48,0.04)] sm:p-8";

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

export default function EditFilePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const fileId = params.id;
  const [supabase] = useState(() => createClient());

  const [record, setRecord] = useState<FileRecord | null>(null);
  const [role, setRole] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const [clientVisible, setClientVisible] = useState(false);

  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoadingPage(true);
      setError("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace("/login");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();

        if (
          profileError ||
          !profile ||
          !["Admin", "Project Manager"].includes(profile.role)
        ) {
          router.replace("/dashboard/files");
          return;
        }

        if (active) setRole(profile.role);

        const [
          { data: fileData, error: fileError },
          { data: projectData, error: projectError },
        ] = await Promise.all([
          supabase
            .from("files")
            .select(
              "id, project_id, uploaded_by, task_id, file_name, storage_path, mime_type, file_size, client_visible",
            )
            .eq("id", fileId)
            .maybeSingle(),
          supabase
            .from("projects")
            .select("id, project_name")
            .eq("is_archived", false)
            .order("project_name", { ascending: true }),
        ]);

        if (fileError || !fileData) {
          throw new Error(
            fileError?.message ||
              "File tidak ditemukan atau tidak dapat diakses.",
          );
        }

        if (profile.role === "Staff" && fileData.uploaded_by !== user.id) {
          router.replace("/dashboard/files");
          return;
        }

        if (projectError) {
          throw new Error(`Gagal memuat proyek: ${projectError.message}`);
        }

        const currentProjectExists = (projectData || []).some(
          (project) => String(project.id) === String(fileData.project_id),
        );

        const availableProjects = (projectData || []) as Project[];

        // Proyek asal tetap ditampilkan jika saat ini sudah diarsipkan.
        if (!currentProjectExists) {
          const { data: currentProject, error: currentProjectError } =
            await supabase
              .from("projects")
              .select("id, project_name")
              .eq("id", fileData.project_id)
              .maybeSingle();

          if (currentProjectError) {
            throw new Error(
              `Gagal memuat proyek file: ${currentProjectError.message}`,
            );
          }

          if (currentProject) {
            availableProjects.unshift(currentProject as Project);
          }
        }

        if (!active) return;

        setRecord(fileData as FileRecord);
        setProjects(availableProjects);
        setProjectId(String(fileData.project_id));
        setTaskId(fileData.task_id ? String(fileData.task_id) : "");
        setClientVisible(Boolean(fileData.client_visible));
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Terjadi kesalahan saat memuat data file.",
          );
        }
      } finally {
        if (active) setLoadingPage(false);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [fileId, router, supabase]);

  useEffect(() => {
    let active = true;

    async function loadProjectTasks() {
      if (!projectId) {
        setTasks([]);
        return;
      }

      setLoadingTasks(true);

      const { data, error: tasksError } = await supabase
        .from("tasks")
        .select("id, title, project_id")
        .eq("project_id", projectId)
        .order("title", { ascending: true });

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
  }, [projectId, supabase]);

  function handleProjectChange(value: string) {
    setProjectId(value);
    setTaskId("");
    setError("");
    setSuccess("");
  }

  function handleTaskChange(value: string) {
    setTaskId(value);
    setError("");
    setSuccess("");
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] || null;
    setReplacementFile(selectedFile);
    setError("");
    setSuccess("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!record || saving) return;

    setError("");
    setSuccess("");

    if (!projectId) {
      setError("Silakan pilih proyek terlebih dahulu.");
      return;
    }

    if (replacementFile && replacementFile.size > 50 * 1024 * 1024) {
      setError("Ukuran file maksimal 50 MB.");
      return;
    }

    setSaving(true);
    let newStoragePath: string | null = null;

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(
          "Session login tidak ditemukan. Silakan login kembali.",
        );
      }

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (
        profileError ||
        !profile ||
        !["Admin", "Project Manager"].includes(profile.role)
      ) {
        throw new Error("Kamu tidak memiliki izin untuk mengedit file.");
      }

      const { data: selectedProject, error: projectError } = await supabase
        .from("projects")
        .select("id")
        .eq("id", projectId)
        .eq("is_archived", false)
        .maybeSingle();

      // Proyek arsip hanya boleh dipertahankan jika tidak diganti.
      const keepingArchivedProject =
        String(projectId) === String(record.project_id);

      if (
        projectError ||
        (!selectedProject && !keepingArchivedProject)
      ) {
        throw new Error(
          "Proyek tidak ditemukan, sudah diarsipkan, atau kamu tidak memiliki akses.",
        );
      }

      if (taskId) {
        const { data: selectedTask, error: taskError } = await supabase
          .from("tasks")
          .select("id, project_id")
          .eq("id", taskId)
          .eq("project_id", projectId)
          .maybeSingle();

        if (taskError || !selectedTask) {
          throw new Error(
            "Tugas tidak ditemukan atau tidak termasuk dalam proyek yang dipilih.",
          );
        }
      }

      let nextStoragePath = record.storage_path;
      let nextFileName = record.file_name;
      let nextMimeType = record.mime_type || "application/octet-stream";
      let nextFileSize = record.file_size;

      if (replacementFile) {
        const safeFileName = replacementFile.name.replace(
          /[^a-zA-Z0-9._-]/g,
          "_",
        );
        const uniqueFileName = `${crypto.randomUUID()}-${safeFileName}`;
        const filePath = taskId
          ? `${projectId}/${taskId}/${uniqueFileName}`
          : `${projectId}/${uniqueFileName}`;

        const { error: uploadError } = await supabase.storage
          .from("project-files")
          .upload(filePath, replacementFile, {
            cacheControl: "3600",
            upsert: false,
            contentType:
              replacementFile.type || "application/octet-stream",
          });

        if (uploadError) {
          throw new Error(`Unggah Storage gagal: ${uploadError.message}`);
        }

        newStoragePath = filePath;
        nextStoragePath = filePath;
        nextFileName = replacementFile.name;
        nextMimeType =
          replacementFile.type || "application/octet-stream";
        nextFileSize = replacementFile.size;
      }

      const { data: updatedFile, error: updateError } = await supabase
        .from("files")
        .update({
          project_id: projectId,
          task_id: taskId || null,
          file_name: nextFileName,
          storage_path: nextStoragePath,
          mime_type: nextMimeType,
          file_size: nextFileSize,
          client_visible: clientVisible,
        })
        .eq("id", record.id)
        .select("id")
        .maybeSingle();

      if (updateError || !updatedFile) {
        throw new Error(
          updateError?.message ||
            "Data file tidak berhasil diperbarui. Kamu mungkin tidak memiliki izin.",
        );
      }

      // Database sudah menunjuk ke file baru; file lama baru dibersihkan setelah update berhasil.
      if (newStoragePath) {
        const { error: removeOldError } = await supabase.storage
          .from("project-files")
          .remove([record.storage_path]);

        if (removeOldError) {
          console.error(
            "File baru tersimpan, tetapi file lama gagal dibersihkan:",
            removeOldError,
          );
        } else {
          newStoragePath = null;
        }
      }

      try {
        const { error: logError } = await createActivityLog({
          action: "UPDATE_FILE",
          description: replacementFile
            ? `Memperbarui file "${record.file_name}" menjadi "${nextFileName}"`
            : `Memperbarui informasi file "${record.file_name}"`,
          projectId,
          metadata: {
            file_id: record.id,
            previous_project_id: record.project_id,
            new_project_id: projectId,
            previous_task_id: record.task_id,
            new_task_id: taskId || null,
            previous_file_name: record.file_name,
            new_file_name: nextFileName,
            file_replaced: Boolean(replacementFile),
            client_visible: clientVisible,
          },
        });

        if (logError) console.error("Activity log error:", logError);
      } catch (logError) {
        console.error("Activity log error:", logError);
      }

      // Bila file baru berhasil diunggah tetapi pembaruan database gagal,
      // objek baru dibersihkan di blok catch di bawah.
      if (newStoragePath) {
        newStoragePath = null;
      }

      router.push("/dashboard/files?success=updated");
      router.refresh();
    } catch (err) {
      if (newStoragePath) {
        const { error: cleanupError } = await supabase.storage
          .from("project-files")
          .remove([newStoragePath]);

        if (cleanupError) {
          console.error("Gagal membersihkan file pengganti:", cleanupError);
        }
      }

      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat memperbarui file.",
      );
      setSaving(false);
    }
  }

  const selectedTask = tasks.find(
    (task) => String(task.id) === String(taskId),
  );

  const isDisabled = loadingPage || saving || !record;

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-5 py-6 text-[#1f1e30] sm:px-7 lg:px-8">
      <BackLink />

      {error && (
        <div
          role="alert"
          className="mb-6 max-w-5xl rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-red-600"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="mb-6 max-w-4xl rounded-xl border border-[#B7FE1A]/40 bg-[#f1ffcc] px-4 py-3 text-sm text-[#3F6212]"
        >
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className={formClass}>
        {/* PROJECT */}
        <div className={fieldClass}>
          <label htmlFor="project" className={TEXT.label}>
            Proyek <span className="text-red-500">*</span>
          </label>

          <CustomSelect
            id="project"
            value={projectId}
            onChange={(event) => handleProjectChange(event.target.value)}
            required
            disabled={isDisabled || role === "Staff"}
          >
            <option value="" disabled>
              {loadingPage
                ? "Memuat proyek..."
                : projects.length === 0
                  ? "Belum ada proyek"
                  : "Pilih proyek"}
            </option>

            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.project_name}
              </option>
            ))}
          </CustomSelect>
        </div>

        {/* TASK */}
        <div className={fieldClass}>
          <label htmlFor="task" className={TEXT.label}>
            Tugas <span className="font-normal text-[#999999]">(Opsional)</span>
          </label>

          <CustomSelect
            id="task"
            value={taskId}
            onChange={(event) => handleTaskChange(event.target.value)}
            disabled={isDisabled || loadingTasks || !projectId || role === "Staff"}
          >
            <option value="">
              {loadingTasks
                ? "Memuat tugas..."
                : !projectId
                  ? "Pilih proyek terlebih dahulu"
                  : tasks.length === 0
                    ? "Tidak ada tugas pada proyek ini"
                    : "File tidak terkait tugas"}
            </option>

            {taskId && !selectedTask && record?.task_id === taskId && (
              <option value={taskId}>Tugas saat ini</option>
            )}

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
                isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
              }`}
            >
              Pilih File Baru
            </label>

            <span className="break-all text-sm text-[#777777]">
              {replacementFile
                ? replacementFile.name
                : "Tidak ada file baru dipilih"}
            </span>

            <input
              id="file"
              type="file"
              onChange={handleFileChange}
              disabled={isDisabled}
              className="hidden"
            />
          </div>

          <div className="mt-5 rounded-xl border border-[#EEEEEE] bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-[#777777]">
              File saat ini
            </p>
            <p className="mt-2 break-all text-sm font-medium text-[#1f1e30]">
              {record?.file_name || (loadingPage ? "Memuat..." : "-")}
            </p>
            {record?.file_size !== null && record?.file_size !== undefined && (
              <p className="mt-1 text-xs text-[#777777]">
                {(record.file_size / (1024 * 1024)).toFixed(2)} MB
              </p>
            )}
          </div>

          {replacementFile && (
            <div className="mt-3 rounded-xl border border-[#EEEEEE] bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-[#777777]">
                File pengganti
              </p>
              <p className="mt-2 break-all text-sm font-medium text-[#1f1e30]">
                {replacementFile.name}
              </p>
              <p className="mt-1 text-xs text-[#777777]">
                {(replacementFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          )}

          <p className="mt-3 text-xs text-[#777777]">
            Kosongkan pilihan file jika tidak ingin mengganti file yang
            tersimpan. Ukuran file maksimal 50 MB.
          </p>
        </div>

        {/* CLIENT VISIBILITY - HANYA ADMIN DAN PROJECT MANAGER */}
        {role !== "Staff" && (
          <div className="flex items-start gap-3 rounded-xl border border-[#EEEEEE] bg-[#f7f7f5] p-4">
            <input
              id="clientVisible"
              type="checkbox"
              checked={clientVisible}
              onChange={(event) => setClientVisible(event.target.checked)}
              disabled={isDisabled}
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
                Jika diaktifkan, file dapat dilihat oleh klien melalui halaman proyek publik.
              </p>
            </div>
          </div>
        )}

        {/* STAFF VISIBILITY INFORMATION */}
        {role === "Staff" && (
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
            disabled={saving}
            className={TEXT.secondaryButton}
          >
            Batal
          </button>

          <button
            type="submit"
            disabled={isDisabled || loadingTasks}
            className={TEXT.primaryButton}
          >
            {loadingPage
              ? "Memuat..."
              : saving
                ? "Menyimpan..."
                : "Simpan"}
          </button>
        </div>
      </form>
    </main>
  );
}
