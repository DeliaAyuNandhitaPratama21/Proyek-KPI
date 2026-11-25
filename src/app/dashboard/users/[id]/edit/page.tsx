"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/client";
import { createActivityLog } from "../../../../../lib/activity-log";

type User = {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
};

const ROLES = ["Admin", "Project Manager", "Staff"];

const TEXT = {
  label: "block text-sm font-medium text-[#1f1e30]",
  input:
    "h-[54px] w-full rounded-xl border border-[#EEEEEE] bg-white px-4 text-sm text-[#1f1e30] outline-none transition-colors focus:!border-[#1f1e30] focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
  primaryButton:
    "inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#B7FE1A] px-4 text-sm font-medium text-[#1f1e30] transition-colors hover:bg-[#a8ed12] disabled:cursor-not-allowed disabled:opacity-50 sm:w-[130px]",

  secondaryButton:
    "inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#1f1e30] px-4 text-sm font-normal text-white transition-colors hover:bg-[#333247] disabled:cursor-not-allowed disabled:opacity-50 sm:w-[130px]",
};

const fieldClass = "flex flex-col gap-2";

const formClass =
  "flex max-w-5xl flex-col gap-6 rounded-2xl border border-[#EEEEEE] bg-white p-5 shadow-[0_2px_10px_rgba(31,30,48,0.04)] sm:p-8";

