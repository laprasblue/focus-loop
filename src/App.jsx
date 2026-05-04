import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'

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
]

function pad(n) {
  return String(n).padStart(2, '0')
}

function toSeconds(minutes, seconds) {
  return Math.max(1, Number(minutes) * 60 + Number(seconds))
}

function ThemePicker({ theme, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

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
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="3" fill="currentColor"/>
          <circle cx="8" cy="2" r="1.5" fill="currentColor"/>
          <circle cx="8" cy="14" r="1.5" fill="currentColor"/>
          <circle cx="2" cy="8" r="1.5" fill="currentColor"/>
          <circle cx="14" cy="8" r="1.5" fill="currentColor"/>
          <circle cx="3.76" cy="3.76" r="1.5" fill="currentColor"/>
          <circle cx="12.24" cy="12.24" r="1.5" fill="currentColor"/>
          <circle cx="12.24" cy="3.76" r="1.5" fill="currentColor"/>
          <circle cx="3.76" cy="12.24" r="1.5" fill="currentColor"/>
        </svg>
        Theme
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
    stateRef.current = { phase, currentLoop, config, running, done }
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('fl-theme', theme)
  }, [theme])

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
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

  const notify = useCallback((title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, silent: true })
    }
  }, [])

  const tick = useCallback(() => {
    setTimeLeft(prev => {
      if (prev === null || prev > 1) return prev === null ? null : prev - 1

      const { phase: p, currentLoop: loop, config: cfg } = stateRef.current
      if (!cfg) return 0

      if (p === 'focus') {
        playBeep(660, 0.35, 2)
        notify('Relax time!', `Take a ${cfg.relaxMinutes}m${cfg.relaxSeconds > 0 ? ` ${cfg.relaxSeconds}s` : ''} break`)
        setPhase('relax')
        return toSeconds(cfg.relaxMinutes, cfg.relaxSeconds)
      } else {
        const nextLoop = loop + 1
        const maxLoops = cfg.loops
        if (!cfg.infiniteLoop && nextLoop > maxLoops) {
          playBeep(440, 0.5, 3)
          notify('Session complete!', `Finished ${maxLoops} loop${maxLoops > 1 ? 's' : ''}`)
          setRunning(false)
          setDone(true)
          return 0
        }
        playBeep(880, 0.25, 1)
        notify('Focus time!', `Loop ${nextLoop}${cfg.infiniteLoop ? '' : `/${maxLoops}`}`)
        setPhase('focus')
        setCurrentLoop(nextLoop)
        return toSeconds(cfg.focusMinutes, cfg.focusSeconds)
      }
    })
  }, [playBeep, notify])

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(tick, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running, tick])

  function applyAndStart() {
    const fd = toSeconds(draft.focusMinutes, draft.focusSeconds)
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
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
  const loopLabel = config
    ? (config.infiniteLoop ? '∞' : config.loops)
    : (draft.infiniteLoop ? '∞' : draft.loops)

  const circumference = 2 * Math.PI * 54

  return (
    <div className={`app ${config ? phase : 'idle'}`}>
      <header>
        <h1>Focus Loop</h1>
        <div className="header-actions">
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
            <label>Focus time</label>
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
            <label>Relax time</label>
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
          <button className="btn primary full" onClick={applyAndStart}>Start</button>
        </section>
      )}

      {config && (
        <section className="timer-section">
          <div className="phase-badge">{done ? 'Done!' : phase === 'focus' ? 'Focus' : 'Relax'}</div>
          <div className="loop-counter">Loop {currentLoop} / {loopLabel}</div>

          <div className="ring-wrapper">
            <svg className="ring" viewBox="0 0 120 120">
              <circle className="ring-bg" cx="60" cy="60" r="54" />
              <circle className="ring-fill" cx="60" cy="60" r="54"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress / 100)} />
            </svg>
            <div className="time-display">{pad(minutes)}:{pad(seconds)}</div>
          </div>

          <div className="controls">
            {done ? (
              <>
                <button className="btn primary large" onClick={restartWithSameConfig}>Restart</button>
                <button className="btn ghost" onClick={handleReset}>New session</button>
              </>
            ) : (
              <>
                <button className="btn primary large" onClick={handlePause}>
                  {running ? 'Pause' : 'Resume'}
                </button>
                <button className="btn ghost" onClick={handleReset}>Reset</button>
              </>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
