"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import type { MilestoneRow } from "./page";

type ProjectGroup = {
  id: string;
  name: string;
  milestones: MilestoneRow[];
  allMilestones: MilestoneRow[];
  iconIndex: number;
  latestCreatedAt: number;
};

type Props = {
  milestones: MilestoneRow[];
  allMilestones: MilestoneRow[];
  search: string;
  hasError: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  currentUserId: string;
};

const TEXT = {
  subtitle: "mt-1 text-sm text-[#777777]",
  sectionTitle: "text-lg font-semibold text-[#1f1e30]",
  button:
    "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#B7FE1A] px-4 text-sm font-medium text-[#1f1e30] transition-colors hover:bg-[#a8ed12] sm:w-[130px]",
};

function normalizeMilestoneStatus(status: string | null) {
  return status?.trim().toLowerCase() ?? "";
}

function getStatusLabel(status: string | null) {
  const normalized = normalizeMilestoneStatus(status);

  if (["completed", "complete", "done", "selesai"].includes(normalized)) {
    return "Selesai";
  }

  if (
    ["in progress", "in_progress", "berjalan", "dalam proses"].includes(
      normalized,
    )
  ) {
    return "Berjalan";
  }

  if (
    ["pending", "not started", "belum dimulai", "menunggu"].includes(normalized)
  ) {
    return "Belum Dimulai";
  }

  return status || "-";
}

function getStatusStyle(status: string | null) {
  const normalized = normalizeMilestoneStatus(status);

  if (["completed", "complete", "done", "selesai"].includes(normalized)) {
    return "bg-[#DCE8F2] text-[#1f1e30]";
  }

  if (
    ["in progress", "in_progress", "berjalan", "dalam proses"].includes(
      normalized,
    )
  ) {
    return "bg-[#f1ffcc] text-[#1f1e30]";
  }

  if (["ditunda", "postponed", "on hold"].includes(normalized)) {
    return "bg-[#feefd2] text-[#1f1e30]";
  }

  if (["revisi", "revision", "revised"].includes(normalized)) {
    return "bg-[#e2def7] text-[#1f1e30]";
  }

  if (["terhambat", "blocked", "overdue"].includes(normalized)) {
    return "bg-[#fce2d3] text-[#1f1e30]";
  }

  return "bg-[#ffffc2] text-[#1f1e30]";
}

function getCompletedCount(items: MilestoneRow[]) {
  return items.filter((item) =>
    ["completed", "complete", "done", "selesai"].includes(
      normalizeMilestoneStatus(item.status),
    ),
  ).length;
}

// Progress menunjukkan jumlah milestone yang sudah selesai.
function getProjectProgress(items: MilestoneRow[]) {
  if (!items.length) return 0;

  return Math.round((getCompletedCount(items) / items.length) * 100);
}

