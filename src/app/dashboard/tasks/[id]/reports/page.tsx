"use client";

import { useCallback, useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/client";
import { createActivityLog } from "../../../../../lib/activity-log";

type Task = {
  id: number;
  title: string | null;
  description: string | null;
  status: string | null;
  assigned_to: string | null;
  project_id: number | string;
  projects: {
    project_name: string | null;
    pic_id: string | null;
  } | null;
};

type TaskReport = {
  id: string;
  task_id: number;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  creatorName: string;
  creatorRole: string;
};

const TEXT = {
  secondaryButton:
    "inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#1f1e30] px-4 text-sm font-normal text-white transition-colors hover:bg-[#333247] disabled:cursor-not-allowed disabled:opacity-50 sm:w-[130px]",
};

export default function TaskReportsPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = Number(params.id);

  const [supabase] = useState(() => createClient());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusDraft, setStatusDraft] = useState("Pending");

  const [task, setTask] = useState<Task | null>(null);
  const [reports, setReports] = useState<TaskReport[]>([]);

  const [currentUserId, setCurrentUserId] = useState("");
  const [role, setRole] = useState("");

  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Notifikasi otomatis hilang setelah 3 detik.
  useEffect(() => {
    if (!successMessage && !errorMessage) return;

    const timeout = setTimeout(() => {
      setSuccessMessage("");
      setErrorMessage("");
    }, 3000);

    return () => clearTimeout(timeout);
  }, [successMessage, errorMessage]);

  const isAdmin = role === "Admin";
  const isStaff = role === "Staff";
  const isProjectManager = role === "Project Manager";

  const canCreateReport =
    isAdmin || (isStaff && task?.assigned_to === currentUserId);

  const canUpdateTaskStatus =
    isAdmin ||
    isProjectManager ||
    (isStaff && task?.assigned_to === currentUserId);

  const canManageReport = (report: TaskReport) =>
    isAdmin || (isStaff && report.created_by === currentUserId);

  const fetchReports = useCallback(async () => {
    const { data, error } = await supabase
      .from("task_reports")
      .select("id, task_id, content, created_by, created_at, updated_at")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const reportData = data ?? [];
    const userIds = [...new Set(reportData.map((report) => report.created_by))];

    let users: {
      id: string;
      name: string | null;
      role: string | null;
    }[] = [];

    if (userIds.length > 0) {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, name, role")
        .in("id", userIds);

      if (!userError) {
        users = userData ?? [];
      }
    }

    const formattedReports: TaskReport[] = reportData.map((report) => {
      const creator = users.find((user) => user.id === report.created_by);

      return {
        ...report,
        creatorName: creator?.name || "Pengguna",
        creatorRole: creator?.role || "",
      };
    });

    setReports(formattedReports);
  }, [supabase, taskId]);

  const loadData = useCallback(async () => {
    if (!Number.isSafeInteger(taskId) || taskId <= 0) {
      setErrorMessage("ID tugas tidak valid.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setErrorMessage(
          "Sesi pengguna tidak ditemukan. Silakan login kembali.",
        );
        return;
      }

      setCurrentUserId(user.id);

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        setErrorMessage("Data pengguna tidak ditemukan.");
        return;
      }

      if (!["Admin", "Project Manager", "Staff"].includes(profile.role)) {
        setErrorMessage("Kamu tidak memiliki akses ke halaman ini.");
        return;
      }

      setRole(profile.role);

      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .select(
          `
          id,
          title,
          description,
          status,
          assigned_to,
          project_id,
          projects (
            project_name,
            pic_id
          )
        `,
        )
        .eq("id", taskId)
        .single();

      if (taskError || !taskData) {
        setErrorMessage(
          "Tugas tidak ditemukan atau kamu tidak memiliki akses.",
        );
        return;
      }

      const normalizedTask = taskData as unknown as Task;

      if (
        profile.role === "Project Manager" &&
        normalizedTask.projects?.pic_id !== user.id
      ) {
        setErrorMessage("Kamu tidak memiliki akses ke tugas ini.");
        return;
      }

      if (profile.role === "Staff" && normalizedTask.assigned_to !== user.id) {
        setErrorMessage("Tugas ini bukan tugas yang ditugaskan kepadamu.");
        return;
      }

      setTask(normalizedTask);
      setStatusDraft(normalizedTask.status || "Pending");

      await fetchReports();
    } catch (error) {
      console.error("Gagal memuat laporan tugas:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat memuat laporan.",
      );
    } finally {
      setLoading(false);
    }
  }, [supabase, taskId, fetchReports]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleStatusUpdate() {
    if (!task || !canUpdateTaskStatus || savingStatus) return;

    // Staff hanya boleh mengubah Pending menjadi In Progress
    if (isStaff) {
      if (task.status !== "Pending") {
        setErrorMessage(
          "Staff hanya dapat memulai tugas yang berstatus Belum Dimulai.",
        );
        return;
      }

      if (statusDraft !== "In Progress") {
        setErrorMessage("Staff hanya diperbolehkan memulai tugas.");
        return;
      }
    }

    if (!["Pending", "In Progress", "Completed"].includes(statusDraft)) {
      setErrorMessage("Status tugas tidak valid.");
      return;
    }

    if (statusDraft === (task.status || "Pending")) {
      setSuccessMessage("");
      setErrorMessage("");
      return;
    }

    setSavingStatus(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      let updateQuery = supabase
        .from("tasks")
        .update({ status: statusDraft })
        .eq("id", task.id);

      if (isStaff) {
        updateQuery = updateQuery
          .eq("assigned_to", currentUserId)
          .eq("status", "Pending");
      }

      const { data: updatedTask, error: updateError } = await updateQuery
        .select("id, project_id, title, status")
        .single();

      if (updateError || !updatedTask) {
        throw updateError || new Error("Status tugas gagal diperbarui.");
      }

      const previousStatus = task.status || "Pending";

      setTask((current) =>
        current ? { ...current, status: updatedTask.status } : current,
      );
      setStatusDraft(updatedTask.status || "Pending");
      setSuccessMessage("Status tugas berhasil diperbarui.");

      const { error: logError } = await createActivityLog({
        action: "UPDATE_TASK",
        description: `Memperbarui status tugas "${updatedTask.title || task.title || "Tanpa judul"}"`,
        projectId: updatedTask.project_id,
        metadata: {
          task_id: updatedTask.id,
          old_data: { status: previousStatus },
          new_data: { status: updatedTask.status },
        },
      });

      if (logError) {
        console.error("Gagal mencatat aktivitas perubahan status:", logError);
      }
    } catch (error) {
      console.error("Gagal memperbarui status tugas:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gagal memperbarui status tugas.",
      );
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!content.trim() || saving || !currentUserId) return;

    if (!canCreateReport && !editingId) return;

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (editingId) {
        const existingReport = reports.find(
          (report) => report.id === editingId,
        );

        if (!existingReport || !canManageReport(existingReport)) {
          setErrorMessage("Kamu tidak memiliki izin mengubah laporan ini.");
          return;
        }

        const { error } = await supabase
          .from("task_reports")
          .update({
            content: content.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingId);

        if (error) throw error;

        setSuccessMessage("Laporan berhasil diperbarui.");
      } else {
        const { error } = await supabase.from("task_reports").insert({
          task_id: taskId,
          content: content.trim(),
          created_by: currentUserId,
        });

        if (error) throw error;

        setSuccessMessage("Laporan berhasil ditambahkan.");
      }

      setContent("");
      setEditingId(null);

      await fetchReports();
    } catch (error) {
      console.error("Gagal menyimpan laporan:", error);

      setErrorMessage(
        error instanceof Error ? error.message : "Gagal menyimpan laporan.",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(report: TaskReport) {
    if (!canManageReport(report)) return;

    setEditingId(report.id);
    setContent(report.content);
    setErrorMessage("");
    setSuccessMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setContent("");
    setErrorMessage("");
  }

  async function handleDelete(report: TaskReport) {
    if (!canManageReport(report) || deletingId) return;

    const confirmed = window.confirm(
      "Apakah kamu yakin ingin menghapus laporan ini?",
    );

    if (!confirmed) return;

    setDeletingId(report.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } = await supabase
        .from("task_reports")
        .delete()
        .eq("id", report.id);

      if (error) throw error;

      setReports((current) => current.filter((item) => item.id !== report.id));

      if (editingId === report.id) {
        setEditingId(null);
        setContent("");
      }

      setSuccessMessage("Laporan berhasil dihapus.");
    } catch (error) {
      console.error("Gagal menghapus laporan:", error);

      setErrorMessage(
        error instanceof Error ? error.message : "Gagal menghapus laporan.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-[#f7f7f5]">
        <p className="text-sm text-[#777777]">Memuat laporan tugas...</p>
      </main>
    );
  }

  if (!task) {
    return (
      <main className="min-h-screen bg-[#f7f7f5] px-5 py-8 sm:px-7">
        <div className="mx-auto max-w-3xl rounded-2xl border border-[#EEEEEE] bg-white p-6">
          <p className="text-sm text-red-600">
            {errorMessage || "Tugas tidak ditemukan."}
          </p>

          <Link
            href="/dashboard/tasks"
            className="mt-5 inline-flex text-sm font-medium text-[#65A30D] hover:text-[#4D7C0F]"
          >
            Kembali ke Daftar Tugas
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-5 py-6 text-[#1f1e30] sm:px-7 lg:px-8">
      {/* TOMBOL KEMBALI — disamakan dengan halaman Tambah Tugas */}
      <div className="mb-6">
        <Link
          href={`/dashboard/tasks?expanded=${task.project_id}`}
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

      <div className="max-w-5xl">
        {/* NOTIFIKASI */}
        {successMessage && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-[#D9EAB5] bg-[#F1FFCC] px-4 py-3 text-sm font-medium text-[#1f1e30]"
          >
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
          >
            {errorMessage}
          </div>
        )}

        {/* INFORMASI TUGAS DAN FORM LAPORAN */}
        <section className="mb-6 rounded-2xl border border-[#EEEEEE] bg-white p-5 shadow-[0_2px_10px_rgba(31,30,48,0.04)] sm:p-8">
          <div className="flex flex-col gap-2">
            <label className="block text-sm font-medium text-[#1f1e30]">
              Nama Tugas
            </label>
            <div className="flex min-h-[54px] w-full items-center rounded-xl border border-[#EEEEEE] bg-[#f7f7f5] px-4 py-3 text-sm text-[#1f1e30]">
              {task.title || "-"}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <label className="block text-sm font-medium text-[#1f1e30]">
              Deskripsi Tugas
            </label>
            <div className="min-h-[120px] w-full whitespace-pre-wrap rounded-xl border border-[#EEEEEE] bg-[#f7f7f5] px-4 py-3 text-sm leading-6 text-[#1f1e30]">
              {task.description || "Tidak ada deskripsi tugas."}
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-[#1f1e30]">
              Status Tugas
            </label>

            {canUpdateTaskStatus ? (
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative w-full sm:max-w-xs">
                  <select
                    value={statusDraft}
                    onChange={(event) => setStatusDraft(event.target.value)}
                    disabled={
                      savingStatus ||
                      (isStaff && task.status !== "Pending")
                    }
                    className="h-[54px] w-full appearance-none rounded-xl border border-[#EEEEEE] bg-white px-4 pr-10 text-sm font-normal text-[#1f1e30] outline-none transition-colors focus:border-[#1f1e30] disabled:cursor-not-allowed disabled:bg-[#f7f7f5] disabled:opacity-60"
                  >
                    <option value="Pending">Belum Dimulai</option>
                    <option value="In Progress">Berjalan</option>
                    {!isStaff && <option value="Completed">Selesai</option>}
                  </select>
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
                </div>

                <button
                  type="button"
                  onClick={handleStatusUpdate}
                  disabled={
                    savingStatus ||
                    statusDraft === (task.status || "Pending") ||
                    (isStaff &&
                      (task.status !== "Pending" ||
                        statusDraft !== "In Progress"))
                  }
                  className="inline-flex h-[54px] w-full items-center justify-center rounded-xl bg-[#B7FE1A] px-5 text-sm font-medium text-[#1f1e30] transition-colors hover:bg-[#a8ed12] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {savingStatus ? "Menyimpan..." : "Simpan Status"}
                </button>
              </div>
            ) : (
              <p className="mt-1 text-sm text-[#1f1e30]">
                {task.status === "In Progress"
                  ? "Berjalan"
                  : task.status === "Completed"
                    ? "Selesai"
                    : "Belum Dimulai"}
              </p>
            )}
          </div>

          {canCreateReport && (
            <div className="mt-6">
              <form onSubmit={handleSubmit}>
                <label
                  htmlFor="report-content"
                  className="mb-2 block text-sm font-medium text-[#1f1e30]"
                >
                  Isi Laporan
                </label>

                <textarea
                  id="report-content"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Contoh: Saya sudah menyelesaikan pembuatan tampilan halaman beranda. Saat ini sedang melanjutkan bagian katalog produk..."
                  rows={6}
                  required
                  className="min-h-[120px] w-full resize-y rounded-xl border border-[#EEEEEE] bg-white px-4 py-3 text-sm leading-6 text-[#1f1e30] outline-none transition-colors placeholder:text-[#999999] focus:border-[#1f1e30]"
                />

                <div className="mt-5 flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                  {!editingId && (
                    <button
                      type="button"
                      onClick={() => router.push("/dashboard/tasks")}
                      disabled={saving}
                      className={TEXT.secondaryButton}
                    >
                      Batal
                    </button>
                  )}

                  {editingId && (
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={saving}
                      className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-[#1f1e30] px-5 text-sm font-medium text-white transition-colors hover:bg-[#333247] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                      Batal
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={saving || !content.trim()}
                    className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#B7FE1A] px-5 text-sm font-medium text-[#1f1e30] transition-colors hover:bg-[#a8ed12] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    {saving
                      ? "Menyimpan..."
                      : editingId
                        ? "Simpan Perubahan"
                        : "Kirim Laporan"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>

        {/* RIWAYAT LAPORAN */}
        <section className="overflow-hidden rounded-2xl border border-[#EEEEEE] bg-white shadow-[0_2px_10px_rgba(31,30,48,0.04)]">
          <div className="border-b border-[#EEEEEE] px-5 py-5 sm:px-8">
            <h2 className="text-lg font-semibold text-[#1f1e30]">
              Riwayat Laporan
            </h2>

            <p className="mt-1 text-sm text-[#777777]">
              {reports.length} laporan tercatat
            </p>
          </div>

          {reports.length > 0 ? (
            <div className="divide-y divide-[#EEEEEE]">
              {reports.map((report) => (
                <article key={report.id} className="px-5 py-6 sm:px-8">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#1f1e30]">
                        {report.creatorName}
                      </p>

                      <p className="mt-1 text-xs text-[#999999]">
                        {report.creatorRole}
                        {report.creatorRole ? " • " : ""}
                        {formatDate(report.created_at)}
                        {report.updated_at !== report.created_at &&
                          " • Diperbarui"}
                      </p>
                    </div>

                    {canManageReport(report) && (
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(report)}
                          className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-[#65A30D] bg-[#f1ffcc] px-3 py-1.5 text-sm font-normal text-[#65A30D] transition-colors hover:bg-[#e7f7b8]"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(report)}
                          disabled={deletingId === report.id}
                          className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-[#DC2626] bg-[#fce2d3] px-3 py-1.5 text-sm font-normal text-[#DC2626] transition-colors hover:bg-[#f7d3c1] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingId === report.id ? "Menghapus..." : "Hapus"}
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-[#555563]">
                    {report.content}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[200px] flex-col items-center justify-center px-5 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f1ffcc] text-[#1f1e30]">
                <span
                  className="material-symbols-outlined text-[24px] leading-none"
                  aria-hidden="true"
                >
                  description
                </span>
              </div>

              <h3 className="mt-4 text-sm font-semibold text-[#1f1e30]">
                Belum Ada Laporan
              </h3>

              <p className="mt-1 max-w-sm text-sm text-[#777777]">
                Belum ada laporan pengerjaan untuk tugas ini.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}
