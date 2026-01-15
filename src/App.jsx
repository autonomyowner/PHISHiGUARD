import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './App.css'
import * as api from './services/api'

// Custom hook for responsive detection
const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
  })

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return {
    isMobile: windowSize.width < 768,
    isTablet: windowSize.width >= 768 && windowSize.width < 1024,
    isDesktop: windowSize.width >= 1024,
    width: windowSize.width
  }
}

// Matrix Rain Background
const MatrixRain = () => {
  const canvasRef = useRef(null)
  const { isMobile } = useWindowSize()

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const chars = 'PHISHGUARD01アイウエオカキクケコサシスセソ<>{}[]'
    const fontSize = isMobile ? 10 : 14
    const columns = canvas.width / fontSize
    const drops = Array(Math.floor(columns)).fill(1)

    const draw = () => {
      ctx.fillStyle = 'rgba(10, 10, 12, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#00ff8820'
      ctx.font = `${fontSize}px JetBrains Mono`

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)]
        ctx.fillText(text, i * fontSize, drops[i] * fontSize)
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0
        }
        drops[i]++
      }
    }

    const interval = setInterval(draw, 50)
    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    return () => {
      clearInterval(interval)
      window.removeEventListener('resize', handleResize)
    }
  }, [isMobile])

  return <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, zIndex: 0, opacity: 0.6 }} />
}

// Typing Effect
const TypeWriter = ({ text, delay = 50 }) => {
  const [displayText, setDisplayText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex])
        setCurrentIndex(prev => prev + 1)
      }, delay)
      return () => clearTimeout(timeout)
    }
  }, [currentIndex, text, delay])

  return (
    <span>
      {displayText}
      <span className="cursor" />
    </span>
  )
}

// Animated Counter
const AnimatedCounter = ({ value, suffix = '', duration = 2000 }) => {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let start = 0
    const end = value
    const increment = end / (duration / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= end) {
        setCount(end)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [value, duration])

  return <span>{count}{suffix}</span>
}

