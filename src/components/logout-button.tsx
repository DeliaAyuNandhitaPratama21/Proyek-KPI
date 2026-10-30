'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../lib/supabase/client'

export default function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogout() {
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()

      if (error) {
        setError('Logout gagal. Silakan coba lagi.')
        return
      }

      router.replace('/login')
      router.refresh()
    } catch {
      setError('Terjadi kesalahan saat logout.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {error && (
        <p role="alert" className="px-4 pb-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className="w-full text-left px-4 py-3 rounded-xl text-zinc-400 hover:bg-white/[0.04] hover:text-[#B7FE1A] transition disabled:opacity-50"
      >
        {loading ? 'Logging out...' : 'Logout'}
      </button>
    </div>
  )
}
