
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type Project = {
  id: number;
  project_name: string | null;
  project_type: string | null;
  deadline: string | null;
  archived_by_client: boolean | null;
  clients:
    | {
        company_name: string | null;
        status: string | null;
      }
    | {
        company_name: string | null;
        status: string | null;
      }[]
    | null;
};

type ArchivedProjectsClientProps = {
  projects: Project[];
  search: string;
  restoreProject: (formData: FormData) => Promise<void>;
};

const TEXT = {
  primary: "text-sm font-medium text-[#1f1e30]",
  secondary: "text-sm text-[#555563]",
};

export default function ArchivedProjectsClient({
  projects,
  search,
  restoreProject,
}: ArchivedProjectsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchInput, setSearchInput] = useState(search);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [success, setSuccess] = useState("");

  // Tampilkan notifikasi setelah proyek berhasil diaktifkan dan halaman
  // arsip selesai kembali ke posisi paling atas.
  useEffect(() => {
    if (searchParams.get("restored") !== "1") return;

    let completed = false;
    let fallback: ReturnType<typeof setTimeout> | undefined;

    const showNotification = () => {
      if (completed) return;
      completed = true;

      setSuccess("Proyek berhasil diaktifkan.");

      // Hapus penanda agar notifikasi tidak muncul lagi saat halaman dimuat ulang.
      const params = new URLSearchParams(searchParams.toString());
      params.delete("restored");
      const queryString = params.toString();

      router.replace(
        queryString ? `${pathname}?${queryString}` : pathname,
        { scroll: false },
      );
    };

    if (window.scrollY <= 0) {
      showNotification();
    } else {
      const handleScrollEnd = () => showNotification();

      window.addEventListener("scrollend", handleScrollEnd, { once: true });
      window.scrollTo({ top: 0, behavior: "smooth" });

      fallback = setTimeout(showNotification, 3000);

      return () => {
        window.removeEventListener("scrollend", handleScrollEnd);
        if (fallback) clearTimeout(fallback);
      };
    }
  }, [searchParams, pathname, router]);

  // Notifikasi hilang otomatis setelah 3 detik.
  useEffect(() => {
    if (!success) return;

    const timeout = setTimeout(() => setSuccess(""), 3000);
    return () => clearTimeout(timeout);
  }, [success]);

  // Sinkronkan input ketika parameter URL berubah.
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // SERVER-SIDE SEARCH DENGAN DEBOUNCE 500 MS
  useEffect(() => {
    const keyword = searchInput.trim();

    if (keyword === search) return;

    const timeout = setTimeout(() => {
      const params = new URLSearchParams();

      if (keyword) {
        params.set("search", keyword);
      }

      const queryString = params.toString();

      const url = queryString
        ? `${pathname}?${queryString}`
        : pathname;

      router.replace(url, { scroll: false });
    }, 500);

    return () => clearTimeout(timeout);
  }, [searchInput, search, pathname, router]);

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-5 py-6 text-[#1f1e30] sm:px-7 lg:px-8">
      {/* NOTIFIKASI BERHASIL AKTIFKAN */}
      {success && (
        <div
          role="status"
          className="mb-5 rounded-xl border border-[#D9EAB5] bg-[#F1FFCC] px-4 py-3 text-sm font-medium text-[#1f1e30]"
        >
          {success}
        </div>
      )}

      {/* HEADER */}
      <div className="mb-8 mt-2 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* TOMBOL KEMBALI */}
        <Link
          href="/dashboard/projects"
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
            placeholder="Cari proyek..."
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
      </div>

      {/* DAFTAR ARSIP PROYEK */}
      <section className="min-h-[348px] max-w-full overflow-hidden rounded-2xl border border-[#EEEEEE] bg-white shadow-[0_2px_10px_rgba(31,30,48,0.04)]">
        <div className="border-b border-[#EEEEEE] px-5 py-5 sm:px-6">
          <h2 className="text-lg font-semibold text-[#1f1e30]">
            Arsip Proyek
          </h2>

          <p className="mt-1 text-sm text-[#777777]">
            {projects.length} proyek diarsipkan
          </p>
        </div>

        {projects.length > 0 ? (
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-[#D6D3D1] scrollbar-track-transparent hover:scrollbar-thumb-[#A8A8A8]">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-[#EEEEEE] bg-[#fafaf9] text-left text-xs font-semibold uppercase tracking-wide text-[#777777]">
                  <th className="px-6 py-4">Nama Proyek</th>
                  <th className="px-6 py-4">Nama Klien</th>
                  <th className="whitespace-nowrap px-6 py-4">Tenggat Waktu</th>
                  <th className="px-6 py-4">Sumber Arsip</th>
                  <th className="px-6 py-4">Tindakan</th>
                </tr>
              </thead>

              <tbody>
                {projects.map((project) => {
                  const clientRelation = project.clients;

                  const client = Array.isArray(clientRelation)
                    ? clientRelation[0]
                    : clientRelation;

                  const archivedByClient = project.archived_by_client;
                  const clientArchived = client?.status === "Archived";
                  const canRestore = !archivedByClient && !clientArchived;

                  return (
                    <tr
                      key={project.id}
                      className="border-b border-[#EEEEEE] last:border-b-0"
                    >
                      <td className={`px-6 py-4 ${TEXT.primary}`}>
                        <p>{project.project_name || "-"}</p>

                        <p className="mt-1 text-xs text-[#777777]">
                          {project.project_type || "-"}
                        </p>
                      </td>

                      <td className={`px-6 py-4 ${TEXT.secondary}`}>
                        {client?.company_name || "-"}
                      </td>

                      <td className={`px-6 py-4 ${TEXT.secondary}`}>
                        {project.deadline
                          ? new Date(
                              `${String(project.deadline).slice(0, 10)}T00:00:00Z`
                            ).toLocaleDateString("id-ID", {
                              timeZone: "UTC",
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "-"}
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center whitespace-nowrap rounded-full bg-[#f1ffcc] px-3 py-1 text-xs font-medium text-[#1f1e30]">
                          {archivedByClient ? "Arsip Klien" : "Arsip Manual"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {canRestore ? (
                          <button
                            type="button"
                            onClick={() => setSelectedProject(project)}
                            className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-[#65A30D] bg-[#f1ffcc] px-3 py-1.5 text-sm font-semibold text-[#65A30D] transition-colors hover:bg-[#e7f7b8]"
                          >
                            Aktifkan
                          </button>
                        ) : (
                          <span className="block text-xs !leading-[16px] text-[#777777]">
                            Aktifkan klien terlebih dahulu
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-13 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#F1FFCC]">
              <ArchiveIcon />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-[#1f1e30]">
              {search
                ? "Proyek Tidak Ditemukan"
                : "Belum Ada Proyek Diarsipkan"}
            </h3>

            <p className="mt-1 text-sm text-[#777777]">
              {search
                ? "Tidak ada proyek yang sesuai dengan pencarian."
                : "Belum ada proyek yang diarsipkan."}
            </p>
          </div>
        )}
      </section>

      {/* POPUP KONFIRMASI AKTIFKAN PROYEK */}
      {selectedProject && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-[2px]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedProject(null);
            }
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="restore-project-confirmation-title"
            aria-describedby="restore-project-confirmation-description"
            className="w-full max-w-sm rounded-2xl border border-[#EEEEEE] bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
          >
            {/* IKON */}
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
                <rect x="3" y="4" width="18" height="4" rx="1" />
                <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
                <path d="M10 12h4" />
              </svg>
            </div>

            {/* JUDUL DAN DESKRIPSI */}
            <div className="mt-5 text-center">
              <h2
                id="restore-project-confirmation-title"
                className="text-lg font-semibold text-[#1f1e30]"
              >
                Aktifkan Proyek?
              </h2>

              <p
                id="restore-project-confirmation-description"
                className="mx-auto mt-2 max-w-[300px] text-center text-sm leading-6 text-[#777777] [text-wrap:balance]"
              >
                Apakah kamu yakin ingin mengaktifkan kembali proyek{" "}
                <span className="font-semibold text-[#1f1e30]">
                  {selectedProject.project_name || "ini"}
                </span>
                ? Proyek akan dikembalikan ke daftar Proyek Aktif.
              </p>
            </div>

            {/* TOMBOL */}
            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setSelectedProject(null)}
                className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center rounded-xl bg-[#1f1e30] px-4 text-sm font-[500] [font-family:inherit] text-white transition-colors hover:bg-[#333247]"
              >
                Batal
              </button>

              <form action={restoreProject} className="flex flex-1">
                <input
                  type="hidden"
                  name="projectId"
                  value={selectedProject.id}
                />

                <button
                  type="submit"
                  className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-[#B7FE1A] px-4 text-sm font-[600] [font-family:inherit] text-[#1f1e30] transition-colors hover:bg-[#a8ed12]"
                >
                  Ya, Aktifkan
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function ArchiveIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="text-[#1f1e30]"
    >
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
      <path d="M10 12h4" />
    </svg>
  );
}