// Interactive Phishing Demo with Live API
const PhishingDemo = ({ t }) => {
  const [mode, setMode] = useState('demo') // 'demo' or 'custom'
  const [step, setStep] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState(null)
  const [customEmail, setCustomEmail] = useState('')
  const { isMobile } = useWindowSize()

  // Sample emails for demo
  const sampleEmails = {
    phishing: {
      subject: "Urgent: Verify Your Account",
      body: "Dear Customer, Your account has been suspended. Click here immediately to verify your identity.",
      sender: "security@paypa1.com",
      urls: ["http://paypa1.com/verify"]
    },
    legitimate: {
      subject: "Your Order Confirmation",
      body: "Thank you for your purchase. Your order #12345 has been confirmed and will ship within 2-3 business days.",
      sender: "orders@amazon.com",
      urls: ["https://amazon.com/orders"]
    }
  }

  const staticDemo = {
    original: { score: 0.95, status: 'PHISHING' },
    adversarial: {
      text: "Dеar Custоmеr, Your аccount hаs been suspеnded. Cliсk hеre immеdiately to vеrify your idеntity.",
      attacks: ['а→a (Cyrillic)', 'е→e (Cyrillic)', 'о→o (Cyrillic)', 'с→c (Cyrillic)']
    },
    baseline_after: { score: 0.32, status: 'MISSED' },
    hardened: { score: 0.94, status: 'CAUGHT', detected: ['Homoglyph Attack', 'Mixed Scripts', 'Urgency Language'] }
  }

  const runDemo = async () => {
    setIsRunning(true)
    setResults(null)

    // Step through the demo
    for (let i = 0; i <= 3; i++) {
      setStep(i)
      await new Promise(r => setTimeout(r, 1800))
    }

    setResults(staticDemo)
    setIsRunning(false)
  }

  const analyzeCustom = async () => {
    if (!customEmail.trim()) return
    setIsRunning(true)
    setResults(null)

    try {
      const response = await fetch('http://localhost:8000/api/v1/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: "Custom Email",
          body: customEmail,
          sender: "unknown@example.com",
          urls: []
        })
      })

      if (response.ok) {
        const data = await response.json()
        setResults({
          custom: true,
          score: data.score,
          recommendation: data.recommendation,
          confidence: data.confidence,
          vectors: data.attack_vectors_detected,
          explanation: data.explanation
        })
      } else {
        // Fallback to simple analysis
        const hasUrgency = /urgent|immediate|suspended|verify|click here/i.test(customEmail)
        setResults({
          custom: true,
          score: hasUrgency ? 0.75 : 0.25,
          recommendation: hasUrgency ? 'suspicious' : 'safe',
          confidence: 'medium',
          vectors: hasUrgency ? [{ type: 'urgency_language', details: 'Urgency keywords detected' }] : [],
          explanation: hasUrgency ? 'Contains suspicious patterns' : 'No obvious phishing indicators'
        })
      }
    } catch {
      // Offline fallback
      const hasUrgency = /urgent|immediate|suspended|verify|click here/i.test(customEmail)
      setResults({
        custom: true,
        score: hasUrgency ? 0.75 : 0.25,
        recommendation: hasUrgency ? 'suspicious' : 'safe',
        confidence: 'medium',
        vectors: hasUrgency ? [{ type: 'urgency_language', details: 'Urgency keywords detected' }] : [],
        explanation: hasUrgency ? 'Contains suspicious patterns' : 'No obvious phishing indicators'
      })
    }

    setIsRunning(false)
  }

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-subtle)',
      borderRadius: '8px',
      padding: isMobile ? '16px' : '32px'
    }}>
      {/* Mode Toggle */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => { setMode('demo'); setResults(null); setStep(0); }}
          className={mode === 'demo' ? 'btn btn-primary' : 'btn btn-outline'}
          style={{ flex: isMobile ? '1' : 'none' }}
        >
          {t?.demo?.attackDemo || 'Attack Demo'}
        </button>
        <button
          onClick={() => { setMode('custom'); setResults(null); }}
          className={mode === 'custom' ? 'btn btn-primary' : 'btn btn-outline'}
          style={{ flex: isMobile ? '1' : 'none' }}
        >
          {t?.demo?.tryOwn || 'Try Your Own'}
        </button>
      </div>

      {mode === 'demo' ? (
        <>
          {/* Demo Mode */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? '1.1rem' : '1.5rem', margin: 0 }}>
              Adversarial Attack Cycle
            </h3>
            <button
              onClick={runDemo}
              disabled={isRunning}
              className="btn btn-primary"
            >
              {isRunning ? (t?.demo?.running || 'Running...') : (t?.demo?.startDemo || 'Start Demo')}
            </button>
          </div>

          {/* Demo Steps */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
            {[
              { label: '1. Original', desc: 'Phishing Email' },
              { label: '2. Attack', desc: 'Apply Homoglyphs' },
              { label: '3. Baseline', desc: 'Detector Fails' },
              { label: '4. Hardened', desc: 'Attack Caught' }
            ].map((s, i) => (
              <div key={i} style={{
                padding: '12px',
                background: step >= i ? (i === 2 ? 'rgba(255,71,87,0.1)' : 'rgba(0,212,255,0.1)') : 'var(--bg-tertiary)',
                border: `1px solid ${step >= i ? (i === 2 ? 'var(--accent-red)' : 'var(--accent-blue)') : 'var(--border-subtle)'}`,
                borderRadius: '6px',
                textAlign: 'center',
                transition: 'all 0.3s'
              }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: step >= i ? 'var(--text-primary)' : 'var(--text-muted)' }}>{s.label}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{s.desc}</div>
              </div>
            ))}
          </div>

          {/* Results Display */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
            {/* Email Panel */}
            <div className="terminal-box">
              <div className="terminal-header">
                <span className="terminal-dot" /><span className="terminal-dot" /><span className="terminal-dot" />
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-muted)' }}>
                  {step >= 1 ? 'adversarial.eml' : 'original.eml'}
                </span>
              </div>
              <div className="terminal-content" style={{ minHeight: '180px', fontSize: '13px' }}>
                <div style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>From: security@paypa1.com</div>
                <div style={{ color: 'var(--text-muted)', marginBottom: '12px' }}>Subject: Urgent: Verify Your Account</div>
                <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {step >= 1 ? (
                    <>
                      D<span style={{color:'var(--accent-red)'}}>е</span>ar Cust<span style={{color:'var(--accent-red)'}}>о</span>m<span style={{color:'var(--accent-red)'}}>е</span>r,<br/><br/>
                      Your <span style={{color:'var(--accent-red)'}}>а</span>ccount h<span style={{color:'var(--accent-red)'}}>а</span>s been susp<span style={{color:'var(--accent-red)'}}>е</span>nded.
                      Cli<span style={{color:'var(--accent-red)'}}>с</span>k h<span style={{color:'var(--accent-red)'}}>е</span>re imm<span style={{color:'var(--accent-red)'}}>е</span>diately.
                    </>
                  ) : (
                    <>Dear Customer,<br/><br/>Your account has been suspended. Click here immediately to verify your identity.</>
                  )}
                </div>
                {step >= 1 && (
                  <div style={{ marginTop: '12px', padding: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', fontSize: '10px' }}>
                    <span style={{ color: 'var(--accent-red)' }}>HOMOGLYPHS:</span> {staticDemo.adversarial.attacks.join(', ')}
                  </div>
                )}
              </div>
            </div>

            {/* Results Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Baseline */}
              <motion.div
                className="terminal-box"
                animate={{
                  borderColor: step === 2 ? 'var(--accent-red)' : step >= 1 ? 'var(--accent-green)' : 'var(--border-subtle)',
                  boxShadow: step === 2 ? '0 0 15px rgba(255,71,87,0.3)' : 'none'
                }}
              >
                <div className="terminal-header">
                  <span className="terminal-dot" /><span className="terminal-dot" /><span className="terminal-dot" />
                  <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-muted)' }}>baseline_detector.py</span>
                </div>
                <div className="terminal-content">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px' }}>Baseline Detector</span>
                    <span style={{
                      color: step === 2 ? 'var(--accent-red)' : 'var(--accent-green)',
                      fontWeight: 600
                    }}>
                      {step === 0 ? '---' : step === 2 ? 'EVADED' : 'DETECTED'}
                    </span>
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                      <motion.div
                        animate={{ width: step === 0 ? '0%' : step === 2 ? '32%' : '95%' }}
                        transition={{ duration: 0.6 }}
                        style={{ height: '100%', background: step === 2 ? 'var(--accent-red)' : 'var(--accent-green)', borderRadius: '4px' }}
                      />
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '11px', marginTop: '4px', color: 'var(--text-muted)' }}>
                      {step === 0 ? '---' : step === 2 ? '0.32' : '0.95'}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Hardened */}
              <motion.div
                className="terminal-box"
                animate={{
                  borderColor: step === 3 ? 'var(--accent-blue)' : 'var(--border-subtle)',
                  boxShadow: step === 3 ? '0 0 15px rgba(0,212,255,0.3)' : 'none'
                }}
              >
                <div className="terminal-header">
                  <span className="terminal-dot" /><span className="terminal-dot" /><span className="terminal-dot" />
                  <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-muted)' }}>hardened_detector.py</span>
                </div>
                <div className="terminal-content">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px' }}>Hardened Detector</span>
                    <span style={{ color: step === 3 ? 'var(--accent-blue)' : 'var(--text-muted)', fontWeight: 600 }}>
                      {step === 3 ? 'CAUGHT' : 'STANDBY'}
                    </span>
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                      <motion.div
                        animate={{ width: step === 3 ? '94%' : '0%' }}
                        transition={{ duration: 0.6 }}
                        style={{ height: '100%', background: 'var(--accent-blue)', borderRadius: '4px' }}
                      />
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '11px', marginTop: '4px', color: 'var(--text-muted)' }}>
                      {step === 3 ? '0.94' : '---'}
                    </div>
                  </div>
                  {step === 3 && (
                    <div style={{ marginTop: '8px', fontSize: '10px', color: 'var(--accent-blue)' }}>
                      Detected: {staticDemo.hardened.detected.join(' | ')}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Custom Email Mode */}
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? '1.1rem' : '1.5rem', marginBottom: '16px' }}>
            {t?.demo?.analyzeTitle || 'Analyze Your Own Email'}
          </h3>

          <div className="terminal-box" style={{ marginBottom: '16px' }}>
            <div className="terminal-header">
              <span className="terminal-dot" /><span className="terminal-dot" /><span className="terminal-dot" />
              <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-muted)' }}>input.txt</span>
            </div>
            <div className="terminal-content">
              <textarea
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                placeholder={t?.demo?.placeholder || "Paste any suspicious email text here to analyze it..."}
                style={{
                  width: '100%',
                  minHeight: '120px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '13px',
                  resize: 'vertical',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <button
            onClick={analyzeCustom}
            disabled={isRunning || !customEmail.trim()}
            className="btn btn-primary"
            style={{ marginBottom: '16px' }}
          >
            {isRunning ? (t?.demo?.analyzing || 'Analyzing...') : (t?.demo?.analyze || 'Analyze Email')}
          </button>

          {/* Custom Results */}
          {results?.custom && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="terminal-box"
              style={{
                borderColor: results.score > 0.6 ? 'var(--accent-red)' : results.score > 0.4 ? 'var(--accent-yellow, #ffa502)' : 'var(--accent-green)'
              }}
            >
              <div className="terminal-header">
                <span className="terminal-dot" /><span className="terminal-dot" /><span className="terminal-dot" />
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-muted)' }}>analysis_result.json</span>
              </div>
              <div className="terminal-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 700 }}>
                    {results.recommendation.toUpperCase()}
                  </span>
                  <span style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: results.score > 0.6 ? 'var(--accent-red)' : results.score > 0.4 ? 'var(--accent-yellow, #ffa502)' : 'var(--accent-green)'
                  }}>
                    {(results.score * 100).toFixed(0)}%
                  </span>
                </div>
                <div style={{ height: '10px', background: 'var(--bg-tertiary)', borderRadius: '5px', overflow: 'hidden', marginBottom: '12px' }}>
                  <div style={{
                    width: `${results.score * 100}%`,
                    height: '100%',
                    background: results.score > 0.6 ? 'var(--accent-red)' : results.score > 0.4 ? 'var(--accent-yellow, #ffa502)' : 'var(--accent-green)',
                    borderRadius: '5px',
                    transition: 'width 0.5s'
                  }} />
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  {results.explanation}
                </p>
                {results.vectors?.length > 0 && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Detected: {results.vectors.map(v => v.type.replace(/_/g, ' ')).join(', ')}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  )
}

