"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import { createActivityLog } from "../../../lib/activity-log";

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
  created_at: string;
  projects:
    | {
        project_name: string;
        is_archived: boolean;
      }
    | {
        project_name: string;
        is_archived: boolean;
      }[]
    | null;
  tasks: { title: string | null } | { title: string | null }[] | null;
  uploader:
    | { name: string | null; role: string | null }
    | { name: string | null; role: string | null }[]
    | null;
};

const TEXT = {
  sectionTitle: "text-lg font-semibold text-[#1f1e30]",
  subtitle: "mt-1 text-sm text-[#777777]",
  primary: "text-sm font-medium text-[#1f1e30]",
  secondary: "text-sm text-[#555563]",

  action:
    "inline-flex items-center justify-center rounded-lg border border-[#EEEEEE] bg-white px-3 py-2 text-xs font-medium text-[#555563] transition-colors hover:bg-[#f7f7f5] hover:text-[#1f1e30] disabled:cursor-not-allowed disabled:opacity-50",

  card: "overflow-hidden rounded-2xl border border-[#EEEEEE] bg-white shadow-[0_2px_10px_rgba(31,30,48,0.04)]",
};

const editButtonClass =
  "inline-flex cursor-pointer items-center justify-center rounded-lg border border-[#65A30D] bg-[#f1ffcc] px-3 py-1.5 text-sm font-normal text-[#65A30D] transition-colors hover:bg-[#e7f7b8]";

const downloadButtonClass =
  "inline-flex cursor-pointer items-center justify-center rounded-lg border border-[#D97706] bg-[#feefd2] px-3 py-1.5 text-sm font-normal text-[#D97706] transition-colors hover:bg-[#f9e4bd] disabled:cursor-not-allowed disabled:opacity-50";

const deleteButtonClass =
  "inline-flex cursor-pointer items-center justify-center rounded-lg border border-[#DC2626] bg-[#fce2d3] px-3 py-1.5 text-sm font-normal text-[#DC2626] transition-colors hover:bg-[#f7d3c1] disabled:cursor-not-allowed disabled:opacity-50";

