
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },

        setAll(cookiesToSet) {
          // Perbarui cookie pada request agar dapat dibaca
          // oleh proses berikutnya dalam request yang sama.
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })

          // Buat response baru dengan request yang telah diperbarui.
          supabaseResponse = NextResponse.next({
            request,
          })

          // Kirim semua cookie beserta opsi aslinya ke browser.
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Memvalidasi klaim dan membantu Supabase memperbarui sesi.
  await supabase.auth.getClaims()

  return supabaseResponse
}
