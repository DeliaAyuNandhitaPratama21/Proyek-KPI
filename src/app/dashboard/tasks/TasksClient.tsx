"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";

type Task = {
  id: number | string;
  title: string | null;
  description: string | null;
  priority: string | null;
  status: string | null;
  deadline: string | null;
  client_visible: boolean | null;
  assigned_to: string | null;
  project_id: string | number;
  assignee: {
    name: string | null;
    role: string | null;
  } | null;
  projects: {
    id: string | number;
    project_name: string | null;
    is_archived: boolean;
    pic_id: string | null;
  } | null;
  milestones: {
    id: string | number;
    name: string | null;
    sort_order: number | null;
  } | null;
};

type MilestoneGroup = {
  id: string;
  name: string;
  sort_order: number;
  tasks: Task[];
};

type ProjectGroup = {
  id: string;
  name: string;
  milestones: MilestoneGroup[];
  unassignedTasks: Task[];
  iconIndex: number;
};

const TEXT = {
  sectionTitle: "text-lg font-semibold text-[#1f1e30]",
  subtitle: "mt-1 text-sm text-[#777777]",
  primary: "text-sm font-medium text-[#1f1e30]",
  secondary: "text-sm text-[#555563]",
  action:
    "inline-flex items-center text-sm font-medium text-[#65A30D] transition-colors hover:text-[#4D7C0F]",
  primaryButton:
    "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#B7FE1A] px-4 text-sm font-medium text-[#1f1e30] transition-colors hover:bg-[#a8ed12] sm:w-[130px]",
};

const editButtonClass =
  "inline-flex cursor-pointer items-center justify-center rounded-lg border border-[#65A30D] bg-[#f1ffcc] px-3 py-1.5 text-sm font-normal text-[#65A30D] transition-colors hover:bg-[#e7f7b8]";

const deleteButtonClass =
  "inline-flex cursor-pointer items-center justify-center rounded-lg border border-[#DC2626] bg-[#fce2d3] px-3 py-1.5 text-sm font-normal text-[#DC2626] transition-colors hover:bg-[#f7d3c1] disabled:cursor-not-allowed disabled:opacity-50";

type TasksClientProps = {
  isStaff: boolean;
  isAdmin: boolean;
  isProjectManager: boolean;
  currentUserId: string;
};

