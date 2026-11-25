"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";

type Update = {
  id: string;
  project_id: string;
  title: string;
  content: string;
  client_visible: boolean | null;
  created_at: string;
  created_by: string | null;
  projects: {
    project_name: string;
    is_archived: boolean;
  } | null;
};

type User = {
  id: string;
  name: string;
  email: string;
};

type Props = {
  updates: Update[];
  users: User[];
  search: string;
  role: string;
};

const TEXT = {
  sectionTitle: "text-lg font-semibold text-[#1f1e30]",
  subtitle: "mt-1 text-sm text-[#777777]",
  primary: "text-sm font-medium text-[#1f1e30]",
  secondary: "text-sm text-[#555563]",
  action:
    "inline-flex items-center text-sm font-medium text-[#65A30D] transition-colors hover:text-[#4D7C0F]",
  primaryButton:
    "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#B7FE1A] px-4 text-sm font-[500] text-[#1f1e30] transition-colors hover:bg-[#a8ed12] sm:w-[130px]",
};

export default function UpdatesClient({ updates, users, search, role }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [supabase] = useState(() => createClient());

  const [updateList, setUpdateList] = useState(updates);
  const [searchInput, setSearchInput] = useState(search);
  const [expandedProjectIds, setExpandedProjectIds] = useState<string[]>([]);

  // Sinkronkan data ketika hasil pencarian dari server berubah.
  useEffect(() => {
    setUpdateList(updates);
  }, [updates]);

  // Sinkronkan input ketika parameter URL berubah.
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Pencarian server-side otomatis dengan debounce 500 ms.
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

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Update | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [success, setSuccess] = useState("");
  const [pendingSuccessMessage, setPendingSuccessMessage] = useState("");
  const [pendingDeleteNotification, setPendingDeleteNotification] =
    useState(false);

  // Baca notifikasi dari URL setelah tambah atau edit.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const notification = params.get("success");

    const messages: Record<string, string> = {
      created: "Update proyek berhasil ditambahkan.",
      updated: "Update proyek berhasil diperbarui.",
    };
    const message = notification ? messages[notification] : "";

    if (!message) return;

    params.delete("success");
    const queryString = params.toString();
    const cleanUrl = queryString ? `${pathname}?${queryString}` : pathname;
    window.history.replaceState(window.history.state, "", cleanUrl);
    setPendingSuccessMessage(message);
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

  // Tampilkan notifikasi setelah update dihapus dan scroll ke atas selesai.
  useEffect(() => {
    if (!pendingDeleteNotification) return;

    let fallbackTimeout: ReturnType<typeof setTimeout> | undefined;

    const showNotification = () => {
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      window.removeEventListener("scrollend", showNotification);
      setPendingDeleteNotification(false);
      setSuccess("Update proyek berhasil dihapus.");
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

  const petaPengguna = useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users],
  );

  // Filter pencarian berdasarkan judul update dan nama proyek.
  const filteredUpdates = updateList.filter((item) => {
    const keyword = searchInput.trim().toLowerCase();
    return (
      !keyword ||
      item.title.toLowerCase().includes(keyword) ||
      (item.projects?.project_name ?? "").toLowerCase().includes(keyword)
    );
  });

  // Kelompokkan update berdasarkan proyek.
  const projectGroups = useMemo(() => {
    const groups = new Map<
      string,
      { projectId: string; projectName: string; updates: Update[] }
    >();

    filteredUpdates.forEach((item) => {
      const existing = groups.get(item.project_id);

      if (existing) {
        existing.updates.push(item);
      } else {
        groups.set(item.project_id, {
          projectId: item.project_id,
          projectName: item.projects?.project_name ?? "Proyek tanpa nama",
          updates: [item],
        });
      }
    });

    return Array.from(groups.values()).sort((a, b) =>
      a.projectName.localeCompare(b.projectName, "id"),
    );
  }, [filteredUpdates]);

  const toggleProject = (projectId: string) => {
    setExpandedProjectIds((current) =>
      current.includes(projectId)
        ? current.filter((id) => id !== projectId)
        : [...current, projectId],
    );
  };

  // Admin dan Project Manager mengelola update proyek.
  const canManageUpdates = role === "Admin" || role === "Project Manager";
  const canCreateUpdates = canManageUpdates;
  const canDeleteUpdates = canManageUpdates;

  // UBAH VISIBILITAS PEMBARUAN
  const toggleVisibility = async (item: Update) => {
    if (!canManageUpdates || loadingId === item.id) return;

    setLoadingId(item.id);
    const newVisibility = !item.client_visible;

    try {
      const { data, error } = await supabase
        .from("project_updates")
        .update({ client_visible: newVisibility })
        .eq("id", item.id)
        .select("id")
        .maybeSingle();

      if (error || !data) {
        console.error(
          "Gagal mengubah visibilitas pembaruan:",
          error ?? "Tidak ada data yang diperbarui.",
        );
        window.alert("Gagal mengubah visibilitas pembaruan.");
        return;
      }

      setUpdateList((current) =>
        current.map((update) =>
          update.id === item.id
            ? { ...update, client_visible: newVisibility }
            : update,
        ),
      );

      router.refresh();
    } catch (toggleError) {
      console.error("Kesalahan saat mengubah visibilitas:", toggleError);
      window.alert("Terjadi kesalahan saat mengubah visibilitas pembaruan.");
    } finally {
      setLoadingId(null);
    }
  };

  // HAPUS PEMBARUAN
  const openDeleteDialog = (item: Update) => {
    if (!canDeleteUpdates || loadingId !== null) return;
    setDeleteError("");
    setDeleteTarget(item);
  };

  const closeDeleteDialog = () => {
    if (loadingId !== null) return;
    setDeleteTarget(null);
    setDeleteError("");
  };

  const deleteUpdate = async () => {
    if (!canDeleteUpdates || !deleteTarget || loadingId !== null) return;

    const target = deleteTarget;
    setLoadingId(target.id);
    setDeleteError("");

    try {
      const { data, error } = await supabase
        .from("project_updates")
        .delete()
        .eq("id", target.id)
        .select("id")
        .maybeSingle();

      if (error || !data) {
        console.error(
          "Gagal menghapus pembaruan:",
          error ?? "Tidak ada data yang dihapus.",
        );
        setDeleteError(
          error
            ? `Gagal menghapus pembaruan: ${error.message}`
            : "Gagal menghapus pembaruan: data tidak ditemukan atau akses ditolak.",
        );
        return;
      }

      // Hilangkan update dari daftar, lalu tampilkan notifikasi setelah scroll ke atas.
      setUpdateList((current) =>
        current.filter((item) => item.id !== target.id),
      );
      setDeleteTarget(null);
      setPendingDeleteNotification(true);
      router.refresh();
    } catch (deleteError) {
      console.error("Kesalahan saat menghapus pembaruan:", deleteError);
      setDeleteError("Terjadi kesalahan saat menghapus pembaruan.");
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
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari update, proyek..."
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

        <div className="flex w-full justify-end md:w-[130px] md:shrink-0">
          {canCreateUpdates && (
            <Link href="/dashboard/updates/new" className={TEXT.primaryButton}>
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

      {/* DAFTAR UPDATE DIKELOMPOKKAN BERDASARKAN PROYEK */}
      <section className="max-w-full overflow-hidden rounded-2xl border border-[#EEEEEE] bg-white shadow-[0_2px_10px_rgba(31,30,48,0.04)]">
        <div className="border-b border-[#EEEEEE] px-5 py-5 sm:px-6">
          <h2 className={TEXT.sectionTitle}>Daftar Update Proyek</h2>
          <p className={TEXT.subtitle}>
            {filteredUpdates.length} update dari {projectGroups.length} proyek
          </p>
        </div>

        {projectGroups.length > 0 ? (
          <div className="space-y-4 p-4">
            {projectGroups.map((project) => {
              const isExpanded = expandedProjectIds.includes(project.projectId);

              return (
                <div
                  key={project.projectId}
                  className="overflow-hidden rounded-2xl border border-[#EEEEEE] bg-white shadow-[0_2px_10px_rgba(31,30,48,0.04)]"
                >
                  <button
                    type="button"
                    onClick={() => toggleProject(project.projectId)}
                    aria-expanded={isExpanded}
                    className="flex w-full flex-col gap-5 p-5 text-left sm:flex-row sm:items-center sm:gap-6 sm:px-6 sm:py-6"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f1ffcc] text-[#1f1e30]">
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
                        </svg>
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-[#1f1e30]">
                          {project.projectName}
                        </h3>
                        <p className="mt-1 text-sm text-[#777777]">
                          {project.updates.length} update
                        </p>
                      </div>
                    </div>

                    <div className="flex w-full flex-wrap items-center gap-5 sm:ml-auto sm:w-auto sm:flex-nowrap sm:justify-end sm:gap-6">
                      <div className="flex min-w-[145px] flex-none items-center gap-3">
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
                        <div>
                          <p className="text-xs text-[#777777]">Update terbaru</p>
                          <p className="mt-0.5 whitespace-nowrap text-sm font-medium text-[#1f1e30]">
                            {formatUpdateDate(project.updates[0]?.created_at)}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`ml-auto shrink-0 text-[#777777] transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      >
                        <ChevronIcon />
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-[#EEEEEE]">
                      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-[#D6D3D1] scrollbar-track-transparent hover:scrollbar-thumb-[#A8A8A8]">
                        <table className="w-full min-w-[850px] border-collapse">
                          <thead>
                            <tr className="border-b border-[#EEEEEE] bg-[#fafaf9] text-left text-xs font-semibold uppercase tracking-wide text-[#777777]">
                              <th className="px-7 py-4">Pembaruan</th>
                              <th className="whitespace-nowrap px-7 py-4">Dibuat Oleh</th>
                              <th className="whitespace-nowrap px-7 py-4">Tanggal</th>
                              <th className="whitespace-nowrap px-7 py-4">Visibilitas</th>
                              {canManageUpdates && (
                                <th className="whitespace-nowrap px-7 py-4 text-center">
                                  Tindakan
                                </th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {project.updates.map((item) => {
                              const pengguna = item.created_by
                                ? petaPengguna.get(item.created_by)
                                : null;
                              return (
                                <tr
                                  key={item.id}
                                  className="border-b border-[#EEEEEE] last:border-b-0"
                                >
                                  <td className="px-7 py-4">
                                    <p className="text-sm font-medium text-[#1f1e30]">
                                      <span className="block max-w-[280px] truncate">
                                        {item.title || "-"}
                                      </span>
                                    </p>
                                    {item.content && (
                                      <p className="mt-1 max-w-[320px] truncate text-xs text-[#777777]">
                                        {item.content}
                                      </p>
                                    )}
                                  </td>

                                  <td className="px-7 py-4 align-middle">
                                    <p className="whitespace-nowrap text-sm font-medium text-[#1f1e30]">
                                      {pengguna?.name ?? "-"}
                                    </p>
                                    {pengguna?.email && (
                                      <p className="mt-1 text-xs text-[#777777]">
                                        {pengguna.email}
                                      </p>
                                    )}
                                  </td>

                                  <td className="whitespace-nowrap px-7 py-4">
                                    <span className="text-sm text-[#555563]">
                                      {formatUpdateDate(item.created_at)}
                                    </span>
                                  </td>

                                  <td className="px-7 py-4 align-middle">
                                    <div className="flex h-full items-center">
                                      {canManageUpdates ? (
                                        <VisibilityToggle
                                          checked={Boolean(item.client_visible)}
                                          disabled={loadingId === item.id}
                                          onChange={() => toggleVisibility(item)}
                                        />
                                      ) : (
                                        <span
                                          className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium text-[#1f1e30] ${
                                            item.client_visible
                                              ? "bg-[#f1ffcc]"
                                              : "bg-[#F5F5F4]"
                                          }`}
                                        >
                                          {item.client_visible ? "Klien" : "Internal"}
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  {canManageUpdates && (
                                    <td className="px-7 py-4 text-center">
                                      <div className="flex items-center justify-center gap-3">
                                        <Link
                                          href={`/dashboard/updates/${item.id}/edit`}
                                          className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-[#65A30D] bg-[#f1ffcc] px-3 py-1.5 text-sm font-normal text-[#65A30D] transition-colors hover:bg-[#e7f7b8]"
                                        >
                                          Edit
                                        </Link>

                                        {canDeleteUpdates && (
                                          <button
                                            type="button"
                                            onClick={() => openDeleteDialog(item)}
                                            disabled={loadingId === item.id}
                                            className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-[#DC2626] bg-[#fce2d3] px-3 py-1.5 text-sm font-normal text-[#DC2626] transition-colors hover:bg-[#f7d3c1] disabled:cursor-not-allowed disabled:opacity-50"
                                          >
                                            {loadingId === item.id
                                              ? "Menghapus..."
                                              : "Hapus"}
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-[254px] flex-col items-center justify-center px-5 py-13 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#f1ffcc]">
              <UpdateIcon />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-[#1f1e30]">
              {searchInput ? "Pembaruan Tidak Ditemukan" : "Belum Ada Update Proyek"}
            </h3>

            <p className="mt-1 text-sm text-[#777777]">
              {searchInput
                ? "Tidak ada pembaruan yang sesuai dengan pencarian."
                : "Belum ada update proyek yang terdaftar untuk ditampilkan."}
            </p>

            {!searchInput && canCreateUpdates && (
              <Link
                href="/dashboard/updates/new"
                className={`${TEXT.action} mt-5 justify-center whitespace-nowrap`}
              >
                Tambah Update Proyek Pertama
              </Link>
            )}
          </div>
        )}
      </section>

      {/* POPUP KONFIRMASI HAPUS PEMBARUAN */}
      {deleteTarget && canDeleteUpdates && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDeleteDialog();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-update-title"
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
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

            <div className="mt-5 text-center">
              <h2
                id="delete-update-title"
                className="text-lg font-semibold text-[#1f1e30]"
              >
                Hapus Pembaruan?
              </h2>
              <p className="mx-auto mt-3 w-full max-w-[300px] text-center text-sm leading-6 text-[#777777] [text-wrap:balance]">
                Apakah kamu yakin ingin menghapus pembaruan{" "}
                <span className="break-words font-semibold text-[#1f1e30] [overflow-wrap:anywhere]">
                  “{deleteTarget.title}”
                </span>
                ? Data yang dihapus tidak dapat dipulihkan.
              </p>
            </div>

            {deleteError && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-600"
              >
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={closeDeleteDialog}
                disabled={loadingId !== null}
                className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-[#1f1e30] px-5 text-sm font-normal text-white transition-colors hover:bg-[#333247] disabled:cursor-not-allowed disabled:opacity-50 sm:w-[130px]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={deleteUpdate}
                disabled={loadingId !== null}
                className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-[#B7FE1A] px-5 text-sm font-medium text-[#1f1e30] transition-colors hover:bg-[#a8ed12] disabled:cursor-not-allowed disabled:opacity-50 sm:w-[130px]"
              >
                {loadingId === deleteTarget.id ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function formatUpdateDate(value: string | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

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

// UPDATE ICON
function UpdateIcon() {
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
      edit_note
    </span>
  );
}
