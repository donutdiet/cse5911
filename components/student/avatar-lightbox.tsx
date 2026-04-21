'use client'

import { useEffect, useState } from 'react'

type Props = {
  src: string
  alt: string
}

export default function AvatarLightbox({ src, alt }: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`View ${alt}'s profile picture`}
        className="block rounded-full transition hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-[#BB0000] focus:ring-offset-2"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="h-9 w-9 rounded-full object-cover border border-gray-200"
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${alt}'s profile picture`}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: '60vh', maxWidth: '60vw' }}
            className="rounded-lg shadow-2xl object-contain"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="absolute top-4 right-4 h-9 w-9 rounded-full bg-white/90 hover:bg-white text-gray-700 flex items-center justify-center shadow"
          >
            <span className="text-xl leading-none">&times;</span>
          </button>
        </div>
      )}
    </>
  )
}
