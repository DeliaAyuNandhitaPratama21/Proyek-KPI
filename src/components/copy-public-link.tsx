'use client'

type CopyPublicLinkProps = {
  token: string
}

export default function CopyPublicLink({
  token,
}: CopyPublicLinkProps) {
  async function handleCopy() {
    const url = `${window.location.origin}/project/${token}`

    try {
      await navigator.clipboard.writeText(url)

      alert('Public link berhasil disalin.')
    } catch {
      alert('Gagal menyalin public link.')
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-lg bg-lime-400 px-3 py-2 text-xs font-semibold text-black hover:bg-lime-300 transition"
    >
      Copy
    </button>
  )
}