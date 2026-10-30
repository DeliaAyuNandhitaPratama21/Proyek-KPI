import { createClient } from "../../../lib/supabase/server";
import Link from "next/link";
import { requireRole } from "../../auth/role-guard";

const TEXT = {
  pageTitle: "text-3xl font-semibold tracking-tight text-white",
  sectionTitle: "text-lg font-semibold text-white",
  subtitle: "mt-1 text-sm text-zinc-400",
  secondary: "text-sm text-[#A5BDCC]",
  action:
    "inline-flex items-center justify-end rounded-lg px-0 py-2 text-sm font-medium text-[#B7FE1A] transition-colors hover:text-[#caff57]",
};

type User = {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  created_at: string;
  updated_at: string | null;
};

export default async function UsersPage() {
  await requireRole(["Admin"]);

  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.getClaims();

  if (authError || !authData?.claims?.sub) {
    return (
      <main className="min-h-screen bg-[#111111] px-5 py-6 text-white sm:px-7 lg:px-8">
        <div className="mb-8 mt-2">
          <h1 className={TEXT.pageTitle}>Pengguna</h1>
          <p className={TEXT.subtitle}>
            Kelola pengguna dan hak akses yang dimiliki dalam sistem.
          </p>
        </div>

        <div className="max-w-4xl rounded-[22px] border border-red-500/20 bg-[#1c1c1c]/80 p-5 text-sm text-red-400">
          Sesi masuk tidak ditemukan. Silakan masuk kembali.
        </div>
      </main>
    );
  }

  const currentUserId = authData.claims.sub;

  const { data: users, error } = await supabase
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
    )
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    return (
      <main className="min-h-screen bg-[#111111] px-5 py-6 text-white sm:px-7 lg:px-8">
        <div className="mb-8 mt-2">
          <h1 className={TEXT.pageTitle}>Pengguna</h1>
          <p className={TEXT.subtitle}>
            Kelola pengguna dan hak akses yang dimiliki dalam sistem.
          </p>
        </div>

        <div className="max-w-4xl rounded-[22px] border border-red-500/20 bg-[#1c1c1c]/80 p-5 text-sm text-red-400">
          Data pengguna gagal dimuat. Silakan muat ulang halaman.
        </div>
      </main>
    );
  }

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
        return "bg-[#5C2028] text-[#FDA4AF]";
      case "Project Manager":
        return "bg-[#123D56] text-[#7DD3FC]";
      case "Staff":
        return "bg-[#075C3C] text-[#6EE7B7]";
      default:
        return "bg-[#262626] text-zinc-400";
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
    <main className="min-h-screen bg-[#111111] px-5 py-6 text-white sm:px-7 lg:px-8">
      {/* Judul Halaman */}
      <div className="mb-8 mt-2">
        <h1 className={TEXT.pageTitle}>Pengguna</h1>
        <p className={TEXT.subtitle}>
          Kelola pengguna dan hak akses yang dimiliki dalam sistem.
        </p>
      </div>

      {/* Daftar Pengguna */}
      <section className="max-w-full overflow-hidden rounded-[22px] border border-[#2a2a2a] bg-[#1c1c1c]/80">
        {/* Judul Bagian */}
        <div className="border-b border-[#262626] px-6 py-5 sm:px-8">
          <h2 className={TEXT.sectionTitle}>Daftar Akun Pengguna</h2>
          <p className={TEXT.subtitle}>
            {users?.length ?? 0} pengguna terdaftar
          </p>
        </div>

        {/* Tabel Pengguna */}
        {users && users.length > 0 ? (
          <div className="tasks-scrollbar overflow-x-auto">
            <table className="w-full min-w-[1050px] table-fixed">
              <colgroup>
                <col className="w-[24%]" />
                <col className="w-[22%]" />
                <col className="w-[15%]" />
                <col className="w-[14%]" />
                <col className="w-[15%]" />
                <col className="w-[10%]" />
              </colgroup>

              <thead>
                <tr className="border-b border-[#262626] text-xs font-medium uppercase tracking-wide text-zinc-400">
                  <th className="whitespace-nowrap px-6 py-4 text-left sm:pl-8">
                    Pengguna
                  </th>

                  <th className="whitespace-nowrap px-6 py-4 text-left">
                    Alamat Email
                  </th>

                  <th className="whitespace-nowrap px-6 py-4 text-left">
                    Hak Akses
                  </th>

                  <th className="whitespace-nowrap px-6 py-4 text-left">
                    Tanggal Dibuat
                  </th>

                  <th className="px-6 py-4 text-left">
                    <span className="block whitespace-nowrap">Terakhir</span>
                    <span className="block whitespace-nowrap">Diperbarui</span>
                  </th>

                  <th className="whitespace-nowrap px-6 py-4 text-right sm:pr-8">
                    Tindakan
                  </th>
                </tr>
              </thead>

              <tbody>
                {users.map((user: User) => {
                  const isCurrentUser = user.id === currentUserId;

                  return (
                    <tr
                      key={user.id}
                      className="border-b border-[#262626] transition-colors last:border-b-0 hover:bg-white/[0.02]"
                    >
                      {/* Informasi Pengguna */}
                      <td className="px-6 py-4 sm:pl-8">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#B7FE1A]/10">
                            <span className="font-semibold text-[#B7FE1A]">
                              {(user.name || "P").charAt(0).toUpperCase()}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="max-w-[200px] truncate text-sm font-medium text-white">
                                {user.name || "Nama Belum Diisi"}
                              </p>

                              {isCurrentUser && (
                                <span className="inline-flex rounded-full bg-[#075C3C] px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-[#6EE7B7]">
                                  Anda
                                </span>
                              )}
                            </div>

                            <p className="mt-1 text-xs text-zinc-500">
                              ID: {user.id.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Alamat Email */}
                      <td className="px-6 py-4">
                        <p className="max-w-[230px] truncate text-sm text-[#A5BDCC]">
                          {user.email || "-"}
                        </p>
                      </td>

                      {/* Hak Akses */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${getRoleStyle(user.role)}`}
                        >
                          {getRoleLabel(user.role)}
                        </span>
                      </td>

                      {/* Tanggal Dibuat */}
                      <td className="whitespace-nowrap px-6 py-4">
                        <p className={TEXT.secondary}>
                          {formatDate(user.created_at)}
                        </p>
                      </td>

                      {/* Terakhir Diperbarui */}
                      <td className="whitespace-nowrap px-6 py-4">
                        <p className={TEXT.secondary}>
                          {user.updated_at ? formatDate(user.updated_at) : "-"}
                        </p>
                      </td>

                      {/* Tindakan */}
                      <td className="whitespace-nowrap px-6 py-4 text-right sm:pr-8">
                        {isCurrentUser ? (
                          <span className="inline-block text-sm text-zinc-500">
                            Pengguna saat ini
                          </span>
                        ) : (
                          <Link
                            href={`/dashboard/users/${user.id}/edit`}
                            className={TEXT.action}
                          >
                            Edit Hak Akses
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Tampilan Ketika Belum Ada Pengguna */
          <div className="px-5 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#262626]">
              <UserListIcon />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-white">
              Belum Ada Pengguna
            </h3>

            <p className="mt-1 text-sm text-zinc-400">
              Pengguna yang terdaftar akan ditampilkan di sini.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

function UserListIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#B7FE1A"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="10" cy="7" r="4" />
      <path d="M20 8v6" />
      <path d="M23 11h-6" />
    </svg>
  );
}