export default function FilesClient({ initialRole }: { initialRole: string }) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [files, setFiles] = useState<FileRecord[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Terapkan pencarian setelah pengguna berhenti mengetik selama 500 ms.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 500);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FileRecord | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [updatingVisibilityId, setUpdatingVisibilityId] = useState<
    string | null
  >(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pendingDeleteSuccess, setPendingDeleteSuccess] = useState("");

  useEffect(() => {
    if (!success) return;

    const timeout = setTimeout(() => setSuccess(""), 3000);
    return () => clearTimeout(timeout);
  }, [success]);

  // Tampilkan notifikasi penghapusan setelah scroll ke atas selesai.
  useEffect(() => {
    if (!pendingDeleteSuccess) return;

    let finished = false;
    let fallbackTimeout: number | undefined;

    const showNotification = () => {
      if (finished) return;
      finished = true;

      if (fallbackTimeout !== undefined) {
        window.clearTimeout(fallbackTimeout);
      }
      window.removeEventListener("scrollend", showNotification);
      setSuccess(pendingDeleteSuccess);
      setPendingDeleteSuccess("");
    };

    // Jika halaman sudah berada di paling atas, tidak perlu menunggu scroll.
    if (window.scrollY <= 0) {
      showNotification();
      return;
    }

    window.addEventListener("scrollend", showNotification, { once: true });
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Fallback untuk browser yang belum mendukung event scrollend.
    fallbackTimeout = window.setTimeout(showNotification, 3000);

    return () => {
      if (fallbackTimeout !== undefined) {
        window.clearTimeout(fallbackTimeout);
      }
      window.removeEventListener("scrollend", showNotification);
    };
  }, [pendingDeleteSuccess]);
  const [role, setRole] = useState(initialRole);
  const [currentUserId, setCurrentUserId] = useState("");

  // CHECK ROLE + LOAD FILES
  useEffect(() => {
    let isMounted = true;

    async function initializePage() {
      setLoading(true);
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

        if (profileError || !profile) {
          router.replace("/dashboard");
          return;
        }

        const allowedRoles = ["Admin", "Project Manager", "Staff"];

        if (!allowedRoles.includes(profile.role)) {
          router.replace("/dashboard");
          return;
        }

        if (isMounted) {
          setRole(profile.role);
          setCurrentUserId(user.id);
          await loadFiles(profile.role, user.id);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Terjadi kesalahan saat memuat data file.",
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initializePage();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, supabase]);

  // LOAD FILES DARI PROYEK AKTIF.
  // Staff hanya melihat file yang terhubung dengan tugas yang ditugaskan kepadanya.
  async function loadFiles(currentRole: string, currentUserId: string) {
    setError("");

    let assignedTaskIds: string[] = [];

    if (currentRole === "Staff") {
      const { data: assignedTasks, error: tasksError } = await supabase
        .from("tasks")
        .select("id")
        .eq("assigned_to", currentUserId);

      if (tasksError) {
        throw new Error(`Gagal memuat tugas Staff: ${tasksError.message}`);
      }

      assignedTaskIds = (assignedTasks || []).map((task) => task.id);

      if (assignedTaskIds.length === 0) {
        setFiles([]);
        return;
      }
    }

    let query = supabase
      .from("files")
      .select(
        `
        id,
        project_id,
        uploaded_by,
        task_id,
        file_name,
        storage_path,
        mime_type,
        file_size,
        client_visible,
        created_at,
        projects (
          project_name,
          is_archived
        ),
        tasks!files_task_id_fkey (
          title
        ),
        uploader:users!files_uploaded_by_fkey (
          name,
          role
        )
      `,
      );

    if (currentRole === "Staff") {
      // RLS projects tidak memberikan akses baca proyek secara umum kepada Staff.
      // File Staff tetap dimuat berdasarkan task yang ditugaskan kepadanya.
      // Jangan gunakan inner join atau filter projects.is_archived di sini,
      // karena relasi projects dapat tidak terlihat oleh Staff.
      query = query.in("task_id", assignedTaskIds);
    } else {
      // Admin dan PM hanya melihat file dari proyek aktif.
      query = query.eq("projects.is_archived", false);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      throw new Error(`Gagal memuat daftar file: ${error.message}`);
    }

    setFiles((data || []) as unknown as FileRecord[]);
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
      month: "short",
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

  // GET TASK
  function getTask(tasks: FileRecord["tasks"]) {
    if (Array.isArray(tasks)) {
      return tasks[0] || null;
    }

    return tasks;
  }

  // GET UPLOADER
  function getUploader(uploader: FileRecord["uploader"]) {
    if (Array.isArray(uploader)) {
      return uploader[0] || null;
    }

    return uploader;
  }

  // FILTER FILE BERDASARKAN NAMA FILE, TIPE, PROYEK, DAN TUGAS.
  const keyword = debouncedSearch.trim().toLowerCase();

  const filteredFiles = files.filter((file) => {
    const project = getProject(file.projects);
    const task = getTask(file.tasks);

    if (!keyword) return true;

    return (
      file.file_name.toLowerCase().includes(keyword) ||
      (file.mime_type || "").toLowerCase().includes(keyword) ||
      (project?.project_name || "").toLowerCase().includes(keyword) ||
      (task?.title || "").toLowerCase().includes(keyword)
    );
  });

  // DOWNLOAD FILE
  async function handleDownload(file: FileRecord) {
    if (downloadingId || deletingId === file.id) return;

    setDownloadingId(file.id);
    setError("");
    setSuccess("");

    try {
      const { data, error: downloadError } = await supabase.storage
        .from("project-files")
        .createSignedUrl(file.storage_path, 60, {
          download: file.file_name,
        });

      if (downloadError || !data?.signedUrl) {
        throw new Error(
          downloadError?.message || "Gagal membuat tautan unduhan.",
        );
      }

      // Tampilkan notifikasi setelah tautan unduhan berhasil dibuat.
      setPendingDeleteSuccess("Unduhan file berhasil dimulai.");

      // Arahkan browser ke signed URL dengan Content-Disposition attachment,
      // sehingga file diunduh, bukan dibuka di tab baru.
      window.location.assign(data.signedUrl);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat mengunduh file.",
      );
    } finally {
      setDownloadingId(null);
    }
  }

  // UBAH VISIBILITAS FILE
  async function handleToggleVisibility(file: FileRecord) {
    const newVisibility = !file.client_visible;

    const confirmed = window.confirm(
      newVisibility
        ? `Tampilkan file "${file.file_name}" kepada klien?\n\nKlien dapat melihat file ini melalui halaman proyek publik.`
        : `Sembunyikan file "${file.file_name}" dari klien?\n\nFile hanya dapat dilihat oleh tim internal.`,
    );

    if (!confirmed) return;

    setUpdatingVisibilityId(file.id);
    setError("");
    setSuccess("");

    try {
      // UPDATE DATABASE
      const { data: updatedFile, error: updateError } = await supabase
        .from("files")
        .update({
          client_visible: newVisibility,
        })
        .eq("id", file.id)
        .select("id")
        .maybeSingle();

      if (updateError) {
        throw new Error(
          `Gagal mengubah visibilitas file: ${updateError.message}`,
        );
      }

      if (!updatedFile) {
        throw new Error(
          "Visibilitas file tidak berubah. Kamu mungkin tidak memiliki izin.",
        );
      }

      // ACTIVITY LOG (best-effort; kegagalan log tidak membatalkan update file)
      try {
        const { error: logError } = await createActivityLog({
          action: "UPDATE_FILE_VISIBILITY",
          description: newVisibility
            ? `Menampilkan file "${file.file_name}" kepada klien`
            : `Mengubah visibilitas file "${file.file_name}" menjadi internal`,
          projectId: file.project_id,
          metadata: {
            file_id: file.id,
            file_name: file.file_name,
            previous_visibility: file.client_visible,
            new_visibility: newVisibility,
          },
        });

        if (logError) {
          console.error("Activity log error:", logError);
        }
      } catch (logErr) {
        console.error("Activity log error:", logErr);
      }

      // UPDATE UI
      setFiles((current) =>
        current.map((item) =>
          item.id === file.id
            ? {
                ...item,
                client_visible: newVisibility,
              }
            : item,
        ),
      );

      setSuccess(
        newVisibility
          ? "File berhasil ditampilkan kepada klien."
          : "File berhasil disembunyikan dari klien.",
      );
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Terjadi kesalahan saat mengubah visibilitas file.");
      }
    } finally {
      setUpdatingVisibilityId(null);
    }
  }

  // BUKA POPUP KONFIRMASI HAPUS FILE
  function handleDelete(file: FileRecord) {
    if (deletingId) return;
    setDeleteError("");
    setDeleteTarget(file);
  }

  // KONFIRMASI HAPUS FILE
  async function confirmDelete() {
    if (!deleteTarget || deletingId) return;

    // Hanya Admin dan PM yang boleh menghapus file.
    // RLS tetap menjadi pengamanan utama di database.
    if (role !== "Admin" && role !== "Project Manager") {
      setDeleteError("Kamu tidak memiliki izin untuk menghapus file.");
      return;
    }

    const file = deleteTarget;
    setDeletingId(file.id);
    setDeleteError("");
    setError("");
    setSuccess("");

    try {
      // 1. HAPUS RECORD DATABASE TERLEBIH DAHULU.
      // Ini mencegah record file tertinggal jika file Storage sudah terhapus
      // tetapi penghapusan database gagal.
      const { data: deletedFile, error: databaseError } = await supabase
        .from("files")
        .delete()
        .eq("id", file.id)
        .select("id")
        .maybeSingle();

      if (databaseError) {
        throw new Error(`Gagal menghapus data file: ${databaseError.message}`);
      }

      if (!deletedFile) {
        throw new Error(
          "Data file tidak terhapus. Kamu mungkin tidak memiliki izin atau file sudah tidak tersedia.",
        );
      }

      // Database sudah terhapus. Hapus baris dari UI tanpa menunggu Storage.
      setFiles((current) => current.filter((item) => item.id !== file.id));
      setDeleteTarget(null);

      // 2. HAPUS FILE FISIK DARI STORAGE.
      const { error: storageError } = await supabase.storage
        .from("project-files")
        .remove([file.storage_path]);

      // 3. ACTIVITY LOG (best-effort).
      try {
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
            storage_cleanup_failed: Boolean(storageError),
          },
        });

        if (logError) {
          console.error("Activity log error:", logError);
        }
      } catch (logErr) {
        console.error("Activity log error:", logErr);
      }

      if (storageError) {
        console.error(
          "Database record sudah dihapus, tetapi Storage cleanup gagal:",
          storageError,
        );

        setPendingDeleteSuccess(
          "Data file berhasil dihapus dari database, tetapi file fisik gagal dihapus dari Storage. Perlu pembersihan Storage.",
        );
      } else {
        setPendingDeleteSuccess("File berhasil dihapus.");
      }
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat menghapus file.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-5 py-6 text-[#1f1e30] sm:px-7 lg:px-8">
      {success && (
        <div
          role="status"
          className="mb-5 rounded-xl border border-[#D9EAB5] bg-[#F1FFCC] px-4 py-3 text-sm font-medium text-[#1f1e30]"
        >
          <span>{success}</span>
        </div>
      )}

      {/* HEADER */}
      <div className="mb-8 mt-2 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* SEARCH */}
        <div className="group flex w-full items-center gap-2 rounded-xl border border-[#EEEEEE] bg-white px-4 py-3 shadow-[0_2px_10px_rgba(31,30,48,0.04)] transition-colors focus-within:border-[#1f1e30] md:max-w-sm">
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="shrink-0 text-[#777777] transition-colors group-focus-within:text-[#1f1e30]"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>

          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari file, proyek, atau tugas..."
            className="w-full min-w-0 bg-transparent text-sm text-[#1f1e30] outline-none placeholder:text-[#999999] [appearance:none] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
          />

          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              aria-label="Hapus pencarian"
              className="flex size-5 shrink-0 cursor-pointer items-center justify-center text-[#777777] transition-colors hover:text-[#1f1e30]"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m18 6-12 12" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* TOMBOL UNGGAH */}
        <Link
          href="/dashboard/files/new"
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#B7FE1A] px-4 text-sm font-[500] text-[#1f1e30] transition-colors hover:bg-[#a8ed12] sm:w-[130px]"
        >
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
          Unggah
        </Link>
      </div>

      {/* ERROR */}
      {error && (
        <div
          role="alert"
          className="mb-6 max-w-full rounded-xl border border-red-200 bg-[#fce2d3] px-5 py-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* FILE LIST */}
      <section className={TEXT.card}>
        {/* SECTION HEADER */}
        <div className="border-b border-[#EEEEEE] px-5 py-5 sm:px-6">
          <h2 className={TEXT.sectionTitle}>Daftar File</h2>

          <p className={TEXT.subtitle}>{filteredFiles.length} file terdaftar</p>
        </div>

        {filteredFiles.length > 0 ? (
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-[#D6D3D1] scrollbar-track-transparent hover:scrollbar-thumb-[#A8A8A8]">
            <table
              className={`w-full ${
                role === "Admin" || role === "Project Manager"
                  ? "min-w-[1200px]"
                  : "min-w-[1000px]"
              }`}
            >
              <thead>
                <tr className="border-b border-[#EEEEEE] bg-[#fafaf9] text-left text-xs font-semibold uppercase tracking-wide text-[#777777]">
                  <th className="whitespace-nowrap px-6 py-4">Nama File</th>
                  <th className="px-6 py-4">Proyek</th>
                  {(role === "Admin" || role === "Project Manager") && (
                    <th className="whitespace-nowrap px-6 py-4">
                      Diunggah Oleh
                    </th>
                  )}
                  <th className="whitespace-nowrap px-6 py-4">Ukuran</th>
                  <th className="whitespace-nowrap px-6 py-4">Tanggal</th>
                  <th className="whitespace-nowrap px-6 py-4">Visibilitas</th>
                  <th className="whitespace-nowrap px-6 py-4 text-center">
                    Tindakan
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredFiles.map((file) => {
                  const project = getProject(file.projects);
                  const uploader = getUploader(file.uploader);
                  const canManage =
                    role === "Admin" || role === "Project Manager";

                  return (
                    <tr
                      key={file.id}
                      className="border-b border-[#EEEEEE] last:border-b-0"
                    >
                      {/* FILE */}
                      <td className="px-6 py-4 align-middle">
                        <p className={TEXT.primary}>
                          <span className="break-all">{file.file_name}</span>
                        </p>

                        <p className="mt-1 break-all text-xs text-[#777777]">
                          {file.mime_type || "Tipe file tidak diketahui"}
                        </p>
                      </td>

                      {/* PROJECT */}
                      <td
                        className={`max-w-[280px] px-6 py-4 align-middle ${TEXT.secondary}`}
                      >
                        {role === "Staff"
                          ? "Proyek terkait tugas"
                          : project?.project_name || "-"}
                      </td>

                      {/* UPLOADER - ADMIN DAN PM */}
                      {canManage && (
                        <td className="px-6 py-4 align-middle">
                          <p className={`${TEXT.primary} break-words`}>
                            {uploader?.name || "Pengguna tidak diketahui"}
                          </p>
                          <p className="mt-1 text-xs text-[#777777]">
                            {uploader?.role || "-"}
                          </p>
                        </td>
                      )}

                      {/* SIZE */}
                      <td
                        className={`whitespace-nowrap px-6 py-4 align-middle ${TEXT.secondary}`}
                      >
                        {formatSize(file.file_size)}
                      </td>

                      {/* DATE */}
                      <td className="whitespace-nowrap px-6 py-4 align-middle">
                        <span className={TEXT.secondary}>
                          {formatDate(file.created_at)}
                        </span>
                      </td>

                      {/* VISIBILITY */}
                      <td className="px-6 py-4 align-middle">
                        <div className="flex min-h-full items-center">
                          {canManage ? (
                            <VisibilityToggle
                              checked={file.client_visible}
                              disabled={
                                updatingVisibilityId === file.id ||
                                deletingId === file.id
                              }
                              onChange={() => handleToggleVisibility(file)}
                            />
                          ) : (
                            <VisibilityBadge
                              clientVisible={file.client_visible}
                            />
                          )}
                        </div>
                      </td>

                      {/* ACTION */}
                      <td className="px-6 py-4 align-middle">
                        <div className="flex items-center justify-start gap-2">
                          {canManage && (
                            <Link
                              href={`/dashboard/files/${file.id}/edit`}
                              className={editButtonClass}
                            >
                              Edit
                            </Link>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDownload(file)}
                            disabled={
                              deletingId === file.id ||
                              updatingVisibilityId === file.id ||
                              downloadingId === file.id
                            }
                            className={downloadButtonClass}
                          >
                            {downloadingId === file.id
                              ? "Mengunduh..."
                              : "Unduh"}
                          </button>

                          {canManage && (
                            <button
                              type="button"
                              onClick={() => handleDelete(file)}
                              disabled={
                                deletingId === file.id ||
                                updatingVisibilityId === file.id ||
                                downloadingId === file.id
                              }
                              className={deleteButtonClass}
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
          <div
            className={`flex flex-col items-center justify-center px-5 py-13 text-center ${
              role === "Staff" ? "min-h-[254px]" : ""
            }`}
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#f1ffcc]">
              <FileIcon />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-[#1f1e30]">
              {keyword ? "File Tidak Ditemukan" : "Belum Ada File"}
            </h3>

            <p className="mt-1 text-sm text-[#777777]">
              {keyword
                ? "Tidak ada file yang sesuai dengan pencarian."
                : "Belum ada file yang terdaftar untuk ditampilkan."}
            </p>

            {keyword ? (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="mt-5 inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-[#1f1e30] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#333247] sm:w-[130px]"
              >
                Reset Pencarian
              </button>
            ) : (
              <Link
                href="/dashboard/files/new"
                className="mt-5 inline-flex justify-center whitespace-nowrap text-sm font-medium text-[#65A30D] transition-colors hover:text-[#4D7C0F]"
              >
                Unggah File Pertama
              </Link>
            )}
          </div>
        )}
      </section>

      {/* POPUP KONFIRMASI HAPUS FILE */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm"
          onClick={() => {
            if (deletingId === null) {
              setDeleteTarget(null);
              setDeleteError("");
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-file-title"
            className="w-full max-w-sm rounded-2xl border border-[#EEEEEE] bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f1ffcc] text-[#1f1e30]">
              <svg
                className="h-7 w-7"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="m19 6-1 14H6L5 6" />
                <path d="M10 11v5M14 11v5" />
              </svg>
            </div>

            <h2
              id="delete-file-title"
              className="mt-5 text-center text-lg font-semibold text-[#1f1e30]"
            >
              Hapus File?
            </h2>
            <div className="mx-auto mt-4 w-full max-w-[300px] text-center">
              <p className="text-sm leading-6 text-[#777777] [text-wrap:balance]">
                Apakah kamu yakin ingin menghapus file ini?
              </p>

              <div className="mt-3 w-full rounded-xl border border-[#EEEEEE] bg-[#f7f7f5] px-3 py-3">
                <p className="break-all text-sm font-semibold leading-6 text-[#1f1e30]">
                  {deleteTarget.file_name}
                </p>
              </div>

              <p className="mt-3 text-sm leading-6 text-[#777777] [text-wrap:balance]">
                File akan dihapus dari penyimpanan dan database.
              </p>
            </div>

            {deleteError && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
              >
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                disabled={deletingId !== null}
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteError("");
                }}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#1f1e30] px-5 text-sm font-normal text-white transition-colors hover:bg-[#333247] disabled:cursor-not-allowed disabled:opacity-50 sm:w-[130px]"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deletingId !== null}
                onClick={confirmDelete}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#B7FE1A] px-5 text-sm font-medium text-[#1f1e30] transition-colors hover:bg-[#a8ed12] disabled:cursor-not-allowed disabled:opacity-50 sm:w-[130px]"
              >
                {deletingId !== null ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// TOGGLE VISIBILITAS KLIEN
function VisibilityToggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={
        checked ? "Visibilitas klien aktif" : "Visibilitas klien nonaktif"
      }
      disabled={disabled}
      onClick={onChange}
      className="inline-flex items-center gap-2.5 disabled:cursor-wait"
    >
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${
          checked ? "bg-[#B7FE1A]" : "bg-[#D4D4D4]"
        } ${disabled ? "opacity-50" : ""}`}
      >
        <span
          className={`absolute h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? "translate-x-[23px]" : "translate-x-[3px]"
          }`}
        />
      </span>

      <span className="text-xs font-medium text-[#555563]">
        {checked ? "Client" : "Internal"}
      </span>
    </button>
  );
}

// BADGE VISIBILITAS
function VisibilityBadge({ clientVisible }: { clientVisible: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium text-[#1f1e30] ${
        clientVisible ? "bg-[#f1ffcc]" : "bg-[#F5F5F4]"
      }`}
    >
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
        color: "#1f1e30",
      }}
    >
      folder
    </span>
  );
}