function getRoleStyle(role: string | null) {
  switch (role) {
    case "Admin":
      return "bg-[#fce2d3]";
    case "Project Manager":
      return "bg-[#DCE8F2]";
    case "Staff":
      return "bg-[#D5EDE8]";
    default:
      return "bg-[#F5F5F4]";
  }
}

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const userId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [role, setRole] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadUser() {
      setLoading(true);
      setError("");

      if (!userId) {
        if (active) {
          setError("User ID tidak ditemukan.");
          setLoading(false);
        }
        return;
      }

      // Memeriksa pengguna yang sedang login
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        router.push("/login");
        return;
      }

      const loggedInUserId = authData.user.id;

      if (active) {
        setCurrentUserId(loggedInUserId);
      }

      // Memeriksa role pengguna yang sedang login
      const { data: currentUser, error: currentUserError } = await supabase
        .from("users")
        .select("id, role")
        .eq("id", loggedInUserId)
        .single();

      if (!active) return;

      if (currentUserError || !currentUser) {
        setError("Gagal membaca role pengguna yang sedang login.");
        setLoading(false);
        return;
      }

      if (currentUser.role !== "Admin") {
        setError("Akses ditolak. Hanya Admin yang dapat mengubah role.");
        setLoading(false);
        return;
      }

      // Mengambil data pengguna yang akan diedit
      const { data: targetUser, error: targetUserError } = await supabase
        .from("users")
        .select("id, name, email, role")
        .eq("id", userId)
        .single();

      if (!active) return;

      if (targetUserError || !targetUser) {
        setError("Pengguna tidak ditemukan atau gagal memuat data.");
        setLoading(false);
        return;
      }

      // Admin tidak boleh mengubah role dirinya sendiri
      if (targetUser.id === loggedInUserId) {
        setError("Admin tidak dapat mengubah role dirinya sendiri.");
        setLoading(false);
        return;
      }

      setUser(targetUser);
      setRole(targetUser.role || "Staff");
      setLoading(false);
    }

    loadUser();

    return () => {
      active = false;
    };
  }, [userId, router, supabase]);

  // Menyimpan perubahan role
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!user || saving) return;

    setError("");

    if (user.id === currentUserId) {
      setError("Admin tidak dapat mengubah role dirinya sendiri.");
      return;
    }

    if (!ROLES.includes(role)) {
      setError("Silakan pilih role yang valid.");
      return;
    }

    const oldRole = user.role || "Unknown";

    if (oldRole === role) {
      router.push("/dashboard/users");
      router.refresh();
      return;
    }

    setSaving(true);

    try {
      // Update role pengguna
      const { data: updatedUser, error: updateError } = await supabase
        .from("users")
        .update({
          role,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select("id, name, email, role")
        .single();

      if (updateError || !updatedUser) {
        setError(updateError?.message || "Gagal memperbarui role pengguna.");
        return;
      }

      // Mencatat aktivitas perubahan role
      // Kegagalan activity log tidak membatalkan perubahan role yang sudah berhasil.
      try {
        const { error: logError } = await createActivityLog({
          action: "UPDATE_USER_ROLE",
          description:
            `Mengubah role user "${updatedUser.name || updatedUser.email}" ` +
            `dari "${oldRole}" menjadi "${updatedUser.role}"`,
          metadata: {
            user_id: updatedUser.id,
            user_name: updatedUser.name,
            user_email: updatedUser.email,
            old_role: oldRole,
            new_role: updatedUser.role,
          },
        });

        if (logError) {
          console.error("Activity log error:", logError);
        }
      } catch (logErr) {
        console.error("Activity log exception:", logErr);
      }

      router.push("/dashboard/users");
      router.refresh();
    } catch (err) {
      console.error("Update user role error:", err);
      setError("Terjadi kesalahan saat memperbarui role pengguna.");
    } finally {
      setSaving(false);
    }
  }

  // Tampilan loading
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-5 text-[#1f1e30]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#1f1e30]/30 border-t-[#1f1e30]" />
          <p className="text-sm text-[#777777]">Memuat data pengguna...</p>
        </div>
      </main>
    );
  }

  // Tampilan error
  if (error && !user) {
    return (
      <main className="min-h-screen bg-[#f7f7f5] px-5 py-6 text-[#1f1e30] sm:px-7 lg:px-8">
        <div className="mb-6">
          <Link
            href="/dashboard/users"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#65A30D] transition-colors hover:text-[#4D7C0F]"
          >
            <ArrowLeftIcon />
            Kembali
          </Link>
        </div>

        <div
          role="alert"
          className="flex max-w-5xl items-start gap-3 rounded-xl border border-red-200 bg-[#fce2d3] px-5 py-4 text-sm text-red-700"
        >
          <AlertIcon />
          <p>{error}</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#f7f7f5] px-5 py-6 text-[#1f1e30] sm:px-7 lg:px-8">
        <div className="max-w-5xl rounded-2xl border border-[#EEEEEE] bg-white p-5 shadow-[0_2px_10px_rgba(31,30,48,0.04)]">
          <p className="text-sm text-[#777777]">
            Data pengguna tidak ditemukan.
          </p>
          <Link
            href="/dashboard/users"
            className={`${TEXT.secondaryButton} mt-4`}
          >
            Kembali
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-5 py-6 text-[#1f1e30] sm:px-7 lg:px-8">
      {/* Kembali */}
      <div className="mb-6">
        <Link
          href="/dashboard/users"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#65A30D] transition-colors hover:text-[#4D7C0F]"
        >
          <ArrowLeftIcon />
          Kembali
        </Link>
      </div>

      {/* Pesan Kesalahan */}
      {error && (
        <div
          role="alert"
          className="mb-6 flex max-w-5xl items-start gap-3 rounded-xl border border-red-200 bg-[#fce2d3] px-5 py-4 text-sm text-red-700"
        >
          <AlertIcon />
          <p>{error}</p>
        </div>
      )}

      {/* Form Edit Pengguna */}
      <form onSubmit={handleSubmit} className={formClass}>
        {/* Informasi Pengguna */}
        <div className="flex items-center gap-4 rounded-xl border border-[#EEEEEE] bg-[#fafaf9] p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1f1e30]">
            <span className="text-lg font-semibold text-[#B7FE1A]">
              {(user.name || user.email || "U").charAt(0).toUpperCase()}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#1f1e30]">
              {user.name || "Unnamed User"}
            </p>

            <p className="mt-1 truncate text-sm text-[#777777]">
              {user.email || "-"}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-[#777777]">Role saat ini:</span>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-[#1f1e30] ${getRoleStyle(user.role)}`}
              >
                {user.role || "Unknown"}
              </span>
            </div>
          </div>
        </div>

        {/* Pilihan Role */}
        <div className={fieldClass}>
          <label htmlFor="role" className={TEXT.label}>
            Role Pengguna <span className="text-red-500">*</span>
          </label>

          <div className="relative">
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={`${TEXT.input} appearance-none pr-11`}
              required
              disabled={saving}
            >
              {ROLES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <svg
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#777777]"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>

          <p className="text-xs leading-5 text-[#777777]">
            Role menentukan hak akses pengguna terhadap fitur di dalam sistem.
          </p>
        </div>

        {/* INFORMASI PERHATIAN */}
        <div className="flex items-start gap-3 rounded-xl border border-[#EEEEEE] bg-[#f7f7f5] p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#fce2d3] text-[#1f1e30]">
            <InfoIcon />
          </div>

          <div>
            <p className="text-sm font-medium text-[#1f1e30]">Perhatian</p>
            <p className="mt-1 text-sm leading-6 text-[#777777]">
              Perubahan role akan memengaruhi hak akses pengguna. Hanya Admin
              yang dapat mengubah role dan Admin tidak dapat mengubah role
              akunnya sendiri.
            </p>
          </div>
        </div>

        {/* Tombol Aksi */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => router.push("/dashboard/users")}
            className={TEXT.secondaryButton}
          >
            Batal
          </button>

          <button
            type="submit"
            disabled={saving || role === (user.role || "Unknown")}
            className={TEXT.primaryButton}
          >
            {saving ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1f1e30]/30 border-t-[#1f1e30]" />
                Menyimpan...
              </>
            ) : (
              "Simpan"
            )}
          </button>
        </div>
      </form>
    </main>
  );
}

function ArrowLeftIcon() {
  return (
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
  );
}

function AlertIcon() {
  return (
    <svg
      className="mt-0.5 shrink-0"
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
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </svg>
  );
}
