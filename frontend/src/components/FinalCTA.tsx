import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import mascotSrc from '../assets/mascot.webp'
import { joinWaitlist } from '../api/waitlist'

export default function FinalCTA() {
  const [email, setEmail] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed || !trimmed.includes('@')) {
      setStatus('error')
      setErrorMessage('Por favor ingresa un correo electrónico válido.')
      return
    }

    setStatus('loading')
    setErrorMessage('')

    try {
      const res = await joinWaitlist({
        email: trimmed,
        honeypot: honeypot.trim() || undefined,
        source: 'web_final_cta',
      })

      if (res.status === 'ok') {
        setIsAlreadyRegistered(Boolean(res.alreadyRegistered))
        setStatus('success')
      } else {
        setStatus('error')
        setErrorMessage(res.message || 'No se pudo unir a la lista de espera.')
      }
    } catch (err) {
      setStatus('error')
      setErrorMessage(
        err instanceof Error ? err.message : 'Error inesperado de red al conectar con el servidor.'
      )
    }
  }

  return (
    <section
      id="waitlist"
      className="relative py-28 px-6 md:px-12 border-t border-cardborder/60 overflow-hidden group-launch scroll-mt-20"
    >
      {/* Orbital glow rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-primaryviolet/30 animate-portal launch-portal transition-all duration-700 shadow-[0_0_60px_rgba(123,92,255,0.15)]" />
        <div
          className="w-[450px] h-[450px] rounded-full border border-dashed border-tealbrand/30 animate-spin"
          style={{ animationDuration: '35s' }}
        />
        <div className="absolute w-[320px] h-[320px] rounded-full bg-gradient-to-tr from-primaryviolet/25 via-tealbrand/10 to-transparent blur-2xl" />
        {/* Sparkles orbiting the portal */}
        <span aria-hidden="true" className="absolute top-[12%] left-[30%] text-starlight text-xl animate-twinkle">✦</span>
        <span aria-hidden="true" className="absolute bottom-[18%] right-[22%] text-[#B9A6FF] text-lg animate-twinkle" style={{ animationDelay: '1.1s' }}>✦</span>
        <span aria-hidden="true" className="absolute top-[40%] right-[8%] text-tealbrand text-sm animate-twinkle" style={{ animationDelay: '2s' }}>✦</span>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto flex flex-col items-center text-center gap-6 relative z-10">

        {/* Floating satellite */}
        <div className="w-32 h-32 sm:w-40 sm:h-40 relative animate-float-ship launch-thrust transition-all duration-500">
          <img
            src={mascotSrc}
            alt="AstroAm satellite"
            className="w-full h-full object-contain drop-shadow-[0_0_26px_rgba(123,92,255,0.7)]"
          />
        </div>

        {/* Active badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-primaryviolet-light border border-primaryviolet/40 font-mono text-xs font-bold text-[#B9A6FF] tracking-widest uppercase">
          <span className="w-2 h-2 rounded-full bg-tealbrand animate-pulse" />
          PRIVATE BETA ACCESS · DEVNET COHORT
        </div>

        {/* Headline */}
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-textprimary leading-tight">
          BE FIRST TO ACCESS<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primaryviolet via-tealbrand to-starlight drop-shadow-[0_0_24px_rgba(123,92,255,0.5)]">
            BORDERLESS DATA.
          </span>
        </h2>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-textsecondary max-w-xl font-normal leading-relaxed">
          Request early access to the AstroAm private beta. Stream global cellular connectivity paid per-second with USDC micropayments on Solana.
        </p>

        {/* Waitlist Form or Success Card */}
        <div className="w-full max-w-lg mt-2">
          {status === 'success' ? (
            <div className="p-6 sm:p-8 rounded-3xl bg-warmneutral/95 border border-tealbrand/50 shadow-[0_0_50px_rgba(47,208,221,0.25)] backdrop-blur-xl flex flex-col items-center text-center gap-4 transition-all">
              <div className="w-16 h-16 rounded-full bg-tealbrand/15 border border-tealbrand/60 flex items-center justify-center text-tealbrand shadow-[0_0_30px_rgba(47,208,221,0.4)]">
                <span className="material-symbols-outlined notranslate text-3xl">
                  {isAlreadyRegistered ? 'verified' : 'stars'}
                </span>
              </div>

              <div>
                <h3 className="font-display text-2xl font-bold text-textprimary">
                  {isAlreadyRegistered ? '¡Ya estás en órbita!' : '¡Bienvenido a bordo!'}
                </h3>
                <p className="text-sm text-textsecondary mt-2 leading-relaxed max-w-md font-sans">
                  {isAlreadyRegistered
                    ? 'Tu nave ya estaba reservada en la lista de espera de AstroAm. Te contactaremos tan pronto comience el despegue de la beta privada.'
                    : 'Tu acceso prioritario a la beta privada ha sido confirmado. Hemos guardado tu asiento en la cabina de AstroAm.'}
                </p>
              </div>

              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyanlight border border-tealbrand/30 font-mono text-xs text-tealbrand font-medium">
                <span className="w-2 h-2 rounded-full bg-online animate-pulse" />
                <span>SOLANA DEVNET · PIONEER CREW</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
              {/* Anti-bot Honeypot input */}
              <input
                type="text"
                name="astro_hp_gate"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="opacity-0 absolute -left-[9999px] w-0 h-0 pointer-events-none"
              />

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined notranslate absolute left-4 top-1/2 -translate-y-1/2 text-textsecondary/60 text-lg pointer-events-none">
                    alternate_email
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (status === 'error') setStatus('idle')
                    }}
                    placeholder="traveler@solana.space"
                    required
                    disabled={status === 'loading'}
                    className="w-full bg-warmneutral/90 border border-cardborder text-textprimary placeholder:text-textsecondary/60 focus:border-tealbrand focus:ring-1 focus:ring-tealbrand rounded-full pl-11 pr-5 py-3.5 font-sans text-sm outline-none transition-all duration-200 disabled:opacity-60"
                  />
                </div>

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="px-7 py-3.5 rounded-full bg-gradient-to-r from-primaryviolet to-primaryviolet-hover hover:from-primaryviolet-hover hover:to-primaryviolet text-white font-sans font-semibold text-xs tracking-wider uppercase shadow-[0_0_24px_rgba(123,92,255,0.5)] hover:shadow-[0_0_36px_rgba(123,92,255,0.8)] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  {status === 'loading' ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span>JOINING...</span>
                    </>
                  ) : (
                    <>
                      <span>JOIN BETA WAITLIST</span>
                      <span className="material-symbols-outlined notranslate text-sm">arrow_forward</span>
                    </>
                  )}
                </button>
              </div>

              {/* Error message */}
              {status === 'error' && errorMessage && (
                <div className="flex items-center justify-center gap-2 text-xs font-mono text-alerta bg-alerta/10 border border-alerta/30 rounded-full px-4 py-2 mt-1">
                  <span className="material-symbols-outlined notranslate text-sm">warning</span>
                  <span>{errorMessage}</span>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Direct Demo / Mission Link */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <span className="text-xs font-mono text-textsecondary uppercase tracking-widest">
            Ready for flight simulation now?
          </span>
          <Link
            to="/mission/new"
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-primaryviolet/40 hover:border-primaryviolet bg-primaryviolet-dim hover:bg-primaryviolet-light text-textprimary hover:text-white font-sans text-xs font-semibold uppercase tracking-wider transition-all duration-200"
          >
            <span>START MISSION DEMO</span>
            <span className="material-symbols-outlined notranslate text-sm">rocket_launch</span>
          </Link>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 font-mono text-xs text-textsecondary/80 uppercase tracking-widest pt-3">
          <span>NO CONTRACTS</span>
          <span className="text-primaryviolet/60">·</span>
          <span>ZERO SPAM</span>
          <span className="text-primaryviolet/60">·</span>
          <span>USDC ON SOLANA DEVNET</span>
        </div>
      </div>
    </section>
  )
}