// Feature Card
const FeatureCard = ({ title, description, tag, tagColor, items, delay, isMobile }) => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, delay }}
    style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-subtle)',
      borderRadius: '8px',
      padding: isMobile ? '20px' : '32px',
      position: 'relative',
      overflow: 'hidden'
    }}
  >
    <div style={{
      position: 'absolute',
      top: 0,
      right: 0,
      padding: isMobile ? '6px 12px' : '8px 16px',
      background: tagColor,
      color: 'var(--bg-primary)',
      fontSize: isMobile ? '9px' : '11px',
      fontWeight: 600,
      letterSpacing: '1px',
      textTransform: 'uppercase'
    }}>
      {tag}
    </div>
    <h3 style={{
      fontFamily: 'var(--font-display)',
      fontSize: isMobile ? '1.2rem' : '1.5rem',
      marginBottom: '12px',
      marginTop: '8px'
    }}>
      {title}
    </h3>
    <p style={{
      color: 'var(--text-secondary)',
      fontSize: isMobile ? '12px' : '14px',
      marginBottom: '16px',
      lineHeight: '1.7'
    }}>
      {description}
    </p>
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {items.map((item, i) => (
        <li key={i} style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          marginBottom: '10px',
          fontSize: isMobile ? '11px' : '13px',
          color: 'var(--text-secondary)'
        }}>
          <span style={{ color: tagColor, fontWeight: 600 }}>&gt;</span>
          {item}
        </li>
      ))}
    </ul>
  </motion.div>
)

// Metrics Display
const MetricsDisplay = ({ t }) => {
  const { isMobile, isTablet } = useWindowSize()
  const metrics = [
    { label: t?.metrics?.latency || 'Detection Latency', value: '<500', suffix: 'ms' },
    { label: t?.metrics?.baseline || 'Baseline Accuracy', value: 90, suffix: '%' },
    { label: t?.metrics?.adversarial || 'Adversarial Catch', value: 75, suffix: '%' },
    { label: t?.metrics?.evasion || 'Evasion Success', value: 50, suffix: '%+' }
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
      gap: isMobile ? '12px' : '24px'
    }}>
      {metrics.map((metric, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: i * 0.1 }}
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: isMobile ? '16px' : '24px',
            textAlign: 'center'
          }}
        >
          <div style={{
            fontSize: isMobile ? '1.5rem' : '2.5rem',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            marginBottom: '6px'
          }}>
            {metric.value === '<500' ? metric.value : <AnimatedCounter value={metric.value} suffix={metric.suffix} />}
            {metric.value === '<500' && <span style={{ fontSize: isMobile ? '0.7rem' : '1rem' }}>{metric.suffix}</span>}
          </div>
          <div style={{
            color: 'var(--text-muted)',
            fontSize: isMobile ? '9px' : '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {metric.label}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// Architecture Diagram - Mobile Version
const MobileArchitectureDiagram = () => (
  <motion.div
    initial={{ opacity: 0 }}
    whileInView={{ opacity: 1 }}
    viewport={{ once: true }}
    transition={{ duration: 0.8 }}
    className="terminal-box"
  >
    <div className="terminal-header">
      <span className="terminal-dot" />
      <span className="terminal-dot" />
      <span className="terminal-dot" />
      <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-muted)' }}>arch.txt</span>
    </div>
    <div className="terminal-content" style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
      <div style={{ marginBottom: '12px', textAlign: 'center', fontWeight: 600 }}>PHISHGUARD</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ padding: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', textAlign: 'center' }}>
          API Layer (FastAPI)
        </div>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>|</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
          <div style={{ padding: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', textAlign: 'center', fontSize: '9px' }}>
            Feature<br/>Extract
          </div>
          <div style={{ padding: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', textAlign: 'center', fontSize: '9px' }}>
            Red<br/>Team
          </div>
          <div style={{ padding: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', textAlign: 'center', fontSize: '9px' }}>
            Blue<br/>Team
          </div>
        </div>
      </div>
    </div>
  </motion.div>
)

// Architecture Diagram - Desktop Version
const ArchitectureDiagram = () => {
  const { isMobile } = useWindowSize()

  if (isMobile) return <MobileArchitectureDiagram />

  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="terminal-box"
      style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', lineHeight: '1.4' }}
    >
      <div className="terminal-header">
        <span className="terminal-dot" />
        <span className="terminal-dot" />
        <span className="terminal-dot" />
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)' }}>architecture.txt</span>
      </div>
      <div className="terminal-content" style={{ color: 'var(--text-secondary)', overflow: 'auto' }}>
        <pre style={{ margin: 0 }}>{`
┌─────────────────────────────────────────────────────────────┐
│                        PHISHGUARD                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                 API LAYER (FastAPI)                  │    │
│  │  /detect  /generate-adversarial  /batch  /health    │    │
│  └─────────────────────────────────────────────────────┘    │
│                             │                                │
│             ┌───────────────┼───────────────┐                │
│             ▼               ▼               ▼                │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐    │
│  │   FEATURE     │  │   RED TEAM    │  │   BLUE TEAM   │    │
│  │  EXTRACTION   │  │   GENERATOR   │  │   DETECTOR    │    │
│  │               │  │               │  │               │    │
│  │  Text Parser  │  │  Homoglyphs   │  │  NLP Model    │    │
│  │  URL Analyzer │  │  Paraphrase   │  │  URL Model    │    │
│  │  Image Proc   │  │  Visual Mod   │  │  Visual Model │    │
│  │  Header Parse │  │  Orchestrator │  │  Ensemble     │    │
│  └───────────────┘  └───────────────┘  └───────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
      `.trim()}</pre>
      </div>
    </motion.div>
  )
}

// Mobile Menu
const MobileMenu = ({ isOpen, onClose, t, lang, setLang }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        style={{
          position: 'fixed',
          top: '60px',
          left: 0,
          right: 0,
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '16px',
          zIndex: 99,
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        <a href="#how-it-works" onClick={onClose} style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px', padding: '8px 0' }}>{t.nav.howItWorks}</a>
        <a href="#features" onClick={onClose} style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px', padding: '8px 0' }}>{t.nav.features}</a>
        <a href="#demo" onClick={onClose} style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px', padding: '8px 0' }}>{t.nav.demo}</a>
        <a href="#architecture" onClick={onClose} style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px', padding: '8px 0' }}>{t.nav.architecture}</a>
        <button
          onClick={() => { setLang(lang === 'en' ? 'ar' : 'en'); onClose(); }}
          className="btn btn-primary"
          style={{ padding: '10px 20px', marginTop: '8px' }}
        >
          {lang === 'en' ? 'عربي' : 'English'}
        </button>
        <button className="btn btn-outline" style={{ padding: '10px 20px' }}>GitHub</button>
      </motion.div>
    )}
  </AnimatePresence>
)

// Translations
const translations = {
  en: {
    nav: {
      howItWorks: 'How It Works',
      features: 'Features',
      demo: 'Demo',
      architecture: 'Architecture'
    },
    hero: {
      badge: 'CyberRally Hackathon 2026',
      subtitle: 'Adversarial Phishing Detection System',
      cta1: 'View Demo',
      cta2: 'Documentation',
      scroll: 'SCROLL TO EXPLORE'
    },
    howItWorks: {
      title: 'How It Works',
      subtitle: 'AI-powered phishing detection that catches what others miss',
      step1Title: 'Attackers Send Phishing Emails',
      step1Desc: 'Hackers craft fake emails that look like they\'re from banks, companies, or friends. These emails trick people into clicking malicious links or sharing passwords.',
      step2Title: 'AI Detectors Catch Most Attacks',
      step2Desc: 'Machine learning models analyze email text, URLs, and sender info to flag suspicious messages. These AI systems work well against basic phishing attempts.',
      step3Title: 'Smart Attackers Use Tricks to Fool AI',
      step3Desc: 'Clever hackers use "adversarial attacks" - sneaky techniques specifically designed to fool AI models:',
      step3Homoglyphs: 'Replace "a" with Cyrillic "а" - looks identical but fools AI',
      step3Invisible: 'Insert zero-width characters humans can\'t see',
      step3Rewording: 'Paraphrase text to avoid known phishing patterns',
      step4Title: 'Our AI Catches Them Anyway',
      step4Desc: 'PhishGuard uses advanced AI models (DistilBERT, CLIP) trained to recognize evasion tricks. We use a Red Team / Blue Team approach:',
      redTeam: 'Red Team (Attack)',
      redTeamDesc: 'AI generates adversarial phishing emails to find model weaknesses',
      blueTeam: 'Blue Team (Defend)',
      blueTeamDesc: 'Retrains AI to catch evasive attacks',
      aiStack: 'AI Stack:',
      aiStackDesc: 'DistilBERT (text analysis) + CLIP (image detection) + Ensemble ML (final decision)',
      insight: '"To build a smarter AI, you must first teach it how attacks evolve."',
      insightDesc: 'By simulating adversarial attacks, we train our AI to catch what standard models miss.'
    },
    features: {
      title: 'Three-Module Architecture',
      subtitle: 'Offensive and defensive capabilities demonstrating comprehensive adversarial ML understanding',
      feature1Title: 'Feature Extraction',
      feature1Desc: 'Multi-modal feature extraction from email content including text, URLs, images, and headers.',
      feature1Items: ['Semantic embeddings (DistilBERT)', 'URL entropy & domain analysis', 'Logo similarity detection (CLIP)', 'SPF/DKIM/DMARC parsing'],
      feature2Title: 'Red Team Generator',
      feature2Desc: 'Automated adversarial email generation that transforms detectable phishing into evasive variants.',
      feature2Items: ['Homoglyph substitution attacks', 'Synonym & paraphrase generation', 'Zero-width character injection', 'Visual perturbation techniques'],
      feature3Title: 'Blue Team Detector',
      feature3Desc: 'Ensemble detection system with adversarial robustness techniques to catch evasive attacks.',
      feature3Items: ['Weighted ensemble fusion', 'Unicode normalization defense', 'Multi-scale text analysis', 'Disagreement-based flagging']
    },
    metrics: {
      latency: 'Detection Latency',
      baseline: 'Baseline Accuracy',
      adversarial: 'Adversarial Catch',
      evasion: 'Evasion Success'
    },
    demo: {
      title: 'Attack-Defense Cycle',
      subtitle: 'Watch how adversarial attacks evade baseline detection and get caught by hardened defenses',
      attackDemo: 'Attack Demo',
      tryOwn: 'Try Your Own',
      startDemo: 'Start Demo',
      running: 'Running...',
      analyze: 'Analyze Email',
      analyzing: 'Analyzing...',
      analyzeTitle: 'Analyze Your Own Email',
      placeholder: 'Paste any suspicious email text here to analyze it...'
    },
    architecture: {
      title: 'System Architecture',
      subtitle: 'Built with FastAPI, PyTorch, and modern ML infrastructure'
    },
    footer: {
      byline: 'CyberRally Hackathon 2026 | By Zellag',
      contact: 'Contact us:',
      tagline: 'Understanding attacks to build robust defenses'
    }
  },
  ar: {
    nav: {
      howItWorks: 'كيف يعمل',
      features: 'المميزات',
      demo: 'تجربة',
      architecture: 'البنية'
    },
    hero: {
      badge: 'هاكاثون سايبر رالي 2026',
      subtitle: 'نظام كشف التصيد الاحتيالي بالذكاء الاصطناعي',
      cta1: 'شاهد العرض',
      cta2: 'التوثيق',
      scroll: 'اسحب للاستكشاف'
    },
    howItWorks: {
      title: 'كيف يعمل',
      subtitle: 'كشف التصيد بالذكاء الاصطناعي الذي يلتقط ما يفوته الآخرون',
      step1Title: 'المهاجمون يرسلون رسائل تصيد',
      step1Desc: 'يصنع القراصنة رسائل مزيفة تبدو وكأنها من البنوك أو الشركات أو الأصدقاء. هذه الرسائل تخدع الناس للنقر على روابط خبيثة أو مشاركة كلمات المرور.',
      step2Title: 'الذكاء الاصطناعي يكشف معظم الهجمات',
      step2Desc: 'نماذج التعلم الآلي تحلل نص البريد والروابط ومعلومات المرسل لتحديد الرسائل المشبوهة. هذه الأنظمة الذكية تعمل جيداً ضد محاولات التصيد الأساسية.',
      step3Title: 'المهاجمون الأذكياء يستخدمون حيل لخداع الذكاء الاصطناعي',
      step3Desc: 'القراصنة الماهرون يستخدمون "هجمات عدائية" - تقنيات خفية مصممة لخداع نماذج الذكاء الاصطناعي:',
      step3Homoglyphs: 'استبدال "a" بحرف سيريلي "а" - يبدو متطابقاً لكنه يخدع الذكاء الاصطناعي',
      step3Invisible: 'إدراج أحرف غير مرئية لا يستطيع البشر رؤيتها',
      step3Rewording: 'إعادة صياغة النص لتجنب أنماط التصيد المعروفة',
      step4Title: 'ذكاؤنا الاصطناعي يكشفهم على أي حال',
      step4Desc: 'PhishGuard يستخدم نماذج ذكاء اصطناعي متقدمة (DistilBERT, CLIP) مدربة على التعرف على حيل التهرب. نستخدم نهج الفريق الأحمر / الفريق الأزرق:',
      redTeam: 'الفريق الأحمر (هجوم)',
      redTeamDesc: 'الذكاء الاصطناعي يولد رسائل تصيد عدائية لإيجاد نقاط ضعف النموذج',
      blueTeam: 'الفريق الأزرق (دفاع)',
      blueTeamDesc: 'يعيد تدريب الذكاء الاصطناعي لكشف الهجمات المراوغة',
      aiStack: 'حزمة الذكاء الاصطناعي:',
      aiStackDesc: 'DistilBERT (تحليل النص) + CLIP (كشف الصور) + Ensemble ML (القرار النهائي)',
      insight: '"لبناء ذكاء اصطناعي أذكى، يجب أولاً تعليمه كيف تتطور الهجمات."',
      insightDesc: 'من خلال محاكاة الهجمات العدائية، ندرب ذكاءنا الاصطناعي على كشف ما تفوته النماذج القياسية.'
    },
    features: {
      title: 'بنية من ثلاث وحدات',
      subtitle: 'قدرات هجومية ودفاعية تُظهر فهماً شاملاً للتعلم الآلي العدائي',
      feature1Title: 'استخراج الميزات',
      feature1Desc: 'استخراج ميزات متعددة الوسائط من محتوى البريد الإلكتروني بما في ذلك النص والروابط والصور والعناوين.',
      feature1Items: ['التضمينات الدلالية (DistilBERT)', 'تحليل إنتروبيا الروابط والنطاقات', 'كشف تشابه الشعارات (CLIP)', 'تحليل SPF/DKIM/DMARC'],
      feature2Title: 'مولد الفريق الأحمر',
      feature2Desc: 'توليد بريد إلكتروني عدائي آلي يحول التصيد القابل للكشف إلى متغيرات مراوغة.',
      feature2Items: ['هجمات استبدال الحروف المتشابهة', 'توليد المرادفات وإعادة الصياغة', 'حقن الأحرف الغير مرئية', 'تقنيات التشويش البصري'],
      feature3Title: 'كاشف الفريق الأزرق',
      feature3Desc: 'نظام كشف مجمع مع تقنيات مقاومة للهجمات العدائية لكشف الهجمات المراوغة.',
      feature3Items: ['دمج المجموعة الموزونة', 'دفاع تطبيع Unicode', 'تحليل النص متعدد المقاييس', 'تحديد الاختلافات']
    },
    metrics: {
      latency: 'زمن الكشف',
      baseline: 'دقة خط الأساس',
      adversarial: 'كشف الهجمات العدائية',
      evasion: 'نجاح التهرب'
    },
    demo: {
      title: 'دورة الهجوم والدفاع',
      subtitle: 'شاهد كيف تتهرب الهجمات العدائية من الكشف الأساسي ويتم كشفها بالدفاعات المحصنة',
      attackDemo: 'عرض الهجوم',
      tryOwn: 'جرب بنفسك',
      startDemo: 'ابدأ العرض',
      running: 'جاري التشغيل...',
      analyze: 'تحليل البريد',
      analyzing: 'جاري التحليل...',
      analyzeTitle: 'حلل بريدك الإلكتروني',
      placeholder: 'الصق أي نص بريد إلكتروني مشبوه هنا لتحليله...'
    },
    architecture: {
      title: 'بنية النظام',
      subtitle: 'مبني بـ FastAPI و PyTorch وبنية تحتية حديثة للتعلم الآلي'
    },
    footer: {
      byline: 'هاكاثون سايبر رالي 2026 | فريق Zellag',
      contact: 'تواصل معنا:',
      tagline: 'فهم الهجمات لبناء دفاعات قوية'
    }
  }
}

// Main App
function App() {
  const { isMobile, isTablet } = useWindowSize()
  const [menuOpen, setMenuOpen] = useState(false)
  const [lang, setLang] = useState('en')
  const t = translations[lang]
  const isRTL = lang === 'ar'

  return (
    <div className="grid-bg" style={{ minHeight: '100vh', position: 'relative', direction: isRTL ? 'rtl' : 'ltr' }}>
      <MatrixRain />
      <div className="noise-overlay" />
      <div className="scanlines" />

      {/* Navigation */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          padding: isMobile ? '12px 16px' : '20px 48px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(10, 10, 12, 0.9)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid var(--border-subtle)',
          zIndex: 100
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px' }}>
          {/* Saudi Arabia Flag */}
          <svg
            width={isMobile ? "24" : "32"}
            height={isMobile ? "16" : "21"}
            viewBox="0 0 32 21"
            style={{ borderRadius: '2px', flexShrink: 0 }}
          >
            <rect width="32" height="21" fill="#006C35" />
            <text
              x="16"
              y="10"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              style={{ fontSize: '6px', fontFamily: 'Arial' }}
            >
              لا إله إلا الله
            </text>
            <rect x="10" y="13" width="12" height="1.5" fill="white" rx="0.5" />
          </svg>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? '1.2rem' : '1.5rem', fontWeight: 800 }}>
            PHISH<span style={{ color: 'var(--accent-blue)' }}>GUARD</span>
          </span>
        </div>

        {isMobile ? (
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-active)',
              color: 'var(--text-primary)',
              padding: '8px 12px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            {menuOpen ? 'CLOSE' : 'MENU'}
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
            <a href="#how-it-works" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px', transition: 'color 0.3s' }}>{t.nav.howItWorks}</a>
            <a href="#features" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px', transition: 'color 0.3s' }}>{t.nav.features}</a>
            <a href="#demo" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px', transition: 'color 0.3s' }}>{t.nav.demo}</a>
            <a href="#architecture" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px', transition: 'color 0.3s' }}>{t.nav.architecture}</a>
            {/* Language Toggle */}
            <button
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
              className="btn btn-outline"
              style={{ padding: '8px 16px', minWidth: '70px' }}
            >
              {lang === 'en' ? 'عربي' : 'EN'}
            </button>
            <button className="btn btn-outline" style={{ padding: '10px 20px' }}>GitHub</button>
          </div>
        )}
      </motion.nav>

      {/* Mobile Menu */}
      <MobileMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} t={t} lang={lang} setLang={setLang} />

      {/* Hero Section */}
      <section style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '100px 16px 60px' : '120px 48px 80px',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ maxWidth: '1200px', textAlign: 'center', width: '100%' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: isMobile ? '6px 12px' : '8px 16px',
              border: '1px solid var(--accent-blue)',
              borderRadius: '4px',
              marginBottom: isMobile ? '16px' : '24px',
              fontSize: isMobile ? '10px' : '12px',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              color: 'var(--accent-blue)'
            }}
          >
            {/* Saudi Arabia Flag */}
            <svg
              width={isMobile ? "20" : "28"}
              height={isMobile ? "13" : "18"}
              viewBox="0 0 32 21"
              style={{ borderRadius: '2px', flexShrink: 0 }}
            >
              <rect width="32" height="21" fill="#006C35" />
              <text
                x="16"
                y="10"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                style={{ fontSize: '6px', fontFamily: 'Arial' }}
              >
                لا إله إلا الله
              </text>
              <rect x="10" y="13" width="12" height="1.5" fill="white" rx="0.5" />
            </svg>
            {t.hero.badge}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="hero-title glitch-text"
            data-text="PHISHGUARD"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: isMobile ? '2.5rem' : isTablet ? '4rem' : '5rem',
              fontWeight: 800,
              marginBottom: isMobile ? '16px' : '24px',
              letterSpacing: '-2px',
              lineHeight: 1.1
            }}
          >
            PHISHGUARD
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            style={{
              fontSize: isMobile ? '1rem' : '1.25rem',
              color: 'var(--text-secondary)',
              maxWidth: '700px',
              margin: '0 auto 16px',
              lineHeight: 1.7,
              padding: isMobile ? '0 16px' : 0
            }}
          >
            {t.hero.subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: isMobile ? '11px' : '14px',
              color: 'var(--accent-green)',
              marginBottom: isMobile ? '32px' : '48px',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              direction: 'ltr'
            }}
          >
            <TypeWriter text={isMobile ? "$ ./phishguard --detect" : "$ ./phishguard --mode=adversarial --detect=true"} delay={40} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            style={{
              display: 'flex',
              gap: isMobile ? '12px' : '16px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}
          >
            <a href="#demo" className="btn btn-primary">{t.hero.cta1}</a>
            <button className="btn btn-outline">{t.hero.cta2}</button>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: [0, 10, 0] }}
            transition={{ duration: 2, delay: 1, repeat: Infinity }}
            style={{ marginTop: isMobile ? '40px' : '80px', color: 'var(--text-muted)', fontSize: isMobile ? '10px' : '12px' }}
          >
            {t.hero.scroll}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" style={{
        padding: isMobile ? '60px 16px' : '120px 48px',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            style={{ textAlign: 'center', marginBottom: isMobile ? '32px' : '64px' }}
          >
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: isMobile ? '1.75rem' : '3rem',
              fontWeight: 700,
              marginBottom: '12px'
            }}>
              {t.howItWorks.title}
            </h2>
            <p style={{
              color: 'var(--text-secondary)',
              maxWidth: '600px',
              margin: '0 auto',
              fontSize: isMobile ? '13px' : '16px',
              padding: isMobile ? '0 8px' : 0
            }}>
              {t.howItWorks.subtitle}
            </p>
          </motion.div>

          {/* Simple Explanation Steps */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: isMobile ? '16px' : '24px'
          }}>
            {/* Step 1 */}
            <motion.div
              initial={{ opacity: 0, x: isRTL ? 30 : -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              style={{
                display: 'flex',
                gap: isMobile ? '16px' : '24px',
                alignItems: 'flex-start',
                padding: isMobile ? '20px' : '32px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px'
              }}
            >
              <div style={{
                minWidth: isMobile ? '40px' : '56px',
                height: isMobile ? '40px' : '56px',
                background: 'rgba(255, 62, 62, 0.1)',
                border: '2px solid var(--accent-red)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '1rem' : '1.5rem',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                color: 'var(--accent-red)'
              }}>
                1
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: isMobile ? '1.1rem' : '1.4rem',
                  marginBottom: '8px',
                  color: 'var(--accent-red)'
                }}>
                  {t.howItWorks.step1Title}
                </h3>
                <p style={{
                  color: 'var(--text-secondary)',
                  fontSize: isMobile ? '13px' : '15px',
                  lineHeight: 1.7,
                  margin: 0
                }}>
                  {t.howItWorks.step1Desc}
                </p>
              </div>
            </motion.div>

            {/* Step 2 */}
            <motion.div
              initial={{ opacity: 0, x: isRTL ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              style={{
                display: 'flex',
                gap: isMobile ? '16px' : '24px',
                alignItems: 'flex-start',
                padding: isMobile ? '20px' : '32px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px'
              }}
            >
              <div style={{
                minWidth: isMobile ? '40px' : '56px',
                height: isMobile ? '40px' : '56px',
                background: 'rgba(255, 165, 2, 0.1)',
                border: '2px solid #ffa502',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '1rem' : '1.5rem',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                color: '#ffa502'
              }}>
                2
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: isMobile ? '1.1rem' : '1.4rem',
                  marginBottom: '8px',
                  color: '#ffa502'
                }}>
                  {t.howItWorks.step2Title}
                </h3>
                <p style={{
                  color: 'var(--text-secondary)',
                  fontSize: isMobile ? '13px' : '15px',
                  lineHeight: 1.7,
                  margin: 0
                }}>
                  {t.howItWorks.step2Desc}
                </p>
              </div>
            </motion.div>

            {/* Step 3 */}
            <motion.div
              initial={{ opacity: 0, x: isRTL ? 30 : -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              style={{
                display: 'flex',
                gap: isMobile ? '16px' : '24px',
                alignItems: 'flex-start',
                padding: isMobile ? '20px' : '32px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px'
              }}
            >
              <div style={{
                minWidth: isMobile ? '40px' : '56px',
                height: isMobile ? '40px' : '56px',
                background: 'rgba(255, 62, 62, 0.1)',
                border: '2px solid var(--accent-red)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '1rem' : '1.5rem',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                color: 'var(--accent-red)'
              }}>
                3
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: isMobile ? '1.1rem' : '1.4rem',
                  marginBottom: '8px',
                  color: 'var(--accent-red)'
                }}>
                  {t.howItWorks.step3Title}
                </h3>
                <p style={{
                  color: 'var(--text-secondary)',
                  fontSize: isMobile ? '13px' : '15px',
                  lineHeight: 1.7,
                  marginBottom: '12px'
                }}>
                  {t.howItWorks.step3Desc}
                </p>
                <div style={{
                  background: 'var(--bg-tertiary)',
                  padding: isMobile ? '12px' : '16px',
                  borderRadius: '6px',
                  fontSize: isMobile ? '12px' : '14px'
                }}>
                  <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>Homoglyphs:</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{t.howItWorks.step3Homoglyphs}</span>
                  </div>
                  <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>{isRTL ? 'أحرف مخفية:' : 'Invisible chars:'}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{t.howItWorks.step3Invisible}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>{isRTL ? 'إعادة الصياغة:' : 'Rewording:'}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{t.howItWorks.step3Rewording}</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Step 4 */}
            <motion.div
              initial={{ opacity: 0, x: isRTL ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              style={{
                display: 'flex',
                gap: isMobile ? '16px' : '24px',
                alignItems: 'flex-start',
                padding: isMobile ? '20px' : '32px',
                background: 'var(--bg-secondary)',
                border: '2px solid var(--accent-blue)',
                borderRadius: '8px',
                boxShadow: '0 0 30px rgba(0, 212, 255, 0.1)'
              }}
            >
              <div style={{
                minWidth: isMobile ? '40px' : '56px',
                height: isMobile ? '40px' : '56px',
                background: 'rgba(0, 212, 255, 0.1)',
                border: '2px solid var(--accent-blue)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '1rem' : '1.5rem',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                color: 'var(--accent-blue)'
              }}>
                4
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: isMobile ? '1.1rem' : '1.4rem',
                  marginBottom: '8px',
                  color: 'var(--accent-blue)'
                }}>
                  {t.howItWorks.step4Title}
                </h3>
                <p style={{
                  color: 'var(--text-secondary)',
                  fontSize: isMobile ? '13px' : '15px',
                  lineHeight: 1.7,
                  marginBottom: '12px'
                }}>
                  {t.howItWorks.step4Desc}
                </p>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: '12px'
                }}>
                  <div style={{
                    background: 'rgba(255, 62, 62, 0.1)',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 62, 62, 0.3)'
                  }}>
                    <div style={{ color: 'var(--accent-red)', fontWeight: 600, marginBottom: '4px', fontSize: isMobile ? '12px' : '14px' }}>
                      {t.howItWorks.redTeam}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: isMobile ? '11px' : '13px' }}>
                      {t.howItWorks.redTeamDesc}
                    </div>
                  </div>
                  <div style={{
                    background: 'rgba(0, 212, 255, 0.1)',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(0, 212, 255, 0.3)'
                  }}>
                    <div style={{ color: 'var(--accent-blue)', fontWeight: 600, marginBottom: '4px', fontSize: isMobile ? '12px' : '14px' }}>
                      {t.howItWorks.blueTeam}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: isMobile ? '11px' : '13px' }}>
                      {t.howItWorks.blueTeamDesc}
                    </div>
                  </div>
                </div>
                {/* AI Models Used */}
                <div style={{
                  marginTop: '12px',
                  padding: '12px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: '6px',
                  fontSize: isMobile ? '11px' : '13px',
                  direction: 'ltr'
                }}>
                  <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{t.howItWorks.aiStack} </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {t.howItWorks.aiStackDesc}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Key Insight Box */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="terminal-box"
              style={{ marginTop: '8px' }}
            >
              <div className="terminal-header">
                <span className="terminal-dot" />
                <span className="terminal-dot" />
                <span className="terminal-dot" />
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-muted)' }}>key_insight.txt</span>
              </div>
              <div className="terminal-content" style={{ textAlign: 'center' }}>
                <p style={{
                  color: 'var(--accent-green)',
                  fontSize: isMobile ? '14px' : '18px',
                  fontWeight: 600,
                  marginBottom: '8px'
                }}>
                  {t.howItWorks.insight}
                </p>
                <p style={{
                  color: 'var(--text-secondary)',
                  fontSize: isMobile ? '12px' : '14px',
                  margin: 0
                }}>
                  {t.howItWorks.insightDesc}
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{
        padding: isMobile ? '60px 16px' : '120px 48px',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            style={{ textAlign: 'center', marginBottom: isMobile ? '32px' : '64px' }}
          >
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: isMobile ? '1.75rem' : '3rem',
              fontWeight: 700,
              marginBottom: '12px'
            }}>
              {t.features.title}
            </h2>
            <p style={{
              color: 'var(--text-secondary)',
              maxWidth: '600px',
              margin: '0 auto',
              fontSize: isMobile ? '13px' : '16px',
              padding: isMobile ? '0 8px' : 0
            }}>
              {t.features.subtitle}
            </p>
          </motion.div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
            gap: isMobile ? '16px' : '24px'
          }}>
            <FeatureCard
              title={t.features.feature1Title}
              description={t.features.feature1Desc}
              tag={isRTL ? 'الوحدة 1' : 'Module 1'}
              tagColor="var(--accent-green)"
              items={t.features.feature1Items}
              delay={0}
              isMobile={isMobile}
            />
            <FeatureCard
              title={t.features.feature2Title}
              description={t.features.feature2Desc}
              tag={isRTL ? 'الوحدة 2' : 'Module 2'}
              tagColor="var(--accent-red)"
              items={t.features.feature2Items}
              delay={0.1}
              isMobile={isMobile}
            />
            <FeatureCard
              title={t.features.feature3Title}
              description={t.features.feature3Desc}
              tag={isRTL ? 'الوحدة 3' : 'Module 3'}
              tagColor="var(--accent-blue)"
              items={t.features.feature3Items}
              delay={0.2}
              isMobile={isMobile}
            />
          </div>
        </div>
      </section>

      {/* Metrics Section */}
      <section style={{
        padding: isMobile ? '40px 16px' : '80px 48px',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <MetricsDisplay t={t} />
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" style={{
        padding: isMobile ? '60px 16px' : '120px 48px',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            style={{ textAlign: 'center', marginBottom: isMobile ? '32px' : '64px' }}
          >
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: isMobile ? '1.75rem' : '3rem',
              fontWeight: 700,
              marginBottom: '12px'
            }}>
              {t.demo.title}
            </h2>
            <p style={{
              color: 'var(--text-secondary)',
              maxWidth: '600px',
              margin: '0 auto',
              fontSize: isMobile ? '13px' : '16px',
              padding: isMobile ? '0 8px' : 0
            }}>
              {t.demo.subtitle}
            </p>
          </motion.div>

          <PhishingDemo t={t} />
        </div>
      </section>

      {/* Architecture Section */}
      <section id="architecture" style={{
        padding: isMobile ? '60px 16px' : '120px 48px',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            style={{ textAlign: 'center', marginBottom: isMobile ? '32px' : '64px' }}
          >
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: isMobile ? '1.75rem' : '3rem',
              fontWeight: 700,
              marginBottom: '12px'
            }}>
              {t.architecture.title}
            </h2>
            <p style={{
              color: 'var(--text-secondary)',
              maxWidth: '600px',
              margin: '0 auto',
              fontSize: isMobile ? '13px' : '16px'
            }}>
              {t.architecture.subtitle}
            </p>
          </motion.div>

          <ArchitectureDiagram />

          {/* Tech Stack */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{
              marginTop: isMobile ? '24px' : '48px',
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
              gap: isMobile ? '8px' : '16px'
            }}
          >
            {['FastAPI', 'PyTorch', 'DistilBERT', 'CLIP'].map((tech, i) => (
              <div key={i} style={{
                padding: isMobile ? '12px' : '16px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '4px',
                textAlign: 'center',
                fontSize: isMobile ? '12px' : '14px'
              }}>
                {tech}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: isMobile ? '24px 16px' : '48px',
        borderTop: '1px solid var(--border-subtle)',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'center' : 'center',
          gap: isMobile ? '16px' : '0',
          textAlign: isMobile ? 'center' : 'left'
        }}>
          <div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? '1rem' : '1.25rem', fontWeight: 800 }}>
              PHISH<span style={{ color: 'var(--accent-blue)' }}>GUARD</span>
            </span>
            <p style={{ color: 'var(--text-muted)', fontSize: isMobile ? '10px' : '12px', marginTop: '8px' }}>
              {t.footer.byline}
            </p>
          </div>
          <div style={{ textAlign: isMobile ? 'center' : isRTL ? 'left' : 'right' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: isMobile ? '12px' : '14px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--accent-blue)' }}>{t.footer.contact} </span>
              <a
                href="tel:+966552442119"
                style={{
                  color: 'var(--text-primary)',
                  textDecoration: 'none',
                  fontFamily: 'var(--font-mono)',
                  direction: 'ltr',
                  display: 'inline-block'
                }}
              >
                +966 55 244 2119
              </a>
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: isMobile ? '10px' : '12px' }}>
              {t.footer.tagline}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
