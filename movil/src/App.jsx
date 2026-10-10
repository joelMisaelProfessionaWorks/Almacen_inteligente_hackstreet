import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const API_BASE = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')
const tabs = [
  ['issue', 'Salida'],
  ['transfer', 'Transferir'],
  ['count', 'Contar'],
  ['materials', 'Orden'],
]

const createLookupField = () => ({ input: '', id: null, label: '' })
const idKey = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) }
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json'
  if (options.method && !['GET', 'HEAD'].includes(options.method.toUpperCase())) headers['Idempotency-Key'] = idKey()

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers })
  const contentType = response.headers.get('content-type') || ''
  const body = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '')

  if (!response.ok) {
    const message = body?.detail || (typeof body === 'string' && body.trim()) || `Error ${response.status}`
    const error = new Error(message)
    error.status = response.status
    error.body = body
    throw error
  }

  return body
}

function asArray(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.items)) return payload.items
  return []
}

function normalizeLocation(item) {
  const id = item?.location_id ?? item?.id ?? item?.locationId
  if (id == null) return null
  const code = item?.code ?? item?.location_code ?? item?.label ?? ''
  const name = item?.name ?? item?.description ?? ''
  const display = name ? `${code || `#${id}`} · ${name}` : code || `#${id}`
  return { id: Number(id), code: String(code || ''), name: String(name || ''), display }
}

function normalizePart(item) {
  const id = item?.part_id ?? item?.id ?? item?.partId
  if (id == null) return null
  const sku = item?.sku ?? item?.code ?? item?.label ?? ''
  const name = item?.name ?? item?.description ?? ''
  const display = name ? `${sku || `P-${id}`} · ${name}` : sku || `P-${id}`
  return { id: Number(id), sku: String(sku || ''), name: String(name || ''), display }
}

function normalizeChoice(option) {
  const kind = option?.kind ?? option?.type ?? (option?.location_id != null ? 'location' : 'part')
  if (kind === 'location') {
    const normalized = normalizeLocation(option)
    return normalized ? { kind: 'location', ...normalized } : null
  }
  const normalized = normalizePart(option)
  return normalized ? { kind: 'part', ...normalized } : null
}

function collectScanCandidates(payload) {
  if (!payload) return []

  if (payload.kind === 'ambiguous' || payload.ambiguous === true) {
    return asArray(payload.options || payload.matches || payload.items).map(normalizeChoice).filter(Boolean)
  }

  const directLocation = payload.location || (payload.location_id != null ? payload : null)
  if (directLocation) {
    const normalized = normalizeChoice({
      ...directLocation,
      kind: 'location',
      location_id: directLocation.location_id ?? directLocation.id,
    })
    if (normalized) return [normalized]
  }

  const directPart = payload.part || (payload.part_id != null ? payload : null)
  if (directPart) {
    const normalized = normalizeChoice({
      ...directPart,
      kind: 'part',
      part_id: directPart.part_id ?? directPart.id,
    })
    if (normalized) return [normalized]
  }

  const items = asArray(payload.items || payload.matches || payload.options)
  if (items.length) return items.map(normalizeChoice).filter(Boolean)

  return []
}

function isNumeric(value) {
  return /^\d+$/.test(String(value).trim())
}

