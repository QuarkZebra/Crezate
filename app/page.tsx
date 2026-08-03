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
  size: number
  delay: number
  duration: number
  x0: number
  y0: number
  cx1: number
  cy1: number
  cx2: number
  cy2: number
  x1: number
  y1: number
}

// Small seeded PRNG (mulberry32) — seeded with the current timestamp so
// every dissolve traces a different set of curves
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [visibleWords, setVisibleWords] = useState<number[]>([])
  const [showBrand, setShowBrand] = useState(false)
  const [taglineProgress, setTaglineProgress] = useState(0)
  const [taglinePhase, setTaglinePhase] = useState<'idle' | 'growing' | 'dissolving'>('idle')
  const [dust, setDust] = useState<Dust[]>([])
  const [resourcesIgnite, setResourcesIgnite] = useState(false)
  const [resourcesBold, setResourcesBold] = useState(false)
  const [showScrollHint, setShowScrollHint] = useState(true)
  const wordRefs = useRef<(HTMLDivElement | null)[]>([])
  const brandRef = useRef<HTMLDivElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const taglineRef = useRef<HTMLDivElement | null>(null)
  const resourcesBtnRef = useRef<HTMLButtonElement | null>(null)
  const seqFired = useRef(false)
  const seqTimers = useRef<number[]>([])
  const rafId = useRef<number | null>(null)
  const particleEls = useRef<(HTMLDivElement | null)[]>([])

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

  // Reaching the bottom starts the timed sequence:
  // grow + bold for 4s → dissolve into dust → curved flight → resources ignite
  useEffect(() => {
    if (taglineProgress >= 0.95 && !seqFired.current) {
      seqFired.current = true
      setTaglinePhase('growing')
      seqTimers.current.push(window.setTimeout(startDissolve, 4000))
    }
    // Scrolling back up resets the sequence so it can replay
    if (taglineProgress < 0.3 && seqFired.current) {
      seqFired.current = false
      seqTimers.current.forEach(clearTimeout)
      seqTimers.current = []
      if (rafId.current !== null) cancelAnimationFrame(rafId.current)
      rafId.current = null
      setDust([])
      setTaglinePhase('idle')
      setResourcesIgnite(false)
      setResourcesBold(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taglineProgress])

  function startDissolve() {
    setTaglinePhase('dissolving')
    const t = taglineRef.current?.getBoundingClientRect()
    const b = resourcesBtnRef.current?.getBoundingClientRect()
    if (!t || !b) return
    const rand = mulberry32(Date.now())
    const particles: Dust[] = Array.from({ length: 320 }, (_, i) => {
      const x0 = t.left + rand() * t.width
      const y0 = t.top + rand() * t.height
      const x1 = b.left + rand() * b.width
      const y1 = b.top + rand() * b.height
      // Cubic bezier: endpoints pinned to text/button so arrival is guaranteed;
      // control points swing perpendicular to the straight line for varied curves
      const dx = x1 - x0
      const dy = y1 - y0
      const len = Math.hypot(dx, dy) || 1
      const px = -dy / len
      const py = dx / len
      const a1 = (rand() - 0.5) * len * 0.8
      const a2 = (rand() - 0.5) * len * 0.5
      return {
        id: i,
        size: 1.5 + rand() * 2.5,
        delay: rand() * 700,
        duration: 1100 + rand() * 1100,
        x0,
        y0,
        cx1: x0 + dx * 0.33 + px * a1,
        cy1: y0 + dy * 0.33 + py * a1,
        cx2: x0 + dx * 0.66 + px * a2,
        cy2: y0 + dy * 0.66 + py * a2,
        x1,
        y1,
      }
    })
    setDust(particles)
    animateDust(particles)
    seqTimers.current.push(
      window.setTimeout(() => {
        setResourcesIgnite(true)
        setResourcesBold(true)
      }, 1200)
    )
    seqTimers.current.push(window.setTimeout(() => setResourcesIgnite(false), 3900))
    seqTimers.current.push(window.setTimeout(() => setDust([]), 3100))
  }

  function animateDust(particles: Dust[]) {
    const t0 = performance.now()
    const step = () => {
      const now = performance.now() - t0
      let alive = false
      particles.forEach((p, i) => {
        const el = particleEls.current[i]
        if (!el) return
        const raw = (now - p.delay) / p.duration
        if (raw < 1) alive = true
        const tt = Math.min(1, Math.max(0, raw))
        const e = tt < 0.5 ? 4 * tt * tt * tt : 1 - Math.pow(-2 * tt + 2, 3) / 2
        const u = 1 - e
        const x = u * u * u * p.x0 + 3 * u * u * e * p.cx1 + 3 * u * e * e * p.cx2 + e * e * e * p.x1
        const y = u * u * u * p.y0 + 3 * u * u * e * p.cy1 + 3 * u * e * e * p.cy2 + e * e * e * p.y1
        el.style.transform = `translate(${x}px, ${y}px)`
        el.style.opacity = String(
          tt <= 0 ? 0 : tt < 0.12 ? (tt / 0.12) * 0.9 : tt > 0.72 ? Math.max(0, 0.9 * (1 - (tt - 0.72) / 0.28)) : 0.9
        )
      })
      rafId.current = alive ? requestAnimationFrame(step) : null
    }
    rafId.current = requestAnimationFrame(step)
  }

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
      {dust.map((p, i) => (
        <div
          key={p.id}
          ref={(el) => { particleEls.current[i] = el }}
          className="fixed z-[60] rounded-full pointer-events-none"
          style={{
            width: p.size,
            height: p.size,
            left: 0,
            top: 0,
            background: 'var(--cream)',
            transform: `translate(${p.x0}px, ${p.y0}px)`,
            opacity: 0,
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
              boxShadow: resourcesBold
                ? '0 0 22px rgba(240,236,228,0.35), 0 0 70px rgba(240,236,228,0.15)'
                : 'none',
              animation: resourcesIgnite ? 'resourceIgnite 2.7s ease-in-out' : 'none',
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
              fontWeight: taglinePhase === 'idle' ? 200 : 800,
              transform: taglinePhase === 'idle' ? 'scale(1)' : 'scale(1.5)',
              transformOrigin: 'center',
              letterSpacing: taglinePhase === 'dissolving' ? '0.4em' : '0.25em',
              textTransform: 'uppercase',
              color: taglinePhase === 'idle' ? 'var(--cream-dim)' : 'var(--cream-bright)',
              opacity: taglinePhase === 'dissolving' ? 0 : 1,
              filter: taglinePhase === 'dissolving' ? 'blur(8px)' : 'blur(0px)',
              transition:
                'font-weight 4s ease-in-out, transform 4s ease-in-out, color 4s ease-in-out, opacity 1s ease, filter 1s ease, letter-spacing 1s ease',
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
        @keyframes resourceIgnite {
          0% { box-shadow: 0 0 0 0 rgba(240,236,228,0); transform: scale(1); }
          22% { box-shadow: 0 0 42px 14px rgba(240,236,228,0.55), 0 0 100px 38px rgba(240,236,228,0.22); transform: scale(1.08); }
          42% { box-shadow: 0 0 20px 5px rgba(240,236,228,0.3), 0 0 60px 18px rgba(240,236,228,0.1); transform: scale(1.01); }
          62% { box-shadow: 0 0 36px 11px rgba(240,236,228,0.48), 0 0 90px 30px rgba(240,236,228,0.18); transform: scale(1.05); }
          100% { box-shadow: 0 0 22px 4px rgba(240,236,228,0.35), 0 0 70px 18px rgba(240,236,228,0.15); transform: scale(1); }
        }
      `}</style>
    </main>
  )
}