export default function TasksClient({
  isStaff,
  isAdmin,
  isProjectManager,
  currentUserId,
}: TasksClientProps) {
  const [supabase] = useState(() => createClient());
  const router = useRouter();
  const pathname = usePathname();

  const canManageTasks = isAdmin || isProjectManager;
  const canManageTask = (task: Task) =>
    isAdmin || (isProjectManager && task.projects?.pic_id === currentUserId);
  const canUpdateTaskStatus = (task: Task) =>
    isStaff && task.assigned_to === currentUserId;
  const canDeleteTask = (task: Task) => canManageTask(task);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState("");
  const [expandedProjects, setExpandedProjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [visibilityError, setVisibilityError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [success, setSuccess] = useState("");
  const [pendingDeleteNotification, setPendingDeleteNotification] =
    useState(false);
  const [pendingSuccessMessage, setPendingSuccessMessage] = useState("");

  // Pulihkan dropdown proyek dan baca notifikasi dari URL setelah tambah/edit.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const expandedProjectId = params.get("expanded");

    if (expandedProjectId) {
      setExpandedProjects((current) =>
        current.includes(expandedProjectId)
          ? current
          : [...current, expandedProjectId],
      );
      params.delete("expanded");
    }

    const notification = params.get("success");
    const messages: Record<string, string> = {
      created: "Tugas berhasil ditambahkan.",
      updated: "Tugas berhasil diperbarui.",
      deleted: "Tugas berhasil dihapus.",
    };
    const message = notification ? messages[notification] : "";

    if (message) {
      setPendingSuccessMessage(message);
      params.delete("success");
    }

    const queryString = params.toString();
    const cleanUrl = queryString ? `${pathname}?${queryString}` : pathname;
    window.history.replaceState(window.history.state, "", cleanUrl);
  }, [pathname]);

  // Scroll ke atas terlebih dahulu, lalu tampilkan notifikasi tambah/edit.
  useEffect(() => {
    if (!pendingSuccessMessage) return;

    let fallbackTimeout: ReturnType<typeof setTimeout> | undefined;
    const showNotification = () => {
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      window.removeEventListener("scrollend", showNotification);
      setSuccess(pendingSuccessMessage);
      setPendingSuccessMessage("");
    };

    if (window.scrollY <= 0) {
      showNotification();
      return;
    }

    window.addEventListener("scrollend", showNotification, { once: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
    fallbackTimeout = setTimeout(showNotification, 3000);

    return () => {
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      window.removeEventListener("scrollend", showNotification);
    };
  }, [pendingSuccessMessage]);

  // Hilangkan notifikasi sukses secara otomatis setelah 3 detik.
  useEffect(() => {
    if (!success) return;
    const timeout = setTimeout(() => setSuccess(""), 3000);
    return () => clearTimeout(timeout);
  }, [success]);

  // Tampilkan notifikasi hapus setelah scroll ke atas selesai.
  useEffect(() => {
    if (!pendingDeleteNotification) return;

    let fallbackTimeout: ReturnType<typeof setTimeout> | undefined;
    const showNotification = () => {
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      window.removeEventListener("scrollend", showNotification);
      setPendingDeleteNotification(false);
      setSuccess("Tugas berhasil dihapus.");
    };

    if (window.scrollY <= 0) {
      showNotification();
      return;
    }

    window.addEventListener("scrollend", showNotification, { once: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
    fallbackTimeout = setTimeout(showNotification, 3000);

    return () => {
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      window.removeEventListener("scrollend", showNotification);
    };
  }, [pendingDeleteNotification]);

  const [updatingVisibility, setUpdatingVisibility] = useState<
    (string | number)[]
  >([]);
  const [deletingTask, setDeletingTask] = useState<string | number | null>(
    null,
  );
  // AMBIL DATA TUGAS SESUAI ROLE PENGGUNA.
  useEffect(() => {
    let cancelled = false;

    async function fetchTasks() {
      setLoading(true);
      setErrorMessage("");

      try {
        let taskQuery = supabase.from("tasks").select(
          `
            id,
            title,
            description,
            priority,
            status,
            deadline,
            client_visible,
            assigned_to,
            project_id,
            assignee:users!tasks_assigned_to_fkey (
              name,
              role
            ),
            projects (
              id,
              project_name,
              is_archived,
              pic_id
            ),
            milestones (
              id,
              name,
              sort_order
            )
          `,
        );

        if (isStaff) {
          taskQuery = taskQuery.eq("assigned_to", currentUserId);
        } else if (isProjectManager) {
          taskQuery = taskQuery
            .eq("projects.pic_id", currentUserId)
            .eq("projects.is_archived", false);
        } else if (isAdmin) {
          taskQuery = taskQuery.eq("projects.is_archived", false);
        } else {
          taskQuery = taskQuery.eq("id", -1);
        }

        const { data, error } = await taskQuery.order("created_at", {
          ascending: false,
        });

        if (cancelled) return;

        if (error) {
          console.error("Gagal mengambil data tugas:", error);
          setErrorMessage(error.message);
          setTasks([]);
        } else {
          setTasks((data ?? []) as unknown as Task[]);
        }
      } catch (error) {
        if (cancelled) return;

        console.error("Terjadi kesalahan saat mengambil data tugas:", error);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat memuat data tugas.",
        );
        setTasks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTasks();

    return () => {
      cancelled = true;
    };
  }, [supabase, isStaff, isAdmin, isProjectManager, currentUserId]);

  // PENCARIAN BERDASARKAN TUGAS, PROYEK, TAHAPAN, STATUS, DAN PRIORITAS.
  const keyword = search.trim().toLocaleLowerCase("id-ID");

  const filteredTasks = useMemo(() => {
    if (!keyword) return tasks;

    return tasks.filter((task) => {
      const searchableFields = [
        task.title,
        task.description,
        task.projects?.project_name,
        task.milestones?.name,
        task.status,
        task.priority,
      ];

      return searchableFields.some((value) =>
        (value ?? "").toLocaleLowerCase("id-ID").includes(keyword),
      );
    });
  }, [tasks, keyword]);

  // KELOMPOKKAN TUGAS BERDASARKAN PROYEK DAN TAHAPAN.
  // Indeks ikon dihitung dari seluruh proyek agar tidak berubah saat pencarian.
  const projectGroups = useMemo(() => {
    const projects = new Map<string, ProjectGroup>();

    const allProjectOrder = Array.from(
      new Map(
        tasks.map((task) => [
          String(task.project_id),
          task.projects?.project_name || "Proyek terkait tugas",
        ]),
      ).entries(),
    )
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const iconIndexes = new Map(
      allProjectOrder.map((project, index) => [project.id, index]),
    );

    filteredTasks.forEach((task) => {
      const projectId = String(task.project_id);

      if (!projects.has(projectId)) {
        projects.set(projectId, {
          id: projectId,
          name: task.projects?.project_name || "Proyek terkait tugas",
          milestones: [],
          unassignedTasks: [],
          iconIndex: iconIndexes.get(projectId) ?? 0,
        });
      }

      const project = projects.get(projectId)!;

      if (!task.milestones) {
        project.unassignedTasks.push(task);
        return;
      }

      let milestone = project.milestones.find(
        (item) => item.id === String(task.milestones?.id),
      );

      if (!milestone) {
        milestone = {
          id: String(task.milestones.id),
          name: task.milestones.name || "Tahapan Tanpa Nama",
          sort_order: task.milestones.sort_order ?? 0,
          tasks: [],
        };

        project.milestones.push(milestone);
      }

      milestone.tasks.push(task);
    });

    // Urutkan milestone berdasarkan sort_order dari tabel milestones.
    projects.forEach((project) => {
      project.milestones.sort((a, b) => a.sort_order - b.sort_order);
    });

    return Array.from(projects.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [filteredTasks, tasks]);

  // UBAH VISIBILITAS KLIEN
  async function handleVisibilityToggle(task: Task) {
    if (!canManageTask(task) || updatingVisibility.includes(task.id)) return;

    const previousValue = task.client_visible ?? false;
    const newValue = !previousValue;

    setVisibilityError("");

    setTasks((prev) =>
      prev.map((item) =>
        item.id === task.id ? { ...item, client_visible: newValue } : item,
      ),
    );

    setUpdatingVisibility((prev) => [...prev, task.id]);

    try {
      const { error } = await supabase
        .from("tasks")
        .update({ client_visible: newValue })
        .eq("id", task.id);

      if (error) {
        console.error("Gagal mengubah visibilitas tugas:", error);

        setTasks((prev) =>
          prev.map((item) =>
            item.id === task.id
              ? { ...item, client_visible: previousValue }
              : item,
          ),
        );

        setVisibilityError(
          `Gagal mengubah visibilitas "${task.title}": ${error.message}`,
        );
      }
    } catch (error) {
      console.error("Visibility update error:", error);

      setTasks((prev) =>
        prev.map((item) =>
          item.id === task.id
            ? { ...item, client_visible: previousValue }
            : item,
        ),
      );

      setVisibilityError(
        `Terjadi kesalahan saat mengubah visibilitas "${task.title}".`,
      );
    } finally {
      setUpdatingVisibility((prev) => prev.filter((id) => id !== task.id));
    }
  }

  // BUKA POPUP KONFIRMASI HAPUS TUGAS
  function handleDelete(task: Task) {
    if (deletingTask !== null || !canDeleteTask(task)) return;
    setDeleteError("");
    setDeleteTarget(task);
  }

  // HAPUS TUGAS SETELAH KONFIRMASI
  async function confirmDeleteTask() {
    if (!deleteTarget || deletingTask !== null || !canDeleteTask(deleteTarget))
      return;

    const task = deleteTarget;
    setDeletingTask(task.id);
    setDeleteError("");

    try {
      const { data: deletedTask, error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", task.id)
        .select("id")
        .maybeSingle();

      if (error) {
        console.error("Gagal menghapus tugas:", error);
        setDeleteError(
          `Gagal menghapus tugas "${task.title}": ${error.message}`,
        );
        return;
      }

      if (!deletedTask) {
        setDeleteError(
          "Tugas tidak ditemukan atau kamu tidak memiliki izin untuk menghapusnya.",
        );
        return;
      }

      // Hilangkan tugas dari daftar, pertahankan dropdown proyek, lalu tampilkan notifikasi.
      setTasks((prev) => prev.filter((item) => item.id !== task.id));
      const projectId = task.projects?.id;
      setDeleteTarget(null);
      if (projectId) {
        const normalizedProjectId = String(projectId);
        setExpandedProjects((current) =>
          current.includes(normalizedProjectId)
            ? current
            : [...current, normalizedProjectId],
        );
      }
      setPendingDeleteNotification(true);
      router.refresh();
    } catch (error) {
      console.error("Terjadi kesalahan saat menghapus tugas:", error);
      setDeleteError(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menghapus tugas.",
      );
    } finally {
      setDeletingTask(null);
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
            className="shrink-0 text-[#777777]"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>

          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari tugas, proyek, tahapan..."
            className="w-full min-w-0 bg-transparent text-sm text-[#1f1e30] outline-none placeholder:text-[#999999] [appearance:none] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
          />

          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
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

        <div className="flex w-full justify-end md:w-[130px] md:shrink-0">
          {canManageTasks && (
            <Link href="/dashboard/tasks/new" className={TEXT.primaryButton}>
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
              Tambah
            </Link>
          )}
        </div>
      </div>

      {/* DAFTAR TUGAS */}
      <section className="max-w-full overflow-hidden rounded-2xl border border-[#EEEEEE] bg-white shadow-[0_2px_10px_rgba(31,30,48,0.04)]">
        <div className="border-b border-[#EEEEEE] px-5 py-5 sm:px-6">
          <h2 className={TEXT.sectionTitle}>Daftar Tugas</h2>
          <p className={TEXT.subtitle}>
            {`${filteredTasks.length} tugas terdaftar`}
          </p>
        </div>

        {visibilityError && (
          <div
            role="alert"
            className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 sm:mx-6"
          >
            {visibilityError}
          </div>
        )}

        {errorMessage ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-medium text-red-600">
              Gagal memuat data tugas
            </p>

            <p className="mt-2 break-words text-sm text-[#777777]">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-xl bg-[#1f1e30] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#333247]"
            >
              Coba Lagi
            </button>
          </div>
        ) : filteredTasks.length > 0 ? (
          <div className="space-y-4 p-4">
            {projectGroups.map((project) => {
              const isProjectExpanded = expandedProjects.includes(project.id);
              const projectTasks = [
                ...project.milestones.flatMap((milestone) => milestone.tasks),
                ...project.unassignedTasks,
              ];
              const projectTaskCount = projectTasks.length;
              const completedTaskCount = projectTasks.filter((task) =>
                ["completed", "complete", "done", "selesai"].includes(
                  task.status?.trim().toLowerCase() ?? "",
                ),
              ).length;
              const taskProgress = projectTaskCount
                ? Math.round((completedTaskCount / projectTaskCount) * 100)
                : 0;
              const projectDeadline =
                projectTasks
                  .map((task) => task.deadline)
                  .filter((date): date is string => Boolean(date))
                  .sort()
                  .at(-1) ?? null;

              return (
                <section
                  key={project.id}
                  className="overflow-hidden rounded-2xl border border-[#EEEEEE] bg-white shadow-[0_2px_10px_rgba(31,30,48,0.04)]"
                >
                  {/* DROPDOWN PROYEK */}
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedProjects((current) =>
                        current.includes(project.id)
                          ? current.filter((id) => id !== project.id)
                          : [...current, project.id],
                      )
                    }
                    aria-expanded={isProjectExpanded}
                    className="flex w-full flex-col gap-5 p-5 text-left sm:flex-row sm:items-center sm:gap-6 sm:px-6 sm:py-6"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f1ffcc] text-[#1f1e30]">
                        <span className="material-symbols-outlined text-[26px]">
                          {
                            [
                              "business",
                              "shopping_cart",
                              "laptop_mac",
                              "school",
                            ][project.iconIndex % 4]
                          }
                        </span>
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-[#1f1e30]">
                          {project.name}
                        </h3>
                        <p className={TEXT.subtitle}>
                          {projectTaskCount} tugas
                        </p>
                      </div>
                    </div>

                    <div className="flex w-full flex-wrap items-center gap-5 sm:w-auto sm:flex-nowrap sm:gap-6">
                      <div className="w-full min-w-0 sm:w-[230px] sm:shrink-0">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-xs text-[#777777]">
                            Progres tugas
                          </span>
                          <span className="whitespace-nowrap text-xs font-semibold text-[#1f1e30]">
                            {completedTaskCount} dari {projectTaskCount} selesai
                          </span>
                        </div>

                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#EEEEEE]">
                          <div
                            className="h-full rounded-full bg-[#B7FE1A] transition-all"
                            style={{ width: `${taskProgress}%` }}
                          />
                        </div>
                      </div>

                      <div className="hidden h-10 w-px shrink-0 bg-[#EEEEEE] sm:block" />

                      <div className="flex min-w-[145px] flex-1 items-center gap-3 sm:flex-none">
                        <svg
                          className="h-5 w-5 shrink-0 text-[#777777]"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          aria-hidden="true"
                        >
                          <rect x="3" y="5" width="18" height="16" rx="2" />
                          <path
                            d="M16 3v4M8 3v4M3 10h18"
                            strokeLinecap="round"
                          />
                        </svg>
                        <div>
                          <p className="text-xs text-[#777777]">Deadline</p>
                          <p className="mt-0.5 whitespace-nowrap text-sm font-medium text-[#1f1e30]">
                            {formatProjectDeadline(projectDeadline)}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`ml-auto shrink-0 text-[#777777] transition-transform ${
                          isProjectExpanded ? "rotate-180" : ""
                        }`}
                      >
                        <ChevronIcon />
                      </span>
                    </div>
                  </button>

                  {/* ISI DROPDOWN PROYEK */}
                  {isProjectExpanded && (
                    <div className="border-t border-[#EEEEEE]">
                      {project.milestones.length > 0 ||
                      project.unassignedTasks.length > 0 ? (
                        <ProjectTaskTable
                          milestones={project.milestones}
                          unassignedTasks={project.unassignedTasks}
                          canManageTasks={canManageTasks}
                          canManageTask={canManageTask}
                          canUpdateTaskStatus={canUpdateTaskStatus}
                          canDeleteTask={canDeleteTask}
                          isStaff={isStaff}
                          updatingVisibility={updatingVisibility}
                          deletingTask={deletingTask}
                          onVisibilityToggle={handleVisibilityToggle}
                          onDelete={handleDelete}
                        />
                      ) : (
                        <p className="px-3 py-6 text-center text-sm text-[#777777]">
                          Belum ada tugas pada proyek ini.
                        </p>
                      )}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          <div
            className={`flex flex-col items-center justify-center px-5 py-13 text-center ${
              isStaff ? "min-h-[254px]" : ""
            }`}
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#f1ffcc]">
              <TaskIcon />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-[#1f1e30]">
              {keyword ? "Tugas Tidak Ditemukan" : "Belum Ada Tugas"}
            </h3>

            <p className="mt-1 text-sm text-[#777777]">
              {keyword
                ? "Tidak ada tugas yang sesuai dengan pencarian."
                : "Belum ada tugas yang terdaftar untuk ditampilkan."}
            </p>

            {!keyword && canManageTasks && (
              <div className="mt-5 min-h-5">
                <Link
                  href="/dashboard/tasks/new"
                  className={`${TEXT.action} justify-center whitespace-nowrap`}
                >
                  Tambah Tugas Pertama
                </Link>
              </div>
            )}
          </div>
        )}
      </section>

      {/* POPUP KONFIRMASI HAPUS TUGAS */}
      {deleteTarget && canDeleteTask(deleteTarget) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm"
          onClick={() => {
            if (deletingTask === null) {
              setDeleteTarget(null);
              setDeleteError("");
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-task-title"
            className="w-full max-w-sm rounded-2xl border border-[#EEEEEE] bg-white p-6 shadow-xl sm:p-7"
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
              id="delete-task-title"
              className="mt-5 text-center text-lg font-semibold text-[#1f1e30]"
            >
              Hapus Tugas?
            </h2>
            <p className="mx-auto mt-4 max-w-[300px] text-center text-sm leading-6 text-[#777777] [text-wrap:balance]">
              Apakah kamu yakin ingin menghapus tugas{" "}
              <span className="font-semibold text-[#1f1e30]">
                "{deleteTarget.title || "Tanpa Judul"}"
              </span>
              ? Data tugas yang dihapus tidak dapat dipulihkan.
            </p>

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
                disabled={deletingTask !== null}
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
                disabled={deletingTask !== null}
                onClick={confirmDeleteTask}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#B7FE1A] px-5 text-sm font-medium text-[#1f1e30] transition-colors hover:bg-[#a8ed12] disabled:cursor-not-allowed disabled:opacity-50 sm:w-[130px]"
              >
                {deletingTask !== null ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function TaskTableHeaderRow({ showActions }: { showActions: boolean }) {
  return (
    <tr className="border-b border-[#EEEEEE] bg-[#fafaf9] text-left text-xs font-semibold uppercase tracking-wide text-[#777777]">
      <th className="px-7 py-4">Tugas</th>
      <th className="whitespace-nowrap px-7 py-4">PIC</th>
      <th className="px-7 py-4">Prioritas</th>
      <th className="px-7 py-4">Status</th>
      <th className="whitespace-nowrap px-7 py-4">Tenggat Waktu</th>
      <th className="whitespace-nowrap px-7 py-4">Visibilitas</th>
      {showActions && <th className="px-7 py-4 text-center">Tindakan</th>}
    </tr>
  );
}

// SATU TABEL TUGAS DENGAN PEMISAH BARIS MILESTONE

function ProjectTaskTable({
  milestones,
  unassignedTasks,
  canManageTasks,
  canManageTask,
  canUpdateTaskStatus,
  canDeleteTask,
  isStaff,
  updatingVisibility,
  deletingTask,
  onVisibilityToggle,
  onDelete,
}: {
  milestones: MilestoneGroup[];
  unassignedTasks: Task[];
  canManageTasks: boolean;
  canManageTask: (task: Task) => boolean;
  canUpdateTaskStatus: (task: Task) => boolean;
  canDeleteTask: (task: Task) => boolean;
  isStaff: boolean;
  updatingVisibility: (string | number)[];
  deletingTask: string | number | null;
  onVisibilityToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  const showActions = canManageTasks || isStaff;
  const columnCount = 6 + (showActions ? 1 : 0);

  return (
    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-[#D6D3D1] scrollbar-track-transparent hover:scrollbar-thumb-[#A8A8A8]">
      <table
        className={`w-full ${
          isStaff ? "min-w-[1050px]" : "min-w-[1150px]"
        } border-collapse`}
      >
        <tbody>
          {/* HEADER TABEL - HANYA SATU KALI */}
          <TaskTableHeaderRow showActions={showActions} />

          {/* DAFTAR MILESTONE */}
          {milestones.map((milestone) => (
            <Fragment key={milestone.id}>
              {/* PEMISAH MILESTONE */}
              <tr className="border-y border-[#EEEEEE] bg-[#fafaf9]">
                <td colSpan={columnCount} className="px-7 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#B7FE1A]" />
                    <span className="text-sm font-semibold text-[#1f1e30]">
                      {milestone.name}
                    </span>
                  </div>
                </td>
              </tr>

              {/* DAFTAR TUGAS */}
              {milestone.tasks.map((task) => (
                <ProjectTaskRow
                  key={task.id}
                  task={task}
                  canManageTasks={canManageTasks}
                  canManageTask={canManageTask}
                  canUpdateTaskStatus={canUpdateTaskStatus}
                  canDeleteTask={canDeleteTask}
                  updatingVisibility={updatingVisibility}
                  deletingTask={deletingTask}
                  onVisibilityToggle={onVisibilityToggle}
                  onDelete={onDelete}
                />
              ))}
            </Fragment>
          ))}

          {/* TUGAS TANPA MILESTONE */}
          {unassignedTasks.length > 0 && (
            <>
              <tr className="border-y border-[#EEEEEE] bg-[#fafaf9]">
                <td colSpan={columnCount} className="px-7 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#D4D4D4]" />
                    <span className="text-sm font-semibold text-[#1f1e30]">
                      Belum Memiliki Tahapan
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs text-[#777777]">
                      {unassignedTasks.length} tugas
                    </span>
                  </div>
                </td>
              </tr>

              {unassignedTasks.map((task) => (
                <ProjectTaskRow
                  key={task.id}
                  task={task}
                  canManageTasks={canManageTasks}
                  canManageTask={canManageTask}
                  canUpdateTaskStatus={canUpdateTaskStatus}
                  canDeleteTask={canDeleteTask}
                  updatingVisibility={updatingVisibility}
                  deletingTask={deletingTask}
                  onVisibilityToggle={onVisibilityToggle}
                  onDelete={onDelete}
                />
              ))}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ProjectTaskRow({
  task,
  canManageTasks,
  canManageTask,
  canUpdateTaskStatus,
  canDeleteTask,
  updatingVisibility,
  deletingTask,
  onVisibilityToggle,
  onDelete,
}: {
  task: Task;
  canManageTasks: boolean;
  canManageTask: (task: Task) => boolean;
  canUpdateTaskStatus: (task: Task) => boolean;
  canDeleteTask: (task: Task) => boolean;
  updatingVisibility: (string | number)[];
  deletingTask: string | number | null;
  onVisibilityToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  return (
    <tr className="border-b border-[#EEEEEE] last:border-b-0">
      <td className="px-7 py-4">
        <p className="text-sm font-medium text-[#1f1e30]">
          <span className="block max-w-[240px] truncate">
            {task.title || "-"}
          </span>
        </p>
        {task.description && (
          <p className="mt-1 max-w-[240px] truncate text-xs text-[#777777]">
            {task.description}
          </p>
        )}
      </td>
      <td className="px-7 py-4 align-middle">
        <p className="whitespace-nowrap text-sm font-medium text-[#1f1e30]">
          {task.assignee?.name || "-"}
        </p>
        {task.assignee?.role && (
          <p className="mt-1 text-xs text-[#777777]">{task.assignee.role}</p>
        )}
      </td>
      <td className="px-7 py-4">
        <PriorityBadge priority={task.priority} />
      </td>
      <td className="px-7 py-4">
        <StatusBadge status={task.status} />
      </td>
      <td className="whitespace-nowrap px-7 py-4">
        <DeadlineDisplay deadline={task.deadline} status={task.status} />
      </td>
      <td className="px-7 py-4 align-middle">
        <div className="flex h-full items-center">
          {canManageTask(task) ? (
            <VisibilityToggle
              checked={task.client_visible ?? false}
              disabled={updatingVisibility.includes(task.id)}
              onChange={() => onVisibilityToggle(task)}
            />
          ) : (
            <VisibilityBadge clientVisible={task.client_visible ?? false} />
          )}
        </div>
      </td>

      {((canManageTasks && canManageTask(task)) ||
        canUpdateTaskStatus(task)) && (
        <td className="px-7 py-4 text-center">
          <div className="flex items-center justify-center gap-3">
            <Link
              href={`/dashboard/tasks/${task.id}/reports`}
              className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-[#93C5FD] bg-[#EFF6FF] px-3 py-1.5 text-sm font-normal text-[#2563EB] transition-colors hover:bg-[#DBEAFE]"
            >
              Laporan
            </Link>

            {canManageTasks && canManageTask(task) && (
              <Link
                href={`/dashboard/tasks/${task.id}/edit`}
                className={editButtonClass}
              >
                Edit
              </Link>
            )}

            {canManageTasks && canDeleteTask(task) && (
              <button
                type="button"
                onClick={() => onDelete(task)}
                disabled={deletingTask !== null}
                className={deleteButtonClass}
              >
                {deletingTask === task.id ? "Menghapus..." : "Hapus"}
              </button>
            )}
          </div>
        </td>
      )}
    </tr>
  );
}

function formatProjectDeadline(deadline: string | null) {
  if (!deadline) return "-";

  const parsedDate = new Date(`${deadline.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
}

// FORMAT TANGGAL DAN HITUNG SISA WAKTU
type DeadlineInfo = {
  date: string;
  label: string;
  type: "upcoming" | "today" | "overdue";
};

function getDeadlineInfo(deadline: string | null): DeadlineInfo | null {
  if (!deadline) return null;

  const parts = deadline.slice(0, 10).split("-").map(Number);

  if (
    parts.length !== 3 ||
    parts.some((part) => !Number.isFinite(part)) ||
    parts[0] < 1 ||
    parts[1] < 1 ||
    parts[1] > 12 ||
    parts[2] < 1 ||
    parts[2] > 31
  ) {
    return null;
  }

  const [year, month, day] = parts;
  const deadlineDate = new Date(year, month - 1, day);

  if (
    deadlineDate.getFullYear() !== year ||
    deadlineDate.getMonth() !== month - 1 ||
    deadlineDate.getDate() !== day
  ) {
    return null;
  }

  const today = new Date();

  deadlineDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const difference = Math.round(
    (deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  const date = deadlineDate.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  if (difference > 0) {
    return {
      date,
      label: `${difference} hari lagi`,
      type: "upcoming",
    };
  }

  if (difference === 0) {
    return {
      date,
      label: "Hari ini",
      type: "today",
    };
  }

  return {
    date,
    label: `Terlambat ${Math.abs(difference)} hari`,
    type: "overdue",
  };
}

// TAMPILAN TENGGAT WAKTU
function DeadlineDisplay({
  deadline,
  status,
}: {
  deadline: string | null;
  status: string | null;
}) {
  const info = getDeadlineInfo(deadline);
  const normalizedStatus = status?.trim().toLowerCase() ?? "";
  const isCompleted = ["completed", "complete", "done", "selesai"].includes(
    normalizedStatus,
  );

  if (!info) {
    return <span className="text-xs text-[#555563]">-</span>;
  }

  // Tugas yang sudah selesai hanya menampilkan tanggal tenggat.
  if (isCompleted) {
    return (
      <span className="whitespace-nowrap text-left text-xs text-[#555563]">
        {info.date}
      </span>
    );
  }

  const badgeStyle =
    info.type === "upcoming"
      ? "bg-[#E8F5C8] text-[#1f1e30]"
      : info.type === "today"
        ? "bg-[#feefd2] text-[#1f1e30]"
        : "bg-[#fce2d3] text-[#1f1e30]";

  return (
    <div className="flex flex-col items-start gap-2">
      <span className="whitespace-nowrap text-left text-xs text-[#555563]">
        {info.date}
      </span>

      <span
        className={`inline-flex h-6 w-fit shrink-0 items-center justify-center whitespace-nowrap rounded-full px-4 text-[10px] font-semibold ${badgeStyle}`}
      >
        {info.label}
      </span>
    </div>
  );
}

// PRIORITAS
function PriorityBadge({ priority }: { priority: string | null }) {
  const normalized = priority?.trim().toLowerCase() ?? "";

  const styles =
    normalized === "high" || normalized === "tinggi"
      ? "bg-[#fce2d3]"
      : normalized === "medium" || normalized === "sedang"
        ? "bg-[#feefd2]"
        : normalized === "low" || normalized === "rendah"
          ? "bg-[#d8edcf]"
          : "bg-[#F5F5F4]";

  const label =
    normalized === "high" || normalized === "tinggi"
      ? "Tinggi"
      : normalized === "medium" || normalized === "sedang"
        ? "Sedang"
        : normalized === "low" || normalized === "rendah"
          ? "Rendah"
          : priority || "-";

  return (
    <span
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-1 text-xs font-medium text-[#1f1e30] ${styles}`}
    >
      {label}
    </span>
  );
}

// STATUS
function StatusBadge({ status }: { status: string | null }) {
  const normalizedStatus = status?.trim().toLowerCase() ?? "";

  const isCompleted = ["completed", "complete", "done", "selesai"].includes(
    normalizedStatus,
  );

  const isInProgress = [
    "in progress",
    "in_progress",
    "in-progress",
    "berjalan",
    "dalam proses",
  ].includes(normalizedStatus);

  const isPostponed = ["ditunda", "on hold", "postponed"].includes(
    normalizedStatus,
  );

  const isQueued = ["menunggu antrian", "waiting", "queued"].includes(
    normalizedStatus,
  );

  const isPending = [
    "todo",
    "to do",
    "pending",
    "not started",
    "belum dimulai",
    "menunggu",
  ].includes(normalizedStatus);

  const label = isCompleted
    ? "Selesai"
    : isInProgress
      ? "Berjalan"
      : isPostponed
        ? "Ditunda"
        : isQueued
          ? "Menunggu Antrian"
          : isPending
            ? "Belum Dimulai"
            : status || "-";

  const styles = isCompleted
    ? "bg-[#DCE8F2]"
    : isInProgress
      ? "bg-[#f1ffcc]"
      : isPostponed
        ? "bg-[#feefd2]"
        : isQueued || isPending
          ? "bg-[#e2e8e0]"
          : "bg-[#F5F5F4]";

  return (
    <span
      className={`inline-flex min-w-[112px] items-center justify-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium text-[#1f1e30] ${styles}`}
    >
      {label}
    </span>
  );
}

// BADGE VISIBILITAS KLIEN
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
        {checked ? "Klien" : "Internal"}
      </span>
    </button>
  );
}

// IKON DROPDOWN
function ChevronIcon() {
  return (
    <svg
      className="h-6 w-6"
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

// IKON TUGAS
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
        color: "#1f1e30",
      }}
    >
      task
    </span>
  );
}
