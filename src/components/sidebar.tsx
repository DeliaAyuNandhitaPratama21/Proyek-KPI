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

  // MENU UTAMA ADMIN, PROJECT MANAGER, DAN STAFF
  const mainMenu: MenuItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
    { label: "Proyek", href: "/dashboard/projects", icon: "folder_open" },
    { label: "Milestones", href: "/dashboard/milestones", icon: "flag" },
    { label: "Tugas", href: "/dashboard/tasks", icon: "task" },
    {
      label: "Update Proyek",
      href: "/dashboard/updates",
      icon: "edit_note",
    },
    { label: "File", href: "/dashboard/files", icon: "folder" },
  ];

  // MENU KHUSUS ADMIN
  const adminClientMenu: MenuItem[] = [
    { label: "Klien", href: "/dashboard/clients", icon: "business" },
  ];

  // MENU KHUSUS ADMIN
  const adminMenu: MenuItem[] = [
    { label: "Pengguna", href: "/dashboard/users", icon: "group" },
  ];

  // MENU ADMIN DAN PROJECT MANAGER
  const activityMenu: MenuItem[] = [
    {
      label: "Log Aktivitas",
      href: "/dashboard/activity-logs",
      icon: "history",
    },
  ];

  // MENENTUKAN MENU YANG DITAMPILKAN
  const visibleMenu: MenuItem[] = [
    mainMenu[0], // Dashboard
    ...(isAdmin ? adminClientMenu : []), // Klien khusus Admin
    ...mainMenu
      .slice(1)
      .filter((item) => item.href !== "/dashboard/updates" || isAdmin || isPM), // Update Proyek khusus Admin dan PM
    ...(isAdmin ? adminMenu : []), // Pengguna
    ...(isAdmin || isPM ? activityMenu : []), // Log Aktivitas
  ];

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
        className={`group flex min-h-[40px] items-center gap-3 rounded-full px-3.5 py-2 text-[13px] transition-colors duration-200 ${
          active
            ? "bg-[#B7FE1A] font-semibold text-[#111800]"
            : "text-[#E2E0EC] hover:bg-white/[0.07] hover:text-white"
        }`}
      >
        <SidebarIcon
          name={item.icon}
          className={`h-[18px] w-[18px] shrink-0 ${
            active ? "text-[#111800]" : "text-[#B9B6C9] group-hover:text-white"
          }`}
        />

        <span className="min-w-0 truncate">{item.label}</span>
      </Link>
    );
  }

  return (
    <aside className="fixed inset-y-4 left-4 z-40 flex h-[calc(100dvh-32px)] w-60 flex-col overflow-hidden rounded-[22px] bg-[#1f1e30] text-white shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
      {/* LOGO */}
      <div className="flex h-[76px] shrink-0 items-center justify-center px-5">
        <Link
          href="/dashboard"
          aria-label="Dashboard Enika"
          className="flex -translate-x-1 items-center justify-center"
        >
          <img
            src="/images/enika%20logo%20putih.png"
            alt="Enika"
            className="block h-auto w-[108px] object-contain"
          />
        </Link>
      </div>

      {/* NAVIGATION MENU */}
      <nav
        aria-label="Main navigation"
        className="sidebar-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-2"
      >
        <div className="space-y-1">{visibleMenu.map(renderMenuItem)}</div>
      </nav>

      {/* LOGOUT */}
      <div className="shrink-0 p-3">
        <LogoutButton />
      </div>

      {/* MINIMAL SCROLLBAR */}
      <style jsx global>{`
        .sidebar-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: transparent transparent;
        }

        .sidebar-scrollbar:hover {
          scrollbar-color: #393747 transparent;
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
          background: #393747;
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
        fontSize: "18px",
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
