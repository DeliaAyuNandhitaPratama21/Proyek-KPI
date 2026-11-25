import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Validasi session Supabase
  const { data, error } = await supabase.auth.getClaims();

  // Periksa apakah URL merupakan halaman Klien
  const pathname = request.nextUrl.pathname;

  const isClientRoute =
    pathname === "/dashboard/clients" ||
    pathname.startsWith("/dashboard/clients/");

  const isArchivedClientsRoute =
    pathname === "/dashboard/clients/archive" ||
    pathname.startsWith("/dashboard/clients/archive/");

  // Pemeriksaan role untuk halaman Klien
  if (isClientRoute) {
    const userId = data?.claims?.sub;

    // Jika belum login, arahkan ke halaman login
    if (error || typeof userId !== "string") {
      const response = NextResponse.redirect(
        new URL("/login", request.url)
      );

      supabaseResponse.cookies.getAll().forEach((cookie) => {
        response.cookies.set(cookie);
      });

      return response;
    }

    // Ambil role pengguna
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();

    // Halaman arsip Klien hanya boleh diakses Admin.
    // Halaman Klien lainnya boleh diakses Admin dan Project Manager.
    const hasAccess = isArchivedClientsRoute
      ? profile?.role === "Admin"
      : profile?.role === "Admin" || profile?.role === "Project Manager";

    if (profileError || !hasAccess) {
      const response = NextResponse.redirect(
        new URL("/dashboard", request.url)
      );

      supabaseResponse.cookies.getAll().forEach((cookie) => {
        response.cookies.set(cookie);
      });

      return response;
    }
  }

  return supabaseResponse;
}