function getProjectDeadline(items: MilestoneRow[]) {
  const dates = items
    .map((item) => item.due_date)
    .filter((date): date is string => Boolean(date))
    .sort();

  return dates.length ? dates[dates.length - 1] : null;
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

function DeadlineDisplay({
  deadline,
  status,
}: {
  deadline: string | null;
  status: string | null;
}) {
  const info = getDeadlineInfo(deadline);

  if (!info) {
    return <span className="text-xs text-[#555563]">-</span>;
  }

  const isCompleted = ["completed", "complete", "done", "selesai"].includes(
    normalizeMilestoneStatus(status),
  );

  const badgeStyle =
    info.type === "upcoming"
      ? "bg-[#E8F5C8] text-[#1f1e30]"
      : info.type === "today"
        ? "bg-[#feefd2] text-[#1f1e30]"
        : "bg-[#fce2d3] text-[#1f1e30]";

  return (
    <div className="flex flex-col items-start gap-2">
      <span className="whitespace-nowrap text-xs text-[#555563]">
        {info.date}
      </span>

      {!isCompleted && (
        <span
          className={`inline-flex h-6 w-fit shrink-0 items-center justify-center whitespace-nowrap rounded-full px-4 text-[10px] font-semibold ${badgeStyle}`}
        >
          {info.label}
        </span>
      )}
    </div>
  );
}

function getProjectIcon(index: number) {
  const icons = ["business", "shopping_cart", "laptop_mac", "school"];

  return icons[index % icons.length];
}

export default function MilestonesClient({
  milestones: initialMilestones,
  allMilestones: initialAllMilestones,
  search,
  hasError,
  isStaff,
  isAdmin,
  currentUserId,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [milestones, setMilestones] =
    useState<MilestoneRow[]>(initialMilestones);

  const [allMilestones, setAllMilestones] =
    useState<MilestoneRow[]>(initialAllMilestones);

  const [searchInput, setSearchInput] = useState(search);
  const [expandedProjects, setExpandedProjects] = useState<string[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MilestoneRow | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [success, setSuccess] = useState("");
  const [pendingDeleteNotification, setPendingDeleteNotification] =
    useState(false);
  const [pendingSuccessMessage, setPendingSuccessMessage] = useState("");

  // Pulihkan dropdown proyek setelah kembali dari halaman tambah/edit.
  // ID proyek dikirim melalui parameter URL "expanded".
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

    // Notifikasi sukses tetap dibaca dari URL seperti sebelumnya.
    const notification = params.get("success");
    const messages: Record<string, string> = {
      created: "Milestone berhasil ditambahkan.",
      updated: "Milestone berhasil diperbarui.",
      deleted: "Milestone berhasil dihapus.",
    };
    const message = notification ? messages[notification] : "";

    if (message) {
      setPendingSuccessMessage(message);
      params.delete("success");
    }

    // Bersihkan parameter setelah ID proyek dan notifikasi dibaca.
    const queryString = params.toString();
    const cleanUrl = queryString ? `${pathname}?${queryString}` : pathname;
    window.history.replaceState(window.history.state, "", cleanUrl);
  }, [pathname]);

  // Scroll ke atas terlebih dahulu, lalu tampilkan notifikasi selama 3 detik.
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

  // Tampilkan notifikasi setelah milestone hilang dan scroll ke atas selesai.
  useEffect(() => {
    if (!pendingDeleteNotification) return;

    let fallbackTimeout: ReturnType<typeof setTimeout> | undefined;

    const showNotification = () => {
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      window.removeEventListener("scrollend", showNotification);
      setPendingDeleteNotification(false);
      setSuccess("Milestone berhasil dihapus.");
    };

    if (window.scrollY <= 0) {
      showNotification();
      return;
    }

    window.addEventListener("scrollend", showNotification, { once: true });
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Fallback jika browser tidak mengirimkan event scrollend.
    fallbackTimeout = setTimeout(showNotification, 3000);

    return () => {
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      window.removeEventListener("scrollend", showNotification);
    };
  }, [pendingDeleteNotification]);

  // Admin dapat menghapus semua milestone, sedangkan PM hanya milik proyeknya.
  const canDeleteMilestone = (milestone: MilestoneRow) =>
    isAdmin || (!isStaff && milestone.projects?.pic_id === currentUserId);

  // Sinkronkan data ketika hasil pencarian dari server berubah.
  useEffect(() => {
    setMilestones(initialMilestones);
    setAllMilestones(initialAllMilestones);
  }, [initialMilestones, initialAllMilestones]);

  // Sinkronkan input ketika parameter URL berubah.
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // SERVER-SIDE SEARCH DENGAN DEBOUNCE 500 MS.
  useEffect(() => {
    const keyword = searchInput.trim();

    if (keyword === search) return;

    const timeout = setTimeout(() => {
      const params = new URLSearchParams();

      if (keyword) {
        params.set("search", keyword);
      }

      const queryString = params.toString();
      const url = queryString ? `${pathname}?${queryString}` : pathname;

      router.replace(url, { scroll: false });
    }, 500);

    return () => clearTimeout(timeout);
  }, [searchInput, search, pathname, router]);

  // KELOMPOKKAN MILESTONE BERDASARKAN PROYEK.
  // Urutan ikon selalu dihitung dari seluruh proyek, bukan hasil pencarian.
  const projects = useMemo<ProjectGroup[]>(() => {
    const grouped = new Map<string, ProjectGroup>();
    const allMilestonesByProject = new Map<string, MilestoneRow[]>();

    allMilestones.forEach((milestone) => {
      const project = milestone.projects;

      if (!project?.id) return;

      const projectId = String(project.id);

      if (!allMilestonesByProject.has(projectId)) {
        allMilestonesByProject.set(projectId, []);
      }

      allMilestonesByProject.get(projectId)!.push(milestone);
    });

    const projectOrder = Array.from(allMilestonesByProject.entries())
      .map(([id, items]) => ({
        id,
        name: items[0].projects?.project_name ?? "",
        latestCreatedAt: Math.max(
          ...items.map((item) => {
            const timestamp = Date.parse(item.created_at);
            return Number.isNaN(timestamp) ? 0 : timestamp;
          }),
        ),
      }))
      .sort(
        (a, b) =>
          b.latestCreatedAt - a.latestCreatedAt || a.name.localeCompare(b.name),
      );

    const latestCreatedAtByProject = new Map(
      projectOrder.map((project) => [project.id, project.latestCreatedAt]),
    );

    const iconIndexes = new Map(
      projectOrder.map((project, index) => [project.id, index]),
    );

    milestones.forEach((milestone) => {
      const project = milestone.projects;

      if (!project?.id) return;

      const projectId = String(project.id);

      if (!grouped.has(projectId)) {
        grouped.set(projectId, {
          id: projectId,
          name: project.project_name,
          milestones: [],
          allMilestones: allMilestonesByProject.get(projectId) ?? [],
          iconIndex: iconIndexes.get(projectId) ?? 0,
          latestCreatedAt: latestCreatedAtByProject.get(projectId) ?? 0,
        });
      }

      grouped.get(projectId)!.milestones.push(milestone);
    });

    return Array.from(grouped.values()).sort(
      (a, b) =>
        b.latestCreatedAt - a.latestCreatedAt || a.name.localeCompare(b.name),
    );
  }, [milestones, allMilestones]);

  // BUKA / TUTUP DROPDOWN PROYEK.
  const toggleProject = (projectId: string) => {
    setExpandedProjects((current) =>
      current.includes(projectId)
        ? current.filter((id) => id !== projectId)
        : [...current, projectId],
    );
  };

  // UBAH VISIBILITAS MILESTONE.
  const toggleVisibility = async (milestone: MilestoneRow) => {
    if (isStaff || loadingId === milestone.id) return;

    const confirmed = window.confirm(
      `Yakin ingin ${
        milestone.client_visible ? "menyembunyikan" : "menampilkan"
      } milestone ini kepada client?`,
    );

    if (!confirmed) return;

    setLoadingId(milestone.id);

    try {
      const newVisibility = !milestone.client_visible;

      const { data, error } = await supabase
        .from("milestones")
        .update({ client_visible: newVisibility })
        .eq("id", milestone.id)
        .select("id")
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error("Milestone tidak ditemukan atau tidak memiliki izin untuk diubah.");
      }

      setMilestones((current) =>
        current.map((item) =>
          item.id === milestone.id
            ? { ...item, client_visible: newVisibility }
            : item,
        ),
      );

      setAllMilestones((current) =>
        current.map((item) =>
          item.id === milestone.id
            ? { ...item, client_visible: newVisibility }
            : item,
        ),
      );

      setSuccess(
        newVisibility
          ? "Milestone berhasil ditampilkan kepada client."
          : "Milestone berhasil disembunyikan dari client.",
      );
      router.refresh();
    } catch (error) {
      console.error("Gagal mengubah visibilitas milestone:", error);
      window.alert("Gagal mengubah visibilitas milestone.");
    } finally {
      setLoadingId(null);
    }
  };

  // BUKA POPUP KONFIRMASI HAPUS MILESTONE.
  const openDeleteDialog = (milestone: MilestoneRow) => {
    if (!canDeleteMilestone(milestone) || loadingId) return;
    setDeleteError("");
    setDeleteTarget(milestone);
  };

  // HAPUS MILESTONE.
  const deleteMilestone = async () => {
    if (!deleteTarget || !canDeleteMilestone(deleteTarget) || loadingId) return;

    const milestoneId = deleteTarget.id;
    setLoadingId(milestoneId);
    setDeleteError("");

    try {
      const { data, error } = await supabase
        .from("milestones")
        .delete()
        .eq("id", milestoneId)
        .select("id")
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error("Milestone tidak ditemukan atau tidak memiliki izin untuk dihapus.");
      }

      setMilestones((current) =>
        current.filter((item) => item.id !== milestoneId),
      );

      setAllMilestones((current) =>
        current.filter((item) => item.id !== milestoneId),
      );

      const projectId = deleteTarget.projects?.id;

      setDeleteTarget(null);
      if (projectId) {
        setExpandedProjects((current) =>
          current.filter((id) => id !== projectId),
        );
      }
      // Milestone sudah dihapus dari daftar lokal sebelum proses scroll dimulai.
      setPendingDeleteNotification(true);
      router.refresh();
    } catch (error) {
      console.error("Gagal menghapus milestone:", error);
      setDeleteError(
        error instanceof Error
          ? error.message
          : "Gagal menghapus milestone. Silakan coba lagi.",
      );
    } finally {
      setLoadingId(null);
    }
  };

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

      {/* HEADER: SEARCH DAN TOMBOL TAMBAH */}
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
            className="shrink-0 text-[#777777] transition-colors group-focus-within:text-[#1f1e30]"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>

          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Cari milestone..."
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

        {!isStaff && (
          <Link href="/dashboard/milestones/new" className={TEXT.button}>
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

      {/* DAFTAR MILESTONE */}
      <section className="max-w-full overflow-hidden rounded-2xl border border-[#EEEEEE] bg-white shadow-[0_2px_10px_rgba(31,30,48,0.04)]">
        <div className="border-b border-[#EEEEEE] px-5 py-5 sm:px-6">
          <h2 className={TEXT.sectionTitle}>Daftar Milestone</h2>

          <p className={TEXT.subtitle}>
            {hasError
              ? "Gagal memuat data milestone"
              : `${projects.reduce(
                  (total, project) => total + project.milestones.length,
                  0,
                )} milestone terdaftar`}
          </p>
        </div>

        {hasError ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-medium text-red-600">
              Gagal memuat data milestone
            </p>

            <p className="mt-2 text-sm text-[#777777]">
              Silakan muat ulang halaman.
            </p>
          </div>
        ) : (
          <div className={projects.length > 0 ? "space-y-4 p-4" : ""}>
            {projects.length > 0 ? (
              projects.map((project) => {
                const isExpanded = expandedProjects.includes(String(project.id));

                // Statistik dihitung dari seluruh milestone proyek.
                const totalMilestones = project.allMilestones.length;
                const completedCount = getCompletedCount(project.allMilestones);
                const progress = getProjectProgress(project.allMilestones);
                const deadline = getProjectDeadline(project.allMilestones);

                return (
                  <section
                    key={project.id}
                    className="overflow-hidden rounded-2xl border border-[#EEEEEE] bg-white shadow-[0_2px_10px_rgba(31,30,48,0.04)]"
                  >
                    {/* HEADER DROPDOWN PROYEK */}
                    <button
                      type="button"
                      onClick={() => toggleProject(String(project.id))}
                      aria-expanded={isExpanded}
                      className="flex w-full flex-col gap-5 p-5 text-left sm:flex-row sm:items-center sm:gap-6 sm:px-6 sm:py-6"
                    >
                      {/* IDENTITAS PROYEK */}
                      <div className="flex min-w-0 flex-1 items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f1ffcc] text-[#1f1e30]">
                          <span className="material-symbols-outlined text-[26px]">
                            {getProjectIcon(project.iconIndex)}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <h2 className="truncate text-base font-semibold text-[#1f1e30]">
                            {project.name}
                          </h2>

                          <p className={TEXT.subtitle}>
                            {totalMilestones} milestone
                          </p>
                        </div>
                      </div>

                      {/* INFORMASI PROGRES, DEADLINE, DAN DROPDOWN */}
                      <div className="flex w-full flex-wrap items-center gap-5 sm:w-auto sm:flex-nowrap sm:gap-6">
                        {/* PROGRES MILESTONE */}
                        <div className="w-full min-w-0 sm:w-[230px] sm:shrink-0">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <span className="text-xs text-[#777777]">
                              Progres milestone
                            </span>

                            <span className="whitespace-nowrap text-xs font-semibold text-[#1f1e30]">
                              {completedCount} dari {totalMilestones} selesai
                            </span>
                          </div>

                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#EEEEEE]">
                            <div
                              className="h-full rounded-full bg-[#B7FE1A] transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        <div className="hidden h-10 w-px shrink-0 bg-[#EEEEEE] sm:block" />

                        {/* DEADLINE */}
                        <div className="flex min-w-[145px] flex-1 items-center gap-3 sm:flex-none">
                          <CalendarIcon />

                          <div>
                            <p className="text-xs text-[#777777]">Deadline</p>

                            <p className="mt-0.5 whitespace-nowrap text-sm font-medium text-[#1f1e30]">
                              {formatDate(deadline)}
                            </p>
                          </div>
                        </div>

                        {/* PANAH DROPDOWN */}
                        <span
                          className={`ml-auto shrink-0 text-[#777777] transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        >
                          <ChevronIcon />
                        </span>
                      </div>
                    </button>

                    {/* ISI DROPDOWN */}
                    {isExpanded && (
                      <div className="border-t border-[#EEEEEE]">
                        <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-[#D6D3D1] scrollbar-track-transparent hover:scrollbar-thumb-[#A8A8A8]">
                          <table
                            className={`w-full ${
                              isStaff ? "min-w-[1050px]" : "min-w-[1150px]"
                            } border-collapse text-left`}
                          >
                            <thead>
                              <tr className="border-b border-[#EEEEEE] bg-[#fafaf9] text-xs font-medium uppercase tracking-wide text-[#777777]">
                                <th className="px-7 py-4">No</th>
                                <th className="px-7 py-4">Milestone</th>
                                <th className="whitespace-nowrap px-7 py-4">PIC</th>
                                <th className="px-7 py-4">Status</th>
                                <th className="px-7 py-4">Tenggat Waktu</th>
                                <th className="whitespace-nowrap px-7 py-4">
                                  Visibilitas
                                </th>
                                {!isStaff && (
                                  <th className="px-7 py-4 text-center">
                                    Tindakan
                                  </th>
                                )}
                              </tr>
                            </thead>

                            <tbody>
                              {project.milestones.map((milestone, i) => (
                                <tr
                                  key={milestone.id}
                                  className="border-b border-[#EEEEEE] last:border-b-0"
                                >
                                  <td className="px-7 py-4 text-sm text-[#777777]">
                                    {String(i + 1).padStart(2, "0")}
                                  </td>

                                  <td className="max-w-[280px] px-7 py-4">
                                    <p className="truncate text-sm font-medium text-[#1f1e30]">
                                      {milestone.name}
                                    </p>

                                    {milestone.description && (
                                      <p className="mt-1 truncate text-xs text-[#777777]">
                                        {milestone.description}
                                      </p>
                                    )}
                                  </td>

                                  {/* PIC PROYEK */}
                                  <td className="px-7 py-4 align-middle">
                                    <div className="min-w-[110px]">
                                      <p className="whitespace-nowrap text-sm font-medium text-[#1f1e30]">
                                        {(() => {
                                          const pic = milestone.projects?.pic;
                                          const person = Array.isArray(pic) ? pic[0] : pic;
                                          return person?.name || "-";
                                        })()}
                                      </p>
                                      <p className="mt-1 text-xs text-[#777777]">
                                        {(() => {
                                          const pic = milestone.projects?.pic;
                                          const person = Array.isArray(pic) ? pic[0] : pic;
                                          return person?.role || "-";
                                        })()}
                                      </p>
                                    </div>
                                  </td>

                                  {/* STATUS */}
                                  <td className="px-7 py-4">
                                    <span
                                      className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${getStatusStyle(
                                        milestone.status,
                                      )}`}
                                    >
                                      {getStatusLabel(milestone.status)}
                                    </span>
                                  </td>

                                  {/* DEADLINE */}
                                  <td className="whitespace-nowrap px-7 py-4">
                                    <DeadlineDisplay
                                      deadline={milestone.due_date}
                                      status={milestone.status}
                                    />
                                  </td>

                                  {/* VISIBILITAS */}
                                  <td className="px-7 py-4 align-middle">
                                    <div className="flex min-h-full items-center">
                                      {isStaff ? (
                                        <span
                                          className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium text-[#1f1e30] ${
                                            milestone.client_visible
                                              ? "bg-[#f1ffcc]"
                                              : "bg-[#F5F5F4]"
                                          }`}
                                        >
                                          {milestone.client_visible ? "Klien" : "Internal"}
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          role="switch"
                                          aria-checked={milestone.client_visible}
                                          disabled={loadingId === milestone.id}
                                          onClick={() => toggleVisibility(milestone)}
                                          className="inline-flex items-center gap-2.5 disabled:cursor-wait"
                                        >
                                          <span
                                            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                                              milestone.client_visible ? "bg-[#B7FE1A]" : "bg-[#D4D4D4]"
                                            } ${loadingId === milestone.id ? "opacity-50" : ""}`}
                                          >
                                            <span
                                              className={`absolute h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform ${
                                                milestone.client_visible ? "translate-x-[23px]" : "translate-x-[3px]"
                                              }`}
                                            />
                                          </span>
                                          <span className="text-xs font-medium text-[#555563]">
                                            {milestone.client_visible ? "Klien" : "Internal"}
                                          </span>
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                  {!isStaff && (
                                    <td className="px-7 py-4">
                                      <div className="flex items-center justify-center gap-2">
                                        <Link
                                          href={`/dashboard/milestones/${milestone.id}/edit`}
                                          className="inline-flex items-center justify-center rounded-lg border border-[#65A30D] bg-[#f1ffcc] px-3 py-1.5 text-sm font-normal text-[#65A30D] transition-colors hover:bg-[#e7f7b8]"
                                        >
                                          Edit
                                        </Link>
                                        {canDeleteMilestone(milestone) && (
                                          <button
                                            type="button"
                                            disabled={
                                              loadingId === milestone.id
                                            }
                                            onClick={() =>
                                              openDeleteDialog(milestone)
                                            }
                                            className="inline-flex items-center justify-center rounded-lg border border-[#DC2626] bg-[#fce2d3] px-3 py-1.5 text-sm font-normal text-[#DC2626] transition-colors hover:bg-[#f7d3c1] disabled:cursor-not-allowed disabled:opacity-50"
                                          >
                                            Hapus
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </section>
                );
              })
            ) : (
              <div
                className={`flex flex-col items-center justify-center px-5 py-13 text-center ${
                  isStaff ? "min-h-[254px]" : ""
                }`}
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#F1FFCC]">
                  <span
                    className="material-symbols-outlined text-[#1f1e30]"
                    aria-hidden="true"
                    style={{
                      fontSize: "22px",
                      fontWeight: 400,
                      lineHeight: 1,
                      fontFeatureSettings: '"liga"',
                    }}
                  >
                    flag
                  </span>
                </div>

                <h3 className="mt-4 text-sm font-semibold text-[#1f1e30]">
                  Belum Ada Milestone
                </h3>

                <p className="mt-1 text-sm text-[#777777]">
                  {search
                    ? `Tidak ada hasil untuk "${search}". Coba kata kunci lain.`
                    : "Belum ada milestone yang terdaftar untuk ditampilkan."}
                </p>

                {!search && !isStaff && (
                  <Link
                    href="/dashboard/milestones/new"
                    className="mt-5 inline-flex items-center justify-center whitespace-nowrap text-sm font-medium text-[#65A30D] transition-colors hover:text-[#4D7C0F]"
                  >
                    Tambah Milestone Pertama
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* POPUP KONFIRMASI HAPUS MILESTONE */}
      {deleteTarget && canDeleteMilestone(deleteTarget) && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !loadingId) {
              setDeleteTarget(null);
              setDeleteError("");
            }
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-milestone-title"
            aria-describedby="delete-milestone-description"
            className="w-full max-w-sm rounded-2xl border border-[#EEEEEE] bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1FFCC]">
              <svg
                width="27"
                height="27"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1f1e30"
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

            <div className="mt-5 text-center">
              <h2
                id="delete-milestone-title"
                className="text-lg font-semibold text-[#1f1e30]"
              >
                Hapus Milestone?
              </h2>

              <p
                id="delete-milestone-description"
                className="mx-auto mt-2 max-w-[300px] text-center text-sm leading-6 text-[#777777] [text-wrap:balance]"
              >
                Apakah kamu yakin ingin menghapus milestone{" "}
                <span className="break-words font-semibold text-[#1f1e30] [overflow-wrap:anywhere]">
                  {deleteTarget.name}
                </span>
                ? Data milestone yang dihapus tidak dapat dipulihkan.
              </p>

              {deleteError && (
                <p
                  role="alert"
                  className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-left text-xs text-red-600"
                >
                  {deleteError}
                </p>
              )}
            </div>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteError("");
                }}
                disabled={Boolean(loadingId)}
                className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-[#1f1e30] px-4 text-sm font-normal text-white transition-colors hover:bg-[#333247] disabled:cursor-not-allowed disabled:opacity-50 sm:w-[130px]"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={deleteMilestone}
                disabled={Boolean(loadingId)}
                className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-[#B7FE1A] px-4 text-sm font-medium text-[#1f1e30] transition-colors hover:bg-[#a8ed12] disabled:cursor-not-allowed disabled:opacity-60 sm:w-[130px]"
              >
                {loadingId ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function CalendarIcon() {
  return (
    <svg
      className="h-5 w-5 shrink-0 text-[#777777]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
