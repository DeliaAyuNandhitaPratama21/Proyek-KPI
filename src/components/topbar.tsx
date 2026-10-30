"use client";

import { usePathname } from "next/navigation";

type DashboardTopbarProps = {
  name: string;
  role: string;
};

const pageInfo: Record<string, { title: string }> = {
  "/dashboard": {
    title: "Dashboard",
  },
  "/dashboard/clients": {
    title: "Klien",
  },
  "/dashboard/projects": {
    title: "Proyek",
  },
  "/dashboard/tasks": {
    title: "Tugas",
  },
  "/dashboard/milestones": {
    title: "Tahapan Proyek",
  },
  "/dashboard/updates": {
    title: "Pembaruan Proyek",
  },
  "/dashboard/files": {
    title: "Berkas",
  },
  "/dashboard/users": {
    title: "Pengguna",
  },
  "/dashboard/activity-logs": {
    title: "Log Aktivitas",
  },
};

export default function DashboardTopbar({ name, role }: DashboardTopbarProps) {
  const pathname = usePathname();

  const matchedPath = Object.keys(pageInfo)
    .sort((a, b) => b.length - a.length)
    .find((path) => pathname === path || pathname.startsWith(`${path}/`));

  const currentPage = matchedPath
    ? pageInfo[matchedPath]
    : pageInfo["/dashboard"];

  return (
    <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between gap-4 border-b border-[#262626] bg-[#111111] px-5 sm:px-7 lg:px-8">
      {/* JUDUL HALAMAN */}
      <div className="min-w-0">
        <h1 className="text-xl font-semibold leading-tight tracking-tight text-white">
          {currentPage.title}
        </h1>
      </div>
      
      {/* PROFIL USER */}
      <div className="flex shrink-0 items-center gap-3">
        <div className="text-right">
          <p className="max-w-[200px] truncate text-sm font-medium text-white">
            {name}
          </p>

          <p className="text-xs text-zinc-400">{role}</p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#B7FE1A]/10">
          <span className="font-semibold text-[#B7FE1A]">
            {name?.trim()?.charAt(0)?.toUpperCase() || "U"}
          </span>
        </div>
      </div>
    </header>
  );
}
