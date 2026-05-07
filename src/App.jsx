import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react'
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification'
import './App.css'

const IS_TAURI = '__TAURI_INTERNALS__' in window

const CONFETTI_COLORS = [
  '#f472b6', '#fb7185', '#fda4af', '#f9a8d4',
  '#e879f9', '#c084fc', '#ffffff', '#fbbf24', '#f0abfc',
]

function Confetti() {
  const pieces = useMemo(() =>
    Array.from({ length: 70 }, (_, i) => ({
      id: i,
      x: 10 + Math.random() * 80,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 5 + Math.random() * 8,
      duration: 2.5 + Math.random() * 2,
      delay: Math.random() * 0.8,
      drift: (Math.random() - 0.5) * 220,
      rot: Math.random() * 360,
      circle: Math.random() > 0.6,
    }))
  , [])

  return (
    <div className="confetti-container">
      {pieces.map(p => (
        <div
          key={p.id}
          className={`confetti-piece${p.circle ? ' circle' : ''}`}
          style={{
            left: `${p.x}%`,
            width: `${p.size}px`,
            height: p.circle ? `${p.size}px` : `${p.size * 0.55}px`,
            background: p.color,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            '--drift': `${p.drift}px`,
            '--rot': `${p.rot}deg`,
          }}
        />
      ))}
    </div>
  )
}

const DEFAULT_DRAFT = {
  focusMinutes: 25,
  focusSeconds: 0,
  relaxMinutes: 5,
  relaxSeconds: 0,
  loops: 4,
  infiniteLoop: false,
}

const THEMES = [
  { id: 'dark',   label: 'Dark',   swatch: '#1a1d2e' },
  { id: 'light',  label: 'Light',  swatch: '#f0f2ff' },
  { id: 'forest', label: 'Forest', swatch: '#0d1f18' },
  { id: 'sunset', label: 'Sunset', swatch: '#1e0f1a' },
  { id: 'thao',   label: 'Thảo ♡', swatch: '#f472b6' },
]

function pad(n) {
  return String(n).padStart(2, '0')
}

function toSeconds(minutes, seconds) {
  return Math.max(1, Number(minutes) * 60 + Number(seconds))
}

function StageLives({ current, total, infinite }) {
  if (infinite) {
    return (
      <div className="stage-lives">
        <span className="stage-label">STAGE</span>
        <span className="life active">▶</span>
        <span className="life-inf">∞</span>
      </div>
    )
  }
  const cap = Math.min(total, 8)
  return (
    <div className="stage-lives">
      <span className="stage-label">STAGE</span>
      {Array.from({ length: cap }, (_, i) => (
        <span
          key={i}
          className={`life ${i < current - 1 ? 'done' : i === current - 1 ? 'active' : 'empty'}`}
        >
          {i < current - 1 ? '■' : i === current - 1 ? '▶' : '□'}
        </span>
      ))}
      {total > cap && <span className="life-overflow">+{total - cap}</span>}
    </div>
  )
}

function FloatingHearts() {
  const [hearts, setHearts] = useState([])

  useEffect(() => {
    const spawn = () => {
      const id = Date.now() + Math.random()
      const duration = 4 + Math.random() * 3
      const heart = {
        id,
        x: 5 + Math.random() * 90,
        size: 10 + Math.random() * 18,
        duration,
        wobble: (Math.random() - 0.5) * 60,
        char: Math.random() > 0.4 ? '♡' : '♥',
      }
      setHearts(h => [...h, heart])
      setTimeout(() => setHearts(h => h.filter(x => x.id !== id)), (duration + 0.3) * 1000)
    }

    spawn()
    const interval = setInterval(spawn, 700)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="hearts-container">
      {hearts.map(h => (
        <span
          key={h.id}
          className="heart"
          style={{
            left: `${h.x}%`,
            fontSize: `${h.size}px`,
            animationDuration: `${h.duration}s`,
            '--wobble': `${h.wobble}px`,
          }}
        >
          {h.char}
        </span>
      ))}
    </div>
  )
}

function ThemePicker({ theme, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const activeTheme = THEMES.find(t => t.id === theme)

  useEffect(() => {
    function onDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  return (
    <div className="theme-picker" ref={ref}>
      <button
        className="btn ghost small theme-toggle"
        onClick={() => setOpen(o => !o)}
        title="Switch theme"
      >
        <span className="theme-swatch" style={{ background: activeTheme?.swatch }} />
        {activeTheme?.label ?? 'Theme'}
      </button>
      {open && (
        <div className="theme-dropdown">
          {THEMES.map(t => (
            <button
              key={t.id}
              className={`theme-option${theme === t.id ? ' active' : ''}`}
              onClick={() => { onChange(t.id); setOpen(false) }}
            >
              <span className="theme-swatch" style={{ background: t.swatch }} />
              {t.label}
              {theme === t.id && (
                <svg className="theme-check" width="12" height="12" viewBox="0 0 12 12">
                  <polyline points="2,6 5,9 10,3" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('fl-theme') || 'dark')
  const [styleMode, setStyleMode] = useState(() => localStorage.getItem('fl-style') || '8bit')
  const [draft, setDraft] = useState(DEFAULT_DRAFT)
  const [config, setConfig] = useState(null)
  const [showConfig, setShowConfig] = useState(true)

  const [phase, setPhase] = useState('focus')
  const [currentLoop, setCurrentLoop] = useState(1)
  const [timeLeft, setTimeLeft] = useState(null)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)

  const intervalRef = useRef(null)
  const audioCtxRef = useRef(null)
  const stateRef = useRef({})

  useEffect(() => {
    stateRef.current = { phase, currentLoop, config, running, done, theme }
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('fl-theme', theme)
  }, [theme])

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-style', styleMode)
    localStorage.setItem('fl-style', styleMode)
  }, [styleMode])

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext()
    }
    return audioCtxRef.current
  }, [])

  const playBeep = useCallback((frequency, duration, count) => {
    try {
      const ctx = getAudioCtx()
      for (let i = 0; i < count; i++) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = frequency
        osc.type = 'sine'
        const start = ctx.currentTime + i * (duration + 0.15)
        gain.gain.setValueAtTime(0.35, start)
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
        osc.start(start)
        osc.stop(start + duration + 0.01)
      }
    } catch (_) {}
  }, [getAudioCtx])

  const notify = useCallback(async (title, body) => {
    if (IS_TAURI) {
      if (await isPermissionGranted()) sendNotification({ title, body })
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, silent: true })
    }
  }, [])

  const tick = useCallback(() => {
    let pendingNotify = null

    setTimeLeft(prev => {
      if (prev === null || prev > 1) return prev === null ? null : prev - 1
      if (prev <= 0) return 0

      const { phase: p, currentLoop: loop, config: cfg, theme: t } = stateRef.current
      if (!cfg) return 0
      const isThao = t === 'thao'

      if (p === 'focus') {
        playBeep(660, 0.35, 2)
        pendingNotify = {
          title: isThao ? 'Nghỉ ngơi nha bé~ ♡' : 'Relax time!',
          body:  isThao ? 'Bé Thảo xứng đáng được nghỉ lắm rồi ♡' : `Take a ${cfg.relaxMinutes}m${cfg.relaxSeconds > 0 ? ` ${cfg.relaxSeconds}s` : ''} break`,
        }
        setPhase('relax')
        return toSeconds(cfg.relaxMinutes, cfg.relaxSeconds)
      } else {
        const nextLoop = loop + 1
        const maxLoops = cfg.loops
        if (!cfg.infiniteLoop && nextLoop > maxLoops) {
          playBeep(440, 0.5, 3)
          pendingNotify = {
            title: isThao ? '★ Xong rồi! Giỏi lắm bé Thảo! ♡' : 'Session complete!',
            body:  isThao ? `${maxLoops} loop xong rồi, bé Thảo thật tuyệt vời! ♡` : `Finished ${maxLoops} loop${maxLoops > 1 ? 's' : ''}`,
          }
          setRunning(false)
          setDone(true)
          return 0
        }
        playBeep(880, 0.25, 1)
        pendingNotify = {
          title: isThao ? 'Cố lên nào Thảo! ♡' : 'Focus time!',
          body:  isThao ? `Loop ${nextLoop} — bé làm được mà! ♡` : `Loop ${nextLoop}${cfg.infiniteLoop ? '' : `/${maxLoops}`}`,
        }
        setPhase('focus')
        setCurrentLoop(nextLoop)
        return toSeconds(cfg.focusMinutes, cfg.focusSeconds)
      }
    })

    if (pendingNotify) notify(pendingNotify.title, pendingNotify.body)
  }, [playBeep, notify])

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(tick, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running, tick])

  async function applyAndStart() {
    const fd = toSeconds(draft.focusMinutes, draft.focusSeconds)
    if (IS_TAURI) {
      if (!(await isPermissionGranted())) await requestPermission()
    } else if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
    setConfig({ ...draft })
    setPhase('focus')
    setCurrentLoop(1)
    setTimeLeft(fd)
    setDone(false)
    setRunning(true)
    setShowConfig(false)
  }

  function handlePause() { setRunning(r => !r) }

  function handleReset() {
    setRunning(false)
    clearInterval(intervalRef.current)
    setConfig(null)
    setPhase('focus')
    setCurrentLoop(1)
    setTimeLeft(null)
    setDone(false)
    setShowConfig(true)
  }

  function restartWithSameConfig() {
    if (!config) return
    setPhase('focus')
    setCurrentLoop(1)
    setTimeLeft(toSeconds(config.focusMinutes, config.focusSeconds))
    setDone(false)
    setRunning(true)
  }

  function updateDraft(key, value) {
    setDraft(d => ({ ...d, [key]: value }))
  }

  const focusDuration = config
    ? toSeconds(config.focusMinutes, config.focusSeconds)
    : toSeconds(draft.focusMinutes, draft.focusSeconds)
  const relaxDuration = config
    ? toSeconds(config.relaxMinutes, config.relaxSeconds)
    : toSeconds(draft.relaxMinutes, draft.relaxSeconds)
  const totalForPhase = phase === 'focus' ? focusDuration : relaxDuration
  const progress = timeLeft !== null && totalForPhase > 0
    ? ((totalForPhase - timeLeft) / totalForPhase) * 100
    : 0

  const minutes = timeLeft !== null ? Math.floor(timeLeft / 60) : 0
  const seconds = timeLeft !== null ? timeLeft % 60 : 0
  const circumference = 2 * Math.PI * 54

  const timerClass = [
    'timer-section',
    running ? 'is-running' : '',
    done ? 'is-done' : '',
  ].filter(Boolean).join(' ')

  const phaseLabel = done ? '★ CLEAR!' : phase === 'focus' ? '▶ FOCUS' : '■ RELAX'

  return (
    <div className={`app ${config ? phase : 'idle'}`}>
      {theme === 'thao' && <FloatingHearts />}
      {theme === 'thao' && done && <Confetti />}
      <header>
        <div className="header-left">
          <h1>FOCUS LOOP</h1>
          <span className="player-tag">{theme === 'thao' ? 'THẢO ♡' : 'PLAYER 1'}</span>
        </div>
        <div className="header-actions">
          <button
            className="btn ghost small"
            onClick={() => setStyleMode(m => m === '8bit' ? 'normal' : '8bit')}
            title="Toggle 8-bit / Smooth style"
          >
            {styleMode === '8bit' ? '▣ PIXEL' : '● SMOOTH'}
          </button>
          <ThemePicker theme={theme} onChange={setTheme} />
          {config && (
            <button className="btn ghost small" onClick={() => setShowConfig(s => !s)}>
              {showConfig ? 'Hide' : 'Settings'}
            </button>
          )}
        </div>
      </header>

      {showConfig && (
        <section className="config-panel">
          <div className="config-row">
            <label>Focus</label>
            <div className="time-inputs">
              <input type="number" min="0" max="99" value={draft.focusMinutes}
                onChange={e => updateDraft('focusMinutes', e.target.value)} />
              <span className="sep">:</span>
              <input type="number" min="0" max="59" value={draft.focusSeconds}
                onChange={e => updateDraft('focusSeconds', e.target.value)} />
              <span className="unit">mm:ss</span>
            </div>
          </div>
          <div className="config-row">
            <label>Relax</label>
            <div className="time-inputs">
              <input type="number" min="0" max="99" value={draft.relaxMinutes}
                onChange={e => updateDraft('relaxMinutes', e.target.value)} />
              <span className="sep">:</span>
              <input type="number" min="0" max="59" value={draft.relaxSeconds}
                onChange={e => updateDraft('relaxSeconds', e.target.value)} />
              <span className="unit">mm:ss</span>
            </div>
          </div>
          <div className="config-row">
            <label>Loops</label>
            <div className="loop-inputs">
              <input type="number" min="1" max="99" value={draft.loops}
                disabled={draft.infiniteLoop}
                onChange={e => updateDraft('loops', Number(e.target.value))} />
              <label className="checkbox-label">
                <input type="checkbox" checked={draft.infiniteLoop}
                  onChange={e => updateDraft('infiniteLoop', e.target.checked)} />
                <span>Infinite</span>
              </label>
            </div>
          </div>
          <button className="btn primary full" onClick={applyAndStart}>▶ START</button>
        </section>
      )}

      {config && (
        <section className={timerClass}>
          <div className="phase-badge">{phaseLabel}</div>

          <StageLives
            current={currentLoop}
            total={config.loops}
            infinite={config.infiniteLoop}
          />

          <div className="ring-wrapper">
            <svg className="ring" viewBox="0 0 120 120">
              <circle className="ring-bg" cx="60" cy="60" r="54" />
              <circle className="ring-fill" cx="60" cy="60" r="54"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress / 100)} />
            </svg>
            <div className="time-display">
              <span>{pad(minutes)}</span>
              <span className={`colon${running ? ' blink' : ''}`}>:</span>
              <span>{pad(seconds)}</span>
            </div>
          </div>

          <div className="hp-bar-wrap">
            <span className="hp-label">HP</span>
            <div className="hp-track">
              <div
                className="hp-fill"
                style={{ width: `${100 - progress}%` }}
              />
            </div>
            <span className="hp-pct">{Math.round(100 - progress)}%</span>
          </div>

          <div className="controls">
            {done ? (
              <>
                <button className="btn primary large" onClick={restartWithSameConfig}>★ RETRY</button>
                <button className="btn ghost" onClick={handleReset}>↺ NEW</button>
              </>
            ) : (
              <>
                <button className="btn primary large" onClick={handlePause}>
                  {running ? '⏸ PAUSE' : '▶ RESUME'}
                </button>
                <button className="btn ghost" onClick={handleReset}>↺ RESET</button>
              </>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
