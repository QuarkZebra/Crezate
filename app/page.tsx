'use client'

import { useState, useEffect, useRef } from 'react'

const WORDS = [
  { text: 'Conceive.', delay: 0 },
  { text: 'Explore.', delay: 0 },
  { text: 'Learn.', delay: 0 },
  { text: 'Create.', delay: 0 },
]

type Dust = {
  id: number
  startX: number
  startY: number
  endX: number
  endY: number
  size: number
  delay: number
  duration: number
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [visibleWords, setVisibleWords] = useState<number[]>([])
  const [showBrand, setShowBrand] = useState(false)
  const [taglineProgress, setTaglineProgress] = useState(0)
  const [dust, setDust] = useState<Dust[]>([])
  const [dustFlying, setDustFlying] = useState(false)
  const [resourcesBold, setResourcesBold] = useState(false)
  const [showScrollHint, setShowScrollHint] = useState(true)
  const wordRefs = useRef<(HTMLDivElement | null)[]>([])
  const brandRef = useRef<HTMLDivElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const taglineRef = useRef<HTMLDivElement | null>(null)
  const resourcesBtnRef = useRef<HTMLButtonElement | null>(null)
  const dustFired = useRef(false)
  const dustTimers = useRef<number[]>([])

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Hide scroll hint once user starts scrolling
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 60) setShowScrollHint(false)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Intersection observer for scroll-triggered reveals
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute('data-index'))
            if (!isNaN(index)) {
              setVisibleWords((prev) =>
                prev.includes(index) ? prev : [...prev, index]
              )
            }
            if (entry.target.getAttribute('data-brand') === 'true') {
              setShowBrand(true)
            }
          }
        })
      },
      { threshold: 0.5 }
    )

    wordRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref)
    })
    if (brandRef.current) observer.observe(brandRef.current)

    return () => observer.disconnect()
  }, [])

  // Tagline bolden/dissolve driven by the last stretch of scroll
  useEffect(() => {
    function onScroll() {
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      const remaining = max - window.scrollY
      const range = window.innerHeight * 0.45
      const p = Math.min(1, Math.max(0, 1 - remaining / range))
      setTaglineProgress(p)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  // When the tagline has fully dissolved, release dust toward the Resources menu
  useEffect(() => {
    if (taglineProgress >= 0.98 && !dustFired.current) {
      dustFired.current = true
      const t = taglineRef.current?.getBoundingClientRect()
      const b = resourcesBtnRef.current?.getBoundingClientRect()
      if (!t || !b) return
      const particles: Dust[] = Array.from({ length: 32 }, (_, i) => ({
        id: i,
        startX: t.left + Math.random() * t.width,
        startY: t.top + Math.random() * t.height,
        endX: b.left + Math.random() * b.width,
        endY: b.top + Math.random() * b.height,
        size: 2 + Math.random() * 3,
        delay: Math.random() * 350,
        duration: 900 + Math.random() * 600,
      }))
      setDust(particles)
      setDustFlying(false)
      dustTimers.current.push(window.setTimeout(() => setDustFlying(true), 30))
      dustTimers.current.push(
        window.setTimeout(() => setResourcesBold(true), 1400)
      )
      dustTimers.current.push(window.setTimeout(() => setDust([]), 2200))
    }
    // Scrolling back up resets the sequence so it can replay
    if (taglineProgress < 0.3 && dustFired.current) {
      dustFired.current = false
      dustTimers.current.forEach(clearTimeout)
      dustTimers.current = []
      setDust([])
      setDustFlying(false)
      setResourcesBold(false)
    }
  }, [taglineProgress])

  const boldP = Math.min(1, taglineProgress / 0.5)
  const dissolveP = Math.max(0, (taglineProgress - 0.5) / 0.5)

  return (
    <main className="relative">
      {/* ── FIXED BACKGROUND ── */}
      {/* Mobile image */}
      <div
        className="fixed inset-0 z-0 md:hidden"
        style={{
          backgroundImage: 'url(/hero-m-v2.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 20%',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(10,12,24,0.25) 0%, rgba(10,12,24,0.15) 40%, rgba(10,12,24,0.5) 80%, rgba(10,12,24,0.85) 100%)',
          }}
        />
      </div>
      {/* Desktop image */}
      <div
        className="fixed inset-0 z-0 hidden md:block"
        style={{
          backgroundImage: 'url(/hero-d-v2.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(10,12,24,0.25) 0%, rgba(10,12,24,0.15) 40%, rgba(10,12,24,0.5) 80%, rgba(10,12,24,0.85) 100%)',
          }}
        />
      </div>

      {/* ── DUST PARTICLES ── */}
      {dust.map((p) => (
        <div
          key={p.id}
          className="fixed z-[60] rounded-full pointer-events-none"
          style={{
            width: p.size,
            height: p.size,
            left: 0,
            top: 0,
            background: 'var(--cream)',
            transform: `translate(${dustFlying ? p.endX : p.startX}px, ${dustFlying ? p.endY : p.startY}px)`,
            opacity: dustFlying ? 0 : 0.9,
            transition: `transform ${p.duration}ms cubic-bezier(0.3, 0.6, 0.25, 1) ${p.delay}ms, opacity ${p.duration}ms ease-in ${p.delay + p.duration * 0.4}ms`,
          }}
        />
      ))}

      {/* ── TOP NAV ── */}
      <nav className="fixed top-3 left-3 right-3 z-50 flex items-center justify-between px-16 py-12 md:px-28 md:py-16">
        {/* Logo */}
        <div
          style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.06em' }}
          className="text-lg md:text-xl font-light tracking-wide"
        >
          <span style={{ color: 'var(--cream-bright)' }}>Crezate</span>
        </div>

        {/* Resources dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            ref={resourcesBtnRef}
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center rounded-xl transition-all duration-300"
            style={{
              // The global `*` reset zeroes Tailwind padding utilities, so size inline
              gap: '10px',
              padding: '7px 15px',
              background: menuOpen
                ? 'rgba(240,236,228,0.12)'
                : resourcesBold
                ? 'rgba(240,236,228,0.1)'
                : 'rgba(240,236,228,0.06)',
              border: '1.5px solid rgba(240,236,228,0.1)',
              boxShadow: resourcesBold ? '0 0 24px rgba(240,236,228,0.2)' : 'none',
              color: resourcesBold ? 'var(--cream-bright)' : 'var(--cream-dim)',
              fontFamily: 'var(--font-body)',
              fontSize: 'clamp(16px, 1.5vw, 19px)',
              fontWeight: resourcesBold ? 600 : 300,
              letterSpacing: '0.04em',
            }}
          >
            Resources
            <svg
              width="18" height="18" viewBox="0 0 14 14" fill="none"
              style={{
                transform: menuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            >
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 rounded-xl overflow-hidden"
              style={{
                marginTop: '8px',
                padding: '10px 0',
                background: 'rgba(18, 20, 36, 0.9)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(240,236,228,0.08)',
                minWidth: '280px',
                animation: 'menuIn 0.15s ease',
              }}
            >
              <div
                className="text-xs uppercase tracking-widest"
                style={{ padding: '6px 20px', color: 'rgba(240,236,228,0.25)', fontFamily: 'var(--font-body)', fontWeight: 300 }}
              >
                Apps
              </div>
              <a
                href="https://310s-prep.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="block transition-colors duration-150"
                style={{
                  padding: '16px 20px',
                  color: 'var(--cream-dim)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '16px',
                  fontWeight: 300,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(240,236,228,0.06)'
                  e.currentTarget.style.color = 'var(--cream-bright)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--cream-dim)'
                }}
              >
                310S Red Seal Prep
              </a>
            </div>
          )}
        </div>
      </nav>

      {/* ── SCROLL CONTENT ── */}
      {/* First viewport: 100dvh so chevron stays above browser chrome on mobile */}
      <section
        className="relative z-10 flex items-end justify-center pb-10"
        style={{ height: '100dvh' }}
      >
        <div
          style={{
            color: 'var(--cream-bright)',
            opacity: showScrollHint ? 1 : 0,
            transition: 'opacity 0.8s ease',
            animation: 'scrollHint 2.4s ease-in-out infinite',
            pointerEvents: 'none',
            filter: 'drop-shadow(0 0 6px rgba(240,236,228,0.4))',
          }}
        >
          <svg width="44" height="26" viewBox="0 0 28 16" fill="none">
            <path d="M4 4l10 9 10-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </section>

      {/* Word reveals */}
      {WORDS.map((word, i) => (
        <section
          key={word.text}
          className="relative z-10 h-[70vh] flex items-center justify-center"
        >
          <div
            ref={(el) => { wordRefs.current[i] = el }}
            data-index={i}
            className="transition-all duration-1000 ease-out"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(3rem, 8vw, 7rem)',
              fontWeight: 300,
              letterSpacing: '0.03em',
              color: 'var(--cream)',
              opacity: visibleWords.includes(i) ? 0.75 : 0,
              transform: visibleWords.includes(i) ? 'translateY(0)' : 'translateY(40px)',
            }}
          >
            {word.text}
          </div>
        </section>
      ))}

      {/* Final brand reveal */}
      <section className="relative z-10 h-screen flex items-center justify-center">
        <div
          ref={brandRef}
          data-brand="true"
          className="text-center transition-all duration-1200 ease-out"
          style={{
            opacity: showBrand ? 1 : 0,
            transform: showBrand ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.97)',
            transitionDuration: '1.2s',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(4.5rem, 12vw, 10rem)',
              fontWeight: 600,
              letterSpacing: '0.02em',
              color: 'var(--cream-bright)',
              lineHeight: 1,
            }}
          >
            Crezate
          </div>
          <div
            ref={taglineRef}
            className="mt-4"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'clamp(0.85rem, 1.5vw, 1.1rem)',
              fontWeight: 200 + Math.round(boldP * 500),
              letterSpacing: `${0.25 + dissolveP * 0.12}em`,
              textTransform: 'uppercase',
              color: 'var(--cream-dim)',
              opacity: 1 - dissolveP,
              filter: `blur(${dissolveP * 6}px)`,
            }}
          >
            Create your own path
          </div>
        </div>
      </section>

      {/* Inline keyframes */}
      <style jsx global>{`
        @keyframes menuIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scrollHint {
          0%, 100% { opacity: 0; transform: translateY(-6px); }
          40%, 60% { opacity: 0.75; transform: translateY(4px); }
        }
      `}</style>
    </main>
  )
}