function LookupField({
  label,
  value,
  onChange,
  onScan,
  placeholder,
  helper,
  suggestions,
  listId,
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <div className="scan-row">
        <input
          list={listId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
        <button type="button" className="scan" onClick={onScan}>Escanear</button>
      </div>
      {helper && <span className="field-note">{helper}</span>}
      {listId && suggestions?.length ? (
        <datalist id={listId}>
          {suggestions.map((item) => (
            <option key={item.id} value={item.code || item.display} label={item.display} />
          ))}
        </datalist>
      ) : null}
    </label>
  )
}

const SCAN_FORMATS = ['code_128', 'code_39', 'ean_13', 'qr_code']

function cameraErrorMessage(error) {
  if (!window.isSecureContext) {
    return 'La cámara solo funciona con HTTPS. Abre la app con https:// (ver instrucciones) o usa el modo manual.'
  }
  switch (error?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Permiso de cámara denegado. Actívalo en los ajustes del navegador y vuelve a intentar.'
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No se encontró una cámara en este dispositivo.'
    case 'NotReadableError':
      return 'La cámara está ocupada por otra app. Ciérrala e intenta de nuevo.'
    default:
      return 'No se pudo abrir la cámara. Usa el modo manual.'
  }
}

function ScannerModal({ target, onClose, onRead }) {
  const videoRef = useRef(null)
  const [manual, setManual] = useState('')
  const [hint, setHint] = useState('Abriendo cámara...')
  const [live, setLive] = useState(false)

  // Los callbacks cambian en cada render del padre; se guardan en refs para que
  // el efecto de la cámara NO se reinicie (eso apagaba el video a medio arrancar).
  const onReadRef = useRef(onRead)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onReadRef.current = onRead
    onCloseRef.current = onClose
  })

  const hasTarget = Boolean(target)

  useEffect(() => {
    if (!hasTarget) return undefined

    const videoEl = videoRef.current
    let alive = true
    let done = false
    let stream = null
    let timer = null
    let controls = null

    const finish = (rawValue) => {
      if (done || !rawValue) return
      done = true
      if (navigator.vibrate) navigator.vibrate(60)
      void onReadRef.current(String(rawValue).trim())
      onCloseRef.current()
    }

    const startNative = async () => {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      if (!alive || !videoRef.current) return
      const video = videoRef.current
      video.srcObject = stream
      await video.play()
      if (!alive) return
      setLive(true)
      setHint('Apunta la cámara a la etiqueta.')

      const detector = new window.BarcodeDetector({ formats: SCAN_FORMATS })
      let busy = false
      timer = window.setInterval(async () => {
        if (busy || done || video.readyState < 2) return
        busy = true
        try {
          const found = await detector.detect(video)
          if (found[0]?.rawValue) finish(found[0].rawValue)
        } catch {
          // Reintenta en el siguiente fotograma.
        } finally {
          busy = false
        }
      }, 250)
    }

    // iPhone/Safari y otros navegadores sin BarcodeDetector: decodificación por software.
    const startZxing = async () => {
      const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
        import('@zxing/browser'),
        import('@zxing/library'),
      ])
      if (!alive || !videoRef.current) return

      const hints = new Map()
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.EAN_13,
        BarcodeFormat.QR_CODE,
      ])
      hints.set(DecodeHintType.TRY_HARDER, true)

      const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 })
      const started = await reader.decodeFromConstraints(
        {
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        },
        videoRef.current,
        (result) => {
          if (result) finish(result.getText())
        },
      )
      if (!alive) {
        started.stop()
        return
      }
      controls = started
      setLive(true)
      setHint('Apunta la cámara a la etiqueta. Aleja un poco el teléfono si no enfoca.')
    }

    const start = async () => {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setHint(cameraErrorMessage())
        return
      }
      try {
        if ('BarcodeDetector' in window) {
          try {
            await startNative()
            return
          } catch (error) {
            if (error?.name === 'NotAllowedError') throw error
            // BarcodeDetector sin soporte para algún formato: caer a zxing.
            stream?.getTracks().forEach((track) => track.stop())
            stream = null
          }
        }
        await startZxing()
      } catch (error) {
        if (alive) setHint(cameraErrorMessage(error))
      }
    }

    void start()

    return () => {
      alive = false
      window.clearInterval(timer)
      controls?.stop()
      stream?.getTracks().forEach((track) => track.stop())
      if (videoEl) videoEl.srcObject = null
      setLive(false)
    }
  }, [hasTarget])

  if (!target) return null

  return (
    <div className="modal">
      <section className="scanner" role="dialog" aria-modal="true" aria-labelledby="scanner-title">
        <div className="modal-head">
          <div>
            <strong id="scanner-title">Escanear {target.label}</strong>
            <p className="muted">{target.help}</p>
          </div>
          <button type="button" className="plain" onClick={onClose}>Cerrar</button>
        </div>
        <video ref={videoRef} className={`camera${live ? ' live' : ''}`} autoPlay playsInline muted />
        <p className="hint">{hint}</p>
        <form
          className="manual"
          onSubmit={(event) => {
            event.preventDefault()
            const code = manual.trim()
            if (!code) return
            void onRead(code)
            onClose()
          }}
        >
          <input
            value={manual}
            onChange={(event) => setManual(event.target.value)}
            placeholder="Código leído"
            autoCapitalize="characters"
            autoCorrect="off"
          />
          <button className="secondary">Usar código</button>
        </form>
      </section>
    </div>
  )
}

function ChoiceModal({ choice, onPick, onCancel }) {
  if (!choice) return null

  return (
    <div className="modal choice-modal">
      <section className="scanner choice-panel" role="dialog" aria-modal="true" aria-labelledby="choice-title">
        <div className="modal-head">
          <div>
            <strong id="choice-title">{choice.title}</strong>
            {choice.subtitle && <p className="muted">{choice.subtitle}</p>}
          </div>
          <button type="button" className="plain" onClick={onCancel}>Cancelar</button>
        </div>
        <div className="choice-list">
          {choice.options.map((option) => (
            <button
              key={`${option.kind}-${option.id}`}
              type="button"
              className="choice-item"
              onClick={() => onPick(option)}
            >
              <strong>{option.display}</strong>
              <span>{option.kind === 'location' ? `Ubicación ${option.id}` : `Pieza ${option.id}`}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

function App() {
  const [tab, setTab] = useState('issue')
  const [scanTarget, setScanTarget] = useState(null)
  const [choice, setChoice] = useState(null)
  const choiceResolver = useRef(null)
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)
  const [catalogState, setCatalogState] = useState('Cargando ubicaciones...')
  const [locations, setLocations] = useState([])
  const [issue, setIssue] = useState({
    work_order_code: '',
    location: createLookupField(),
    part: createLookupField(),
    quantity: '1',
    issued_by: '',
  })
  const [transfer, setTransfer] = useState({
    from: createLookupField(),
    to: createLookupField(),
    part: createLookupField(),
    quantity: '1',
  })
  const [count, setCount] = useState({
    location: createLookupField(),
    reason: '',
    part: createLookupField(),
    quantity: '0',
    lines: [],
  })
  const [order, setOrder] = useState('')
  const [materials, setMaterials] = useState(null)

  const locationSuggestions = useMemo(() => locations, [locations])

  const run = async (work) => {
    setBusy(true)
    setNotice(null)
    try {
      await work()
    } catch (error) {
      setNotice({ error: true, text: error.message })
    } finally {
      setBusy(false)
    }
  }

  const openChoice = (title, subtitle, options) => new Promise((resolve, reject) => {
    choiceResolver.current = { resolve, reject }
    setChoice({ title, subtitle, options })
  })

  const resolveLookup = async ({ kind, value }) => {
    const raw = String(value || '').trim()
    if (!raw) throw new Error(`Completa el campo de ${kind === 'location' ? 'ubicación' : 'pieza'}.`)

    if (isNumeric(raw)) {
      return {
        kind,
        id: Number(raw),
        input: raw,
        label: raw,
        display: `#${raw}`,
      }
    }

    try {
      const payload = await request(`/scan/${encodeURIComponent(raw)}`)
      const candidates = collectScanCandidates(payload).filter((candidate) => candidate.kind === kind || candidate.kind == null)

      if (candidates.length === 1) return candidates[0]
      if (candidates.length > 1) {
        const picked = await openChoice(
          kind === 'location' ? 'Elegir ubicación' : 'Elegir pieza',
          kind === 'location'
            ? `El código ${raw} coincide con varias ubicaciones.`
            : `El SKU ${raw} coincide con varias piezas.`,
          candidates,
        )
        if (!picked) throw new Error('Selección cancelada.')
        return picked
      }
    } catch (error) {
      if (error?.status && error.status !== 404) throw error
    }

    if (kind === 'location') {
      const matches = locations.filter((location) => [location.code, location.display, String(location.id)].some((candidate) => candidate && candidate.toLowerCase().includes(raw.toLowerCase())))
      if (matches.length === 1) return { kind: 'location', ...matches[0], input: raw }
      if (matches.length > 1) {
        const picked = await openChoice('Elegir ubicación', `El código ${raw} coincide con varias ubicaciones cargadas.`, matches.map((match) => ({ kind: 'location', ...match })))
        if (!picked) throw new Error('Selección cancelada.')
        return picked
      }
    }

    throw new Error(kind === 'location'
      ? 'No pude resolver la ubicación. Usa un código de etiqueta o el ID.'
      : 'No pude resolver la pieza. Usa el SKU/etiqueta o el ID.')
  }

  const applyResolvedLookup = (setter, field, resolved) => {
    setter((current) => ({
      ...current,
      [field]: {
        input: resolved.display || resolved.label || resolved.input || String(resolved.id),
        id: resolved.id,
        label: resolved.display || resolved.label || '',
      },
    }))
  }

  const captureScan = async (target, code) => {
    const resolved = await resolveLookup({ kind: target.kind, value: code })
    if (target.form === 'issue') applyResolvedLookup(setIssue, target.field, resolved)
    if (target.form === 'transfer') applyResolvedLookup(setTransfer, target.field, resolved)
    if (target.form === 'count') applyResolvedLookup(setCount, target.field, resolved)
  }

  const setLookupInput = (setter, field, value) => {
    setter((current) => ({
      ...current,
      [field]: { ...current[field], input: value, id: null, label: '' },
    }))
  }

  const setLookupResolved = (setter, field, resolved) => {
    setter((current) => ({
      ...current,
      [field]: {
        input: resolved.display || resolved.label || resolved.input || String(resolved.id),
        id: resolved.id,
        label: resolved.display || resolved.label || '',
      },
    }))
  }

  useEffect(() => {
    let active = true
    const loadLocations = async () => {
      try {
        const payload = await request('/locations')
        const normalized = asArray(payload).map(normalizeLocation).filter(Boolean)
        if (!active) return
        setLocations(normalized)
        setCatalogState(normalized.length ? `${normalized.length} ubicaciones cargadas` : 'Catálogo vacío')
      } catch {
        if (!active) return
        setCatalogState('Sin catálogo de ubicaciones; usa el ID o el backend /locations')
      }
    }

    void loadLocations()
    return () => {
      active = false
    }
  }, [])

  const issueSubmit = (event) => {
    event.preventDefault()
    void run(async () => {
      if (!issue.work_order_code.trim() || !issue.location.input || !issue.part.input || !issue.issued_by.trim() || Number(issue.quantity) < 1) {
        throw new Error('Completa todos los campos de salida.')
      }

      const [location, part] = await Promise.all([
        issue.location.id ? issue.location : resolveLookup({ kind: 'location', value: issue.location.input }),
        issue.part.id ? issue.part : resolveLookup({ kind: 'part', value: issue.part.input }),
      ])

      setLookupResolved(setIssue, 'location', location)
      setLookupResolved(setIssue, 'part', part)

      const result = await request('/issues', {
        method: 'POST',
        body: JSON.stringify({
          work_order_code: issue.work_order_code.trim(),
          part_id: part.id,
          location_id: location.id,
          quantity: Number(issue.quantity),
          issued_by: issue.issued_by.trim(),
        }),
      })

      setNotice({ text: `Salida registrada: movimiento ${result.movement_id}.` })
    })
  }

  const transferSubmit = (event) => {
    event.preventDefault()
    void run(async () => {
      if (!transfer.from.input || !transfer.to.input || !transfer.part.input || Number(transfer.quantity) < 1) {
        throw new Error('Completa todos los campos de transferencia.')
      }

      const [fromLocation, toLocation, part] = await Promise.all([
        transfer.from.id ? transfer.from : resolveLookup({ kind: 'location', value: transfer.from.input }),
        transfer.to.id ? transfer.to : resolveLookup({ kind: 'location', value: transfer.to.input }),
        transfer.part.id ? transfer.part : resolveLookup({ kind: 'part', value: transfer.part.input }),
      ])

      setLookupResolved(setTransfer, 'from', fromLocation)
      setLookupResolved(setTransfer, 'to', toLocation)
      setLookupResolved(setTransfer, 'part', part)

      const result = await request('/transfers', {
        method: 'POST',
        body: JSON.stringify({
          part_id: part.id,
          from_location_id: fromLocation.id,
          to_location_id: toLocation.id,
          quantity: Number(transfer.quantity),
        }),
      })

      setNotice({ text: `Transferencia registrada: movimiento ${result.movement_id}.` })
    })
  }

  const addLine = () => {
    void run(async () => {
      if (!count.part.input || Number.isNaN(Number(count.quantity)) || Number(count.quantity) < 0) {
        throw new Error('Indica una pieza y una cantidad válida.')
      }

      const part = count.part.id ? count.part : await resolveLookup({ kind: 'part', value: count.part.input })
      setLookupResolved(setCount, 'part', part)
      setCount((current) => ({
        ...current,
        part: createLookupField(),
        quantity: '0',
        lines: [...current.lines, { part_id: part.id, label: part.display, counted_quantity: Number(count.quantity) }],
      }))
    })
  }

  const countSubmit = (event) => {
    event.preventDefault()
    void run(async () => {
      if (!count.location.input || !count.reason.trim()) throw new Error('La ubicación y el motivo son obligatorios.')
      if (!count.lines.length) throw new Error('Agrega al menos una pieza al conteo.')

      const location = count.location.id ? count.location : await resolveLookup({ kind: 'location', value: count.location.input })
      setLookupResolved(setCount, 'location', location)

      const result = await request('/counts', {
        method: 'POST',
        body: JSON.stringify({
          location_id: location.id,
          reason: count.reason.trim(),
          lines: count.lines.map(({ part_id, counted_quantity }) => ({ part_id, counted_quantity })),
        }),
      })

      const adjustments = Array.isArray(result.adjustments) ? result.adjustments : []
      setNotice({ text: adjustments.length ? `${adjustments.length} ajuste(s) registrado(s).` : 'Conteo registrado sin diferencias.' })
      setCount((current) => ({ ...current, lines: [] }))
    })
  }

  const materialsSubmit = (event) => {
    event.preventDefault()
    void run(async () => {
      const code = order.trim()
      if (!code) throw new Error('Indica la orden de trabajo.')
      const result = await request(`/work-orders/${encodeURIComponent(code)}/materials`)
      setMaterials(result)
    })
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div className="hero-top">
          <span>HACKATHON · ALMACÉN MÓVIL</span>
          <span className="status-pill">{catalogState}</span>
        </div>
        <h1>Almacén de piso</h1>
        <p>Escanea una etiqueta, resuelve la pieza o ubicación y registra el movimiento al instante.</p>
        <div className="hero-meta">
          <span>Escaneo con cámara o captura manual</span>
        </div>
      </header>

      <nav className="tabs">
        {tabs.map(([key, label]) => (
          <button type="button" key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </nav>

      {notice && <div className={`notice ${notice.error ? 'error' : 'success'}`}>{notice.text}</div>}

      {tab === 'issue' && (
        <form className="card" onSubmit={issueSubmit}>
          <h2>Salida contra orden</h2>
          <label className="field">
            <span className="field-label">Orden de trabajo</span>
            <input
              value={issue.work_order_code}
              onChange={(event) => setIssue((current) => ({ ...current, work_order_code: event.target.value.toUpperCase() }))}
              placeholder="R061026012"
            />
          </label>
          <LookupField
            label="Ubicación"
            value={issue.location.input}
            onChange={(value) => setLookupInput(setIssue, 'location', value)}
            onScan={() => setScanTarget({ form: 'issue', field: 'location', kind: 'location', label: 'ubicación', help: 'Etiqueta U-101 o el ID interno.' })}
            placeholder="U-101 o ID"
            helper={issue.location.id ? `Resuelta: ${issue.location.label || `#${issue.location.id}`}` : 'Escribe el código o escanéalo.'}
            suggestions={locationSuggestions}
            listId="locations-issue"
          />
          <LookupField
            label="Pieza"
            value={issue.part.input}
            onChange={(value) => setLookupInput(setIssue, 'part', value)}
            onScan={() => setScanTarget({ form: 'issue', field: 'part', kind: 'part', label: 'pieza', help: 'Etiqueta SKU o el ID de pieza.' })}
            placeholder="7014 CTA/P4 o ID"
            helper={issue.part.id ? `Resuelta: ${issue.part.label || `#${issue.part.id}`}` : 'Si un SKU coincide con varias piezas, te pediré elegir.'}
          />
          <div className="grid">
            <label className="field">
              <span className="field-label">Cantidad</span>
              <input type="number" min="1" value={issue.quantity} onChange={(event) => setIssue((current) => ({ ...current, quantity: event.target.value }))} />
            </label>
            <label className="field">
              <span className="field-label">Emitido por</span>
              <input value={issue.issued_by} onChange={(event) => setIssue((current) => ({ ...current, issued_by: event.target.value }))} placeholder="tecnico-1" />
            </label>
          </div>
          <button className="primary" disabled={busy}>Registrar salida</button>
        </form>
      )}

      {tab === 'transfer' && (
        <form className="card" onSubmit={transferSubmit}>
          <h2>Transferencia</h2>
          <LookupField
            label="Ubicación de origen"
            value={transfer.from.input}
            onChange={(value) => setLookupInput(setTransfer, 'from', value)}
            onScan={() => setScanTarget({ form: 'transfer', field: 'from', kind: 'location', label: 'ubicación de origen', help: 'Etiqueta U-101 o ID.' })}
            placeholder="U-101 o ID"
            helper={transfer.from.id ? `Resuelta: ${transfer.from.label || `#${transfer.from.id}`}` : ''}
            suggestions={locationSuggestions}
            listId="locations-transfer-from"
          />
          <LookupField
            label="Ubicación de destino"
            value={transfer.to.input}
            onChange={(value) => setLookupInput(setTransfer, 'to', value)}
            onScan={() => setScanTarget({ form: 'transfer', field: 'to', kind: 'location', label: 'ubicación de destino', help: 'Etiqueta U-101 o ID.' })}
            placeholder="U-102 o ID"
            helper={transfer.to.id ? `Resuelta: ${transfer.to.label || `#${transfer.to.id}`}` : ''}
            suggestions={locationSuggestions}
            listId="locations-transfer-to"
          />
          <LookupField
            label="Pieza"
            value={transfer.part.input}
            onChange={(value) => setLookupInput(setTransfer, 'part', value)}
            onScan={() => setScanTarget({ form: 'transfer', field: 'part', kind: 'part', label: 'pieza', help: 'Etiqueta SKU o ID.' })}
            placeholder="7014 CTA/P4 o ID"
            helper={transfer.part.id ? `Resuelta: ${transfer.part.label || `#${transfer.part.id}`}` : ''}
          />
          <label className="field">
            <span className="field-label">Cantidad</span>
            <input type="number" min="1" value={transfer.quantity} onChange={(event) => setTransfer((current) => ({ ...current, quantity: event.target.value }))} />
          </label>
          <button className="primary" disabled={busy}>Registrar transferencia</button>
        </form>
      )}

      {tab === 'count' && (
        <form className="card" onSubmit={countSubmit}>
          <h2>Conteo cíclico</h2>
          <LookupField
            label="Ubicación"
            value={count.location.input}
            onChange={(value) => setLookupInput(setCount, 'location', value)}
            onScan={() => setScanTarget({ form: 'count', field: 'location', kind: 'location', label: 'ubicación', help: 'Etiqueta U-101 o ID.' })}
            placeholder="U-101 o ID"
            helper={count.location.id ? `Resuelta: ${count.location.label || `#${count.location.id}`}` : ''}
            suggestions={locationSuggestions}
            listId="locations-count"
          />
          <label className="field">
            <span className="field-label">Motivo obligatorio</span>
            <input value={count.reason} onChange={(event) => setCount((current) => ({ ...current, reason: event.target.value }))} placeholder="Conteo cíclico semanal" />
          </label>
          <div className="count-entry">
            <LookupField
              label="Pieza"
              value={count.part.input}
              onChange={(value) => setLookupInput(setCount, 'part', value)}
              onScan={() => setScanTarget({ form: 'count', field: 'part', kind: 'part', label: 'pieza', help: 'Etiqueta SKU o ID.' })}
              placeholder="7014 CTA/P4 o ID"
              helper={count.part.id ? `Resuelta: ${count.part.label || `#${count.part.id}`}` : ''}
            />
            <label className="field">
              <span className="field-label">Contado</span>
              <input type="number" min="0" value={count.quantity} onChange={(event) => setCount((current) => ({ ...current, quantity: event.target.value }))} />
            </label>
            <button type="button" className="secondary" onClick={addLine}>Agregar</button>
          </div>
          <ul className="lines">
            {count.lines.map((line, index) => (
              <li key={`${line.part_id}-${index}`}>
                <span>{line.label}</span>
                <strong>{line.counted_quantity}</strong>
                <button
                  type="button"
                  className="plain"
                  onClick={() => setCount((current) => ({ ...current, lines: current.lines.filter((_, lineIndex) => lineIndex !== index) }))}
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
          <button className="primary" disabled={busy}>Registrar conteo</button>
        </form>
      )}

      {tab === 'materials' && (
        <section className="card">
          <h2>Materiales por orden</h2>
          <form className="lookup" onSubmit={materialsSubmit}>
            <input value={order} onChange={(event) => setOrder(event.target.value.toUpperCase())} placeholder="Código de orden" />
            <button className="primary" disabled={busy}>Consultar</button>
          </form>
          {materials && (
            <>
              <p className="order-title">Orden <strong>{materials.code}</strong></p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Pieza</th>
                      <th>Req.</th>
                      <th>Res.</th>
                      <th>Ent.</th>
                      <th>Falta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {asArray(materials.lines).map((line) => (
                      <tr key={line.bom_line_id}>
                        <td>{line.name}</td>
                        <td>{line.required ?? '—'}</td>
                        <td>{line.reserved}</td>
                        <td>{line.issued}</td>
                        <td>{line.missing ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      <ScannerModal
        target={scanTarget}
        onClose={() => setScanTarget(null)}
        onRead={(code) => void run(async () => captureScan(scanTarget, code))}
      />

      <ChoiceModal
        choice={choice}
        onPick={(option) => {
          choiceResolver.current?.resolve(option)
          choiceResolver.current = null
          setChoice(null)
        }}
        onCancel={() => {
          choiceResolver.current?.reject(new Error('Selección cancelada.'))
          choiceResolver.current = null
          setChoice(null)
        }}
      />
    </main>
  )
}

export default App