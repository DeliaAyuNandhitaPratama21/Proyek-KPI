import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";

import { createClient } from "../../../lib/supabase/server";
import { requireRole } from "../../auth/role-guard";
import DeleteUserButton, { DebouncedUserSearch } from "./delete-user-button";

type User = {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  created_at: string;
  updated_at: string | null;
};

type SearchParams = {
  q?: string;
  created?: string;
  deleted?: string;
  error?: string;
};

// HAPUS PENGGUNA
async function deleteUser(formData: FormData) {
  "use server";

  await requireRole(["Admin"]);

  const userId = String(formData.get("userId") || "").trim();

  if (!userId) {
    redirect("/dashboard/users?error=ID%20pengguna%20tidak%20valid");
  }

  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.getClaims();

  const currentUserId = authData?.claims?.sub;

  if (authError || !currentUserId) {
    redirect("/dashboard/users?error=Sesi%20masuk%20tidak%20ditemukan");
  }

  // Admin tidak boleh menghapus akun sendiri.
  if (userId === currentUserId) {
    redirect(
      "/dashboard/users?error=Tidak%20dapat%20menghapus%20akun%20sendiri",
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    redirect("/dashboard/users?error=Konfigurasi%20Supabase%20belum%20lengkap");
  }

  const adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Hapus akun dari Supabase Auth.
  const { error: deleteError } =
    await adminClient.auth.admin.deleteUser(userId);

  if (deleteError) {
    console.error("Delete user error:", deleteError);

    redirect(
      `/dashboard/users?error=${encodeURIComponent(deleteError.message)}`,
    );
  }

  revalidatePath("/dashboard/users");

  redirect("/dashboard/users?deleted=1");
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole(["Admin"]);

  const params = await searchParams;
  const search = (params.q || "").trim().toLowerCase();
  const keyword = search.replace(/[,%()]/g, "").trim();

  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.getClaims();

  if (authError || !authData?.claims?.sub) {
    return (
      <main className="min-h-screen bg-[#f7f7f5] px-5 py-6 text-[#1f1e30] sm:px-7 lg:px-8">
        <div className="max-w-4xl rounded-2xl border border-red-200 bg-white p-5 text-sm text-red-700 shadow-[0_2px_10px_rgba(31,30,48,0.04)]">
          Sesi masuk tidak ditemukan. Silakan masuk kembali.
        </div>
      </main>
    );
  }

  const currentUserId = authData.claims.sub;

  let usersQuery = supabase
    .from("users")
    .select(
      `
      id,
      name,
      email,
      role,
      created_at,
      updated_at
    `,
    );

  // Pencarian dilakukan langsung di Supabase agar data yang diambil lebih sedikit.
  if (keyword) {
    const conditions = [
      `name.ilike.%${keyword}%`,
      `email.ilike.%${keyword}%`,
      `role.ilike.%${keyword}%`,
    ];

    // Padanan nama hak akses dalam Bahasa Indonesia.
    const roleAliases = [
      { label: "administrator", role: 'Admin' },
      { label: "manajer proyek", role: 'Project Manager' },
      { label: "staf", role: 'Staff' },
    ];

    const matchingRoles = roleAliases
      .filter(({ label }) => label.includes(keyword))
      .map(({ role }) => role);

    matchingRoles.forEach((role) => {
      conditions.push(`role.eq.${role === "Project Manager" ? '"Project Manager"' : role}`);
    });

    usersQuery = usersQuery.or(conditions.join(","));
  }

  const { data: users, error } = await usersQuery.order("created_at", {
    ascending: true,
  });

  if (error) {
    return (
      <main className="min-h-screen bg-[#f7f7f5] px-5 py-6 text-[#1f1e30] sm:px-7 lg:px-8">
        <div className="max-w-4xl rounded-2xl border border-red-200 bg-white p-5 text-sm text-red-700 shadow-[0_2px_10px_rgba(31,30,48,0.04)]">
          Data pengguna gagal dimuat. Silakan muat ulang halaman.
        </div>
      </main>
    );
  }

  const filteredUsers = (users || []) as User[];

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const getRoleStyle = (role: string | null) => {
    switch (role) {
      case "Admin":
        return "bg-[#fce2d3]";
      case "Project Manager":
        return "bg-[#DCE8F2]";
      case "Staff":
        return "bg-[#f1ffcc]";
      default:
        return "bg-[#F5F5F4]";
    }
  };

  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case "Admin":
        return "Administrator";
      case "Project Manager":
        return "Manajer Proyek";
      case "Staff":
        return "Staf";
      default:
        return "Tidak diketahui";
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-5 py-6 text-[#1f1e30] sm:px-7 lg:px-8">
      {/* HEADER */}
      <div className="mb-8 mt-2 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* SEARCH */}
        <DebouncedUserSearch initialSearch={params.q || ""} deleted={params.deleted === "1"} />

        {/* TOMBOL TAMBAH */}
        <Link
          href="/dashboard/users/new"
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#B7FE1A] px-4 text-sm font-[500] text-[#1f1e30] transition-colors hover:bg-[#a8ed12] sm:w-[130px]"
        >
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
      </div>

      {/* DAFTAR PENGGUNA */}
      <section className="overflow-hidden rounded-2xl border border-[#EEEEEE] bg-white shadow-[0_2px_10px_rgba(31,30,48,0.04)]">
        {/* SECTION HEADER */}
        <div className="border-b border-[#EEEEEE] px-5 py-5 sm:px-6">
          <h2 className="text-lg font-semibold text-[#1f1e30]">
            Daftar Akun Pengguna
          </h2>

          <p className="mt-1 text-sm text-[#777777]">
            {filteredUsers.length} pengguna terdaftar
          </p>
        </div>

        {/* NOTIFIKASI BERHASIL DITAMBAHKAN */}
        {params.created === "1" && (
          <div
            role="status"
            className="mx-5 mt-5 rounded-xl border border-[#B7FE1A]/40 bg-[#f1ffcc] px-5 py-4 text-sm text-[#3F6212] sm:mx-6"
          >
            Pengguna berhasil ditambahkan.
          </div>
        )}

        {/* NOTIFIKASI GAGAL */}
        {params.error && (
          <div
            role="alert"
            className="mx-5 mt-5 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 sm:mx-6"
          >
            {params.error}
          </div>
        )}

        {/* TABEL PENGGUNA */}
        {filteredUsers.length > 0 ? (
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-[#D6D3D1] scrollbar-track-transparent hover:scrollbar-thumb-[#A8A8A8]">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="border-b border-[#EEEEEE] bg-[#fafaf9] text-left text-xs font-semibold uppercase tracking-wide text-[#777777]">
                  <th className="px-6 py-4">Pengguna</th>
                  <th className="whitespace-nowrap px-6 py-4">Alamat Email</th>
                  <th className="px-6 py-4">Hak Akses</th>
                  <th className="px-6 py-4">Tanggal Dibuat</th>
                  <th className="whitespace-nowrap px-6 py-4">
                    Terakhir Diperbarui
                  </th>
                  <th className="px-6 py-4 text-center">Tindakan</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user) => {
                  const isCurrentUser = user.id === currentUserId;

                  return (
                    <tr
                      key={user.id}
                      className="border-b border-[#EEEEEE] last:border-b-0"
                    >
                      {/* PENGGUNA */}
                      <td className="max-w-[280px] px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1f1e30]">
                            <span className="font-semibold text-[#B7FE1A]">
                              {(user.name || "P").charAt(0).toUpperCase()}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-nowrap items-center gap-2">
                              <p className="min-w-0 truncate text-sm font-medium text-[#1f1e30]">
                                {user.name || "Nama Belum Diisi"}
                              </p>

                              {isCurrentUser && (
                                <span className="inline-flex shrink-0 rounded-full bg-[#f1ffcc] px-2 py-1 text-[10px] font-medium text-[#1f1e30]">
                                  Anda
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* EMAIL */}
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-[#555563]">
                        {user.email || "-"}
                      </td>

                      {/* HAK AKSES */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium leading-4 text-[#1f1e30] ${getRoleStyle(user.role)}`}
                        >
                          {getRoleLabel(user.role)}
                        </span>
                      </td>

                      {/* TANGGAL DIBUAT */}
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-[#555563]">
                        {formatDate(user.created_at)}
                      </td>

                      {/* TERAKHIR DIPERBARUI */}
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-[#555563]">
                        {user.updated_at ? formatDate(user.updated_at) : "-"}
                      </td>

                      {/* TINDAKAN */}
                      <td className="whitespace-nowrap px-6 py-4 text-left">
                        {isCurrentUser ? (
                          <span className="inline-block text-sm text-[#999999]">
                            Pengguna saat ini
                          </span>
                        ) : (
                          <div className="flex items-center justify-start gap-2">
                            <Link
                              href={`/dashboard/users/${user.id}/edit`}
                              className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-[#65A30D] bg-[#f1ffcc] px-3 py-1.5 text-sm font-normal text-[#65A30D] transition-colors hover:bg-[#e7f7b8]"
                            >
                              Edit
                            </Link>

                            {/* TOMBOL HAPUS */}
                            <DeleteUserButton
                              userId={user.id}
                              action={deleteUser}
                            />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* EMPTY STATE */
          <div className="px-5 py-13 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#f1ffcc]">
              <UserListIcon />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-[#1f1e30]">
              {search ? "Pengguna Tidak Ditemukan" : "Belum Ada Pengguna"}
            </h3>

            <p className="mt-1 text-sm text-[#777777]">
              {search
                ? "Tidak ada pengguna yang sesuai dengan pencarian."
                : "Belum ada pengguna yang terdaftar untuk ditampilkan."}
            </p>

            {search ? (
              <Link
                href="/dashboard/users"
                className="mt-5 inline-flex justify-center whitespace-nowrap text-sm font-medium text-[#65A30D] transition-colors hover:text-[#4D7C0F]"
              >
                Reset Pencarian
              </Link>
            ) : (
              <Link
                href="/dashboard/users/new"
                className="mt-5 inline-flex justify-center whitespace-nowrap text-sm font-medium text-[#65A30D] transition-colors hover:text-[#4D7C0F]"
              >
                Tambah Pengguna Pertama
              </Link>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

function UserListIcon() {
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
      group
    </span>
  );
}
