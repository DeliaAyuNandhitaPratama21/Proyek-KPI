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
      className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-[#B7FE1A] px-3 py-1.5 text-sm font-medium text-[#1f1e30] transition-colors hover:bg-[#a8ed12]"
    >
      Copy
    </button>
  )
}