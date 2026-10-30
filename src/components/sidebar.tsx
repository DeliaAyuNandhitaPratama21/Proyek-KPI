"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./logout-button";

type SidebarProps = {
  name: string;
  role: string;
};

type MenuItem = {
  label: string;
  href: string;
  icon: string;
};

export default function Sidebar({ name, role }: SidebarProps) {
  const pathname = usePathname();

  const normalizedRole = role.trim().toLowerCase();
  const isAdmin = normalizedRole === "admin";
  const isPM = normalizedRole === "project manager";

  const mainMenu: MenuItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
    { label: "Klien", href: "/dashboard/clients", icon: "group" },
    { label: "Proyek", href: "/dashboard/projects", icon: "folder_open" },
    { label: "Tugas", href: "/dashboard/tasks", icon: "task_alt" },
    {
      label: "Tahapan Proyek",
      href: "/dashboard/milestones",
      icon: "flag",
    },
    {
      label: "Pembaruan Proyek",
      href: "/dashboard/updates",
      icon: "update",
    },
    { label: "Berkas", href: "/dashboard/files", icon: "folder" },
  ];

  const adminMenu: MenuItem[] = [
    { label: "Pengguna", href: "/dashboard/users", icon: "manage_accounts" },
    {
      label: "Log Aktivitas",
      href: "/dashboard/activity-logs",
      icon: "history",
    },
  ];

  const visibleMainMenu = mainMenu.filter((item) => {
    if (
      item.href === "/dashboard/clients" ||
      item.href === "/dashboard/milestones"
    ) {
      return isAdmin || isPM;
    }

    return true;
  });

  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function renderMenuItem(item: MenuItem) {
    const active = isActive(item.href);

    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`group flex min-h-[42px] items-center gap-3 rounded-lg px-3.5 py-2 text-[13px] transition-colors duration-200 ${
          active
            ? "bg-[#B7FE1A] font-semibold text-[#111800]"
            : "text-[#A5BDCC] hover:bg-white/[0.04] hover:text-[#B7FE1A]"
        }`}
      >
        <SidebarIcon
          name={item.icon}
          className={`h-[20px] w-[20px] shrink-0 ${
            active
              ? "text-[#111800]"
              : "text-[#A5BDCC] group-hover:text-[#B7FE1A]"
          }`}
        />

        <span className="min-w-0 truncate">{item.label}</span>
      </Link>
    );
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex h-dvh w-64 flex-col overflow-hidden border-r border-[#262626] bg-[#111111] text-white">
      {/* LOGO */}
      <div className="flex h-[76px] shrink-0 items-center justify-center px-5">
        <Link
          href="/dashboard"
          aria-label="Dashboard Enika"
          className="flex items-center justify-center"
        >
          <img
            src="/images/enika%20logo.png"
            alt="Enika"
            className="block h-auto w-[108px] object-contain"
          />
        </Link>
      </div>

      {/* MENU NAVIGASI */}
      <nav
        aria-label="Navigasi utama"
        className="sidebar-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-3"
      >
        <div className="space-y-1">{visibleMainMenu.map(renderMenuItem)}</div>

        {/* MENU ADMINISTRASI */}
        {isAdmin && (
          <div className="mt-7">
            <p className="mb-2.5 px-3.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#A5BDCC]/70">
              Administrasi
            </p>

            <div className="space-y-1">{adminMenu.map(renderMenuItem)}</div>
          </div>
        )}
      </nav>

      {/* LOGOUT */}
      <div className="shrink-0 bg-[#111111] p-3">
        <LogoutButton />
      </div>

      {/* SCROLLBAR MINIMALIS */}
      <style jsx global>{`
        .sidebar-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: transparent transparent;
        }

        .sidebar-scrollbar:hover {
          scrollbar-color: #2a2a2a transparent;
        }

        .sidebar-scrollbar::-webkit-scrollbar {
          width: 4px;
        }

        .sidebar-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .sidebar-scrollbar::-webkit-scrollbar-thumb {
          background: transparent;
          border-radius: 999px;
        }

        .sidebar-scrollbar:hover::-webkit-scrollbar-thumb {
          background: #2a2a2a;
        }
      `}</style>
    </aside>
  );
}

function SidebarIcon({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      aria-hidden="true"
      style={{
        fontSize: "20px",
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
      }}
    >
      {name}
    </span>
  );
}
