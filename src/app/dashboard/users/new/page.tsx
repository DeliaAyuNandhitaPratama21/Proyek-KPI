import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "../../../auth/role-guard";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

type SearchParams = {
  error?: string;
};

const inputClass =
  "h-[54px] w-full rounded-xl border border-[#EEEEEE] bg-white px-4 text-sm text-[#1f1e30] outline-none transition-colors placeholder:text-[#999999] focus:!border-[#1f1e30] focus:outline-none focus:ring-0 autofill:[-webkit-box-shadow:inset_0_0_0_1000px_#ffffff] autofill:[-webkit-text-fill-color:#1f1e30]";

const labelClass = "block text-sm font-medium text-[#1f1e30]";
const fieldClass = "flex flex-col gap-2";
const formClass =
  "flex max-w-5xl flex-col gap-6 rounded-2xl border border-[#EEEEEE] bg-white p-5 shadow-[0_2px_10px_rgba(31,30,48,0.04)] sm:p-8";

export default async function CreateUserPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole(["Admin"]);

  const params = await searchParams;

  const errorMessages: Record<string, string> = {
    invalid: "Mohon lengkapi semua data dengan benar.",
    password: "Password minimal harus 8 karakter.",
    email: "Format alamat email tidak valid.",
    duplicate: "Email tersebut sudah terdaftar.",
    config: "Konfigurasi server belum lengkap.",
    create: "Akun pengguna gagal dibuat. Silakan coba kembali.",
  };

  async function createUser(formData: FormData) {
    "use server";

    await requireRole(["Admin"]);

    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "")
      .trim()
      .toLowerCase();
    const password = String(formData.get("password") || "");
    const role = String(formData.get("role") || "");

    const allowedRoles = ["Admin", "Project Manager", "Staff"];

    if (!name || !email || !password || !allowedRoles.includes(role)) {
      redirect("/dashboard/users/new?error=invalid");
    }

    if (password.length < 8) {
      redirect("/dashboard/users/new?error=password");
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      redirect("/dashboard/users/new?error=email");
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      redirect("/dashboard/users/new?error=config");
    }

    const adminSupabase = createSupabaseClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: authData, error: authError } =
      await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });

    if (authError || !authData.user) {
      console.error("CREATE AUTH USER ERROR:", authError);

      const message = authError?.message.toLowerCase() || "";

      if (
        message.includes("already") ||
        message.includes("registered") ||
        message.includes("exists")
      ) {
        redirect("/dashboard/users/new?error=duplicate");
      }

      redirect("/dashboard/users/new?error=create");
    }

    const { data: profile, error: profileError } = await adminSupabase
      .from("users")
      .update({
        name,
        email,
        role,
        updated_at: new Date().toISOString(),
      })
      .eq("id", authData.user.id)
      .select("id")
      .maybeSingle();

    if (profileError || !profile) {
      console.error("UPDATE USER PROFILE ERROR:", profileError);

      const { error: rollbackError } =
        await adminSupabase.auth.admin.deleteUser(authData.user.id);

      if (rollbackError) {
        console.error("ROLLBACK AUTH USER ERROR:", rollbackError);
      }

      redirect("/dashboard/users/new?error=create");
    }

    redirect("/dashboard/users?created=1");
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-5 py-6 text-[#1f1e30] sm:px-7 lg:px-8">
      <div className="mb-6">
        <Link
          href="/dashboard/users"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#65A30D] transition-colors hover:text-[#4D7C0F]"
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
      </div>

      <form action={createUser} autoComplete="off" className={formClass}>
        {params.error && errorMessages[params.error] && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {errorMessages[params.error]}
          </div>
        )}

        <div className={fieldClass}>
          <label htmlFor="name" className={labelClass}>
            Nama Pengguna <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={100}
            autoComplete="off"
            placeholder="Masukkan nama pengguna"
            className={inputClass}
          />
        </div>

        <div className={fieldClass}>
          <label htmlFor="email" className={labelClass}>
            Alamat Email <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="off"
            placeholder="nama@email.com"
            className={inputClass}
          />
        </div>

        <div className={fieldClass}>
          <label htmlFor="password" className={labelClass}>
            Password <span className="text-red-500">*</span>
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Minimal 8 karakter"
            className={inputClass}
          />
          <p className="text-xs leading-5 text-[#777777]">
            Password minimal terdiri dari 8 karakter.
          </p>
        </div>

        <div className={fieldClass}>
          <label htmlFor="role" className={labelClass}>
            Hak Akses <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              id="role"
              name="role"
              required
              defaultValue=""
              className={`${inputClass} appearance-none pr-12`}
            >
              <option value="" disabled>
                Pilih hak akses
              </option>
              <option value="Admin">Administrator</option>
              <option value="Project Manager">Manajer Proyek</option>
              <option value="Staff">Staf</option>
            </select>
            <svg
              className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777777]"
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
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/dashboard/users"
            className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#1f1e30] px-4 text-sm font-normal text-white transition-colors hover:bg-[#333247] sm:w-[130px]"
          >
            Batal
          </Link>

          <button
            type="submit"
            className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#B7FE1A] px-4 text-sm font-medium text-[#1f1e30] transition-colors hover:bg-[#a8ed12] sm:w-[130px]"
          >
            Tambah
          </button>
        </div>
      </form>
    </main>
  );
}
