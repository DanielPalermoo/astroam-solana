import React from 'react'
import { Link } from 'react-router-dom'
import logoSrc from '../assets/logo-night.png'
import SystemBadge from './SystemBadge'

export default function Header() {
  const scrollToWaitlist = (e: React.MouseEvent) => {
    const el = document.getElementById('waitlist')
    if (el) {
      e.preventDefault()
      el.scrollIntoView({ behavior: 'smooth' })
      window.history.pushState(null, '', '#waitlist')
    }
  }

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-bglight/70 backdrop-blur-md border-b border-cardborder/80 transition-all">
      <div className="max-w-7xl mx-auto h-20 px-4 sm:px-6 md:px-12 flex items-center justify-between gap-2 sm:gap-4">

        {/* Logo */}
        <a href="/" className="flex items-center gap-2 sm:gap-3.5 py-1.5 group shrink-0">
          <img
            src={logoSrc}
            alt="AstroAm"
            className="h-7 sm:h-9 object-contain transition-transform duration-200 group-hover:scale-105"
          />
          <span className="hidden sm:inline-flex">
            <SystemBadge />
          </span>
        </a>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#how-it-works" className="py-2 text-sm font-medium text-textsecondary hover:text-white transition-colors">
            How it works
          </a>
          <a href="#technology" className="py-2 text-sm font-medium text-textsecondary hover:text-white transition-colors">
            Technology
          </a>
          <a href="#cockpit" className="py-2 text-sm font-medium text-textsecondary hover:text-white transition-colors">
            Live demo
          </a>
        </nav>

        {/* Action buttons */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <a
            href="/#waitlist"
            onClick={scrollToWaitlist}
            className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-full border border-tealbrand/40 hover:border-tealbrand bg-warmneutral/60 hover:bg-cyanlight text-tealbrand hover:text-white font-sans font-semibold text-xs tracking-wider uppercase shadow-[0_0_12px_rgba(47,208,221,0.15)] hover:shadow-[0_0_20px_rgba(47,208,221,0.35)] transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined notranslate text-xs sm:text-sm">auto_awesome</span>
            <span className="hidden sm:inline">JOIN WAITLIST</span>
            <span className="sm:hidden">WAITLIST</span>
          </a>

          <Link
            to="/mission/new"
            className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-full bg-primaryviolet text-white font-sans font-semibold text-xs tracking-wider uppercase hover:bg-primaryviolet-hover shadow-[0_0_18px_rgba(123,92,255,0.5)] hover:shadow-[0_0_28px_rgba(123,92,255,0.7)] hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-1.5 sm:gap-2"
          >
            <span className="hidden sm:inline">START MISSION</span>
            <span className="sm:hidden">START</span>
            <span className="material-symbols-outlined notranslate text-sm">rocket_launch</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
