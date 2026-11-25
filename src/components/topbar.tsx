
"use client";

import { usePathname } from "next/navigation";

type DashboardTopbarProps = {
  name: string;
  role: string;
};

const pageInfo: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Pantau ringkasan dan perkembangan proyek.",
  },
  "/dashboard/clients": {
    title: "Klien",
    subtitle: "Kelola data klien dan informasi kontak.",
  },
  "/dashboard/projects": {
    title: "Proyek",
    subtitle: "Kelola informasi dan perkembangan proyek.",
  },
  "/dashboard/milestones": {
    title: "Milestones",
    subtitle: "Kelola tahapan dan target penyelesaian proyek.",
  },
  "/dashboard/tasks": {
    title: "Tugas",
    subtitle: "Kelola tugas dan pembagian pekerjaan.",
  },
  "/dashboard/updates": {
    title: "Update Proyek",
    subtitle: "Kelola informasi update proyek.",
  },
  "/dashboard/files": {
    title: "File",
    subtitle: "Kelola file proyek.",
  },
  "/dashboard/users": {
    title: "Pengguna",
    subtitle: "Kelola akun dan hak akses pengguna.",
  },
  "/dashboard/activity-logs": {
    title: "Log Aktivitas",
    subtitle: "Pantau riwayat aktivitas pengguna.",
  },

  "/dashboard/clients/archive": {
    title: "Arsip Klien",
    subtitle: "Lihat dan aktifkan kembali klien yang telah diarsipkan.",
  },
  "/dashboard/clients/new": {
    title: "Tambah Klien",
    subtitle: "Tambahkan data klien baru ke dalam sistem.",
  },
  "/dashboard/projects/archive": {
    title: "Arsip Proyek",
    subtitle: "Lihat dan aktifkan kembali proyek yang telah diarsipkan.",
  },
  "/dashboard/projects/new": {
    title: "Tambah Proyek",
    subtitle: "Tambahkan proyek pengembangan website baru.",
  },
  "/dashboard/tasks/new": {
    title: "Tambah Tugas",
    subtitle: "Tambahkan tugas baru dan tentukan pembagian pekerjaan.",
  },
  "/dashboard/milestones/new": {
    title: "Tambah Milestone",
    subtitle: "Tambahkan tahapan baru pada proyek.",
  },
  "/dashboard/updates/new": {
    title: "Tambah Update Proyek",
    subtitle: "Tambahkan informasi perkembangan proyek.",
  },
  "/dashboard/users/new": {
    title: "Tambah Pengguna",
    subtitle: "Tambahkan akun pengguna baru ke dalam sistem.",
  },
  "/dashboard/files/upload": {
    title: "Unggah File",
    subtitle: "Unggah file dan tentukan informasi file proyek.",
  },
  "/dashboard/files/new": {
    title: "Unggah File",
    subtitle: "Unggah file dan tentukan informasi file proyek.",
  },
};

export default function DashboardTopbar({
  name,
  role,
}: DashboardTopbarProps) {
  const pathname = usePathname();

  // Deteksi halaman laporan tugas
  const isTaskReportsPage =
    /^\/dashboard\/tasks\/[^/]+\/reports\/?$/.test(pathname);

  // Deteksi halaman edit dengan ID dinamis
  const isEditClientPage =
    /^\/dashboard\/clients\/[^/]+\/edit\/?$/.test(pathname);

  const isEditProjectPage =
    /^\/dashboard\/projects\/[^/]+\/edit\/?$/.test(pathname);

  const isEditTaskPage =
    /^\/dashboard\/tasks\/[^/]+\/edit\/?$/.test(pathname);

  const isEditMilestonePage =
    /^\/dashboard\/milestones\/[^/]+\/edit\/?$/.test(pathname);

  const isEditUserPage =
    /^\/dashboard\/users\/[^/]+\/edit\/?$/.test(pathname);

  const isEditUpdatePage =
    /^\/dashboard\/updates\/[^/]+\/edit\/?$/.test(pathname);

  const isEditFilePage =
    /^\/dashboard\/files\/[^/]+\/edit\/?$/.test(pathname);

  // Menentukan informasi halaman
  const matchedPath = Object.keys(pageInfo)
    .sort((a, b) => b.length - a.length)
    .find(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    );

  const currentPage = isTaskReportsPage
    ? {
        title: "Laporan Tugas",
        subtitle: "Mengumpulkan Informasi dan Kebutuhan Klien",
      }
    : isEditClientPage
      ? {
          title: "Edit Klien",
          subtitle: "Perbarui data klien dan informasi kontak.",
        }
      : isEditProjectPage
        ? {
            title: "Edit Proyek",
            subtitle: "Perbarui informasi dan perkembangan proyek.",
          }
        : isEditTaskPage
          ? {
              title: "Edit Tugas",
              subtitle: "Perbarui tugas dan pembagian pekerjaan.",
            }
          : isEditMilestonePage
            ? {
                title: "Edit Milestone",
                subtitle:
                  "Perbarui tahapan dan target penyelesaian proyek.",
              }
            : isEditUserPage
              ? {
                  title: "Edit Pengguna",
                  subtitle:
                    "Perbarui informasi akun dan hak akses pengguna.",
                }
              : isEditUpdatePage
                ? {
                    title: "Edit Update Proyek",
                    subtitle: "Perbarui informasi perkembangan proyek.",
                  }
                : isEditFilePage
                  ? {
                      title: "Edit File",
                      subtitle: "Perbarui informasi file proyek.",
                    }
                  : matchedPath
                    ? pageInfo[matchedPath]
                    : pageInfo["/dashboard"];

  return (
    <header className="sticky top-0 z-50 shrink-0 px-5 pt-4 pb-2 sm:px-7 lg:px-8">
      <div className="flex min-h-[90px] items-center justify-between gap-4 rounded-2xl border border-[#EEEEEE] bg-white px-6 shadow-[0_2px_10px_rgba(31,30,48,0.04)] sm:px-7">
        {/* JUDUL HALAMAN */}
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold leading-tight tracking-tight text-[#1f1e30]">
            {currentPage.title}
          </h1>

          <p className="mt-1 text-xs font-normal text-[#777777]">
            {currentPage.subtitle}
          </p>
        </div>

        {/* PROFIL USER */}
        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="max-w-[200px] truncate text-sm font-medium text-[#1f1e30]">
                {name}
              </p>

              <p className="text-xs font-normal text-[#777777]">
                {role}
              </p>
            </div>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1f1e30]">
              <span className="font-semibold text-[#B7FE1A]">
                {name?.trim()?.charAt(0)?.toUpperCase() || "U"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
