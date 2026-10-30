import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'

export async function requireRole(
  allowedRoles: string[]
) {
  const supabase = await createClient()

  const { data, error } =
    await supabase.auth.getClaims()

  if (error || !data?.claims) {
    redirect('/login')
  }

  const userId = data.claims.sub

  if (!userId) {
    redirect('/login')
  }

  const { data: profile, error: profileError } =
    await supabase
      .from('users')
      .select('id, name, email, role')
      .eq('id', userId)
      .single()

  if (profileError || !profile) {
    redirect('/login')
  }

  if (!allowedRoles.includes(profile.role)) {
    redirect('/dashboard')
  }

  return profile
}