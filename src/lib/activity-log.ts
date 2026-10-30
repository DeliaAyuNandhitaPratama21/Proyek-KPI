import { createClient } from './supabase/client'

type ActivityLogInput = {
  action: string
  description: string
  projectId?: number | string | null
  metadata?: Record<string, unknown>
}

export async function createActivityLog({
  action,
  description,
  projectId = null,
  metadata = {},
}: ActivityLogInput) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      error: new Error('User belum login.'),
    }
  }

  const { error } = await supabase
    .from('activity_logs')
    .insert({
      user_id: user.id,
      project_id: projectId ?? null,
      action,
      description,
      metadata,
    })

  return { error }
}