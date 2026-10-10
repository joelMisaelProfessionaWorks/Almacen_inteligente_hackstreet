import { useEffect, useRef, useState } from 'react'
import './App.css'

const API = import.meta.env.VITE_API_URL || ''
const idKey = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`
const tabs = [['issue', 'Salida'], ['transfer', 'Transferir'], ['count', 'Contar'], ['materials', 'Orden']]

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idKey(), ...options.headers },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.detail || `Error ${response.status}`)
  return body
}

function ScanInput({ label, value, setValue, scan, placeholder }) {
  return <label className="field">{label}<div className="scan-row"><input value={value} onChange={(event) => setValue(event.target.value)} placeholder={placeholder} /><button type="button" className="scan" onClick={scan}>Escanear</button></div></label>
}

function Scanner({ target, close, read }) {
  const video = useRef(null)
  const [manual, setManual] = useState('')
  const [hint, setHint] = useState('Apunta la cámara a la etiqueta.')
  useEffect(() => {
    if (!target) return undefined
    let stream; let timer; let alive = true
    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) { setHint('Escribe el código o usa un lector Bluetooth.'); return }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } })
        if (!alive || !video.current) return
        video.current.srcObject = stream; await video.current.play()
        if (!('BarcodeDetector' in window)) { setHint('Este navegador no incluye detector nativo. Escribe el código o usa un lector Bluetooth.'); return }
        const detector = new window.BarcodeDetector({ formats: ['code_128', 'code_39', 'ean_13', 'qr_code'] })
        timer = window.setInterval(async () => {
          if (!video.current || video.current.readyState < 2) return
          try { const found = await detector.detect(video.current); if (found[0]?.rawValue) { read(found[0].rawValue); close() } } catch { /* vuelve a intentar en el siguiente cuadro */ }
        }, 350)
      } catch { setHint('No se pudo abrir la cámara. Captura el código manualmente.') }
    }
    start()
    return () => { alive = false; window.clearInterval(timer); stream?.getTracks().forEach((track) => track.stop()) }
  }, [target, close, read])
  if (!target) return null
  return <div className="modal"><section className="scanner" role="dialog" aria-modal="true"><div className="modal-head"><strong>Escanea el código</strong><button type="button" className="plain" onClick={close}>Cerrar</button></div><video ref={video} className="camera" playsInline muted /><p className="hint">{hint}</p><form className="manual" onSubmit={(event) => { event.preventDefault(); if (manual.trim()) { read(manual.trim()); close() } }}><input autoFocus value={manual} onChange={(event) => setManual(event.target.value)} placeholder="Código leído" /><button className="secondary">Usar código</button></form></section></div>
}

function App() {
  const [tab, setTab] = useState('issue')
  const [scanTarget, setScanTarget] = useState(null)
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)
  const [issue, setIssue] = useState({ order: '', location: '', part: '', quantity: '1', user: '' })
  const [transfer, setTransfer] = useState({ from: '', to: '', part: '', quantity: '1' })
  const [count, setCount] = useState({ location: '', reason: '', part: '', quantity: '0', lines: [] })
  const [order, setOrder] = useState('')
  const [materials, setMaterials] = useState(null)
  const set = (fn, field, value) => fn((old) => ({ ...old, [field]: value }))
  const run = async (work) => { setBusy(true); setNotice(null); try { await work() } catch (error) { setNotice({ error: true, text: error.message }) } finally { setBusy(false) } }
  const resolve = async (kind, value) => {
    if (/^\d+$/.test(value)) return Number(value)
    const item = await api(`/mobile/lookups/${kind}?code=${encodeURIComponent(value)}`)
    return kind === 'part' ? item.part_id : item.location_id
  }
  const capture = (code) => {
    const [group, field] = scanTarget.split('.')
    if (group === 'issue') set(setIssue, field, code)
    if (group === 'transfer') set(setTransfer, field, code)
    if (group === 'count') set(setCount, field, code)
  }
  const issueSubmit = (event) => { event.preventDefault(); run(async () => {
    if (!issue.order || !issue.location || !issue.part || !issue.user || Number(issue.quantity) < 1) throw new Error('Completa todos los campos de salida.')
    const [location_id, part_id] = await Promise.all([resolve('location', issue.location), resolve('part', issue.part)])
    const result = await api('/issues', { method: 'POST', body: JSON.stringify({ work_order_code: issue.order, location_id, part_id, quantity: Number(issue.quantity), issued_by: issue.user }) })
    setNotice({ text: `Salida registrada: movimiento ${result.movement_id}.` })
  }) }
  const transferSubmit = (event) => { event.preventDefault(); run(async () => {
    if (!transfer.from || !transfer.to || !transfer.part || Number(transfer.quantity) < 1) throw new Error('Completa todos los campos de transferencia.')
    const [from_location_id, to_location_id, part_id] = await Promise.all([resolve('location', transfer.from), resolve('location', transfer.to), resolve('part', transfer.part)])
    const result = await api('/transfers', { method: 'POST', body: JSON.stringify({ from_location_id, to_location_id, part_id, quantity: Number(transfer.quantity) }) })
    setNotice({ text: `Transferencia registrada: movimiento ${result.movement_id}.` })
  }) }
  const addLine = () => run(async () => {
    if (!count.part || !Number.isInteger(Number(count.quantity)) || Number(count.quantity) < 0) throw new Error('Indica una pieza y una cantidad válida.')
    const part_id = await resolve('part', count.part)
    setCount((old) => ({ ...old, part: '', quantity: '0', lines: [...old.lines, { part_id, label: count.part, counted_quantity: Number(count.quantity) }] }))
  })
  const countSubmit = (event) => { event.preventDefault(); run(async () => {
    if (!count.location || !count.reason.trim()) throw new Error('La ubicación y el motivo son obligatorios.')
    if (!count.lines.length) throw new Error('Agrega al menos una pieza al conteo.')
    const location_id = await resolve('location', count.location)
    const result = await api('/counts', { method: 'POST', body: JSON.stringify({ location_id, reason: count.reason.trim(), lines: count.lines.map(({ part_id, counted_quantity }) => ({ part_id, counted_quantity })) }) })
    setNotice({ text: `${result.adjustments.length} ajuste(s) registrado(s).` }); setCount((old) => ({ ...old, lines: [] }))
  }) }
  const materialsSubmit = (event) => { event.preventDefault(); run(async () => {
    if (!order.trim()) throw new Error('Indica la orden de trabajo.')
    setMaterials(await api(`/work-orders/${encodeURIComponent(order.trim())}/materials`))
  }) }

  return <main className="app-shell"><header className="hero"><span>HACKSTREET · ALMACÉN INTELIGENTE</span><h1>Almacén de piso</h1><p>Escanea, confirma y registra cada movimiento.</p></header><nav className="tabs">{tabs.map(([key, label]) => <button type="button" key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}</nav>{notice && <div className={`notice ${notice.error ? 'error' : 'success'}`}>{notice.text}</div>}
    {tab === 'issue' && <form className="card" onSubmit={issueSubmit}><h2>Salida contra orden</h2><label className="field">Orden de trabajo<input value={issue.order} onChange={(e) => set(setIssue, 'order', e.target.value.toUpperCase())} placeholder="R061026012" /></label><ScanInput label="Ubicación" value={issue.location} setValue={(v) => set(setIssue, 'location', v)} scan={() => setScanTarget('issue.location')} placeholder="U-014 o ID" /><ScanInput label="Pieza" value={issue.part} setValue={(v) => set(setIssue, 'part', v)} scan={() => setScanTarget('issue.part')} placeholder="SKU o ID" /><div className="grid"><label className="field">Cantidad<input type="number" min="1" value={issue.quantity} onChange={(e) => set(setIssue, 'quantity', e.target.value)} /></label><label className="field">Operario<input value={issue.user} onChange={(e) => set(setIssue, 'user', e.target.value)} placeholder="tecnico-1" /></label></div><button className="primary" disabled={busy}>Registrar salida</button></form>}
    {tab === 'transfer' && <form className="card" onSubmit={transferSubmit}><h2>Transferencia</h2><ScanInput label="Ubicación de origen" value={transfer.from} setValue={(v) => set(setTransfer, 'from', v)} scan={() => setScanTarget('transfer.from')} placeholder="U-014 o ID" /><ScanInput label="Ubicación de destino" value={transfer.to} setValue={(v) => set(setTransfer, 'to', v)} scan={() => setScanTarget('transfer.to')} placeholder="U-022 o ID" /><ScanInput label="Pieza" value={transfer.part} setValue={(v) => set(setTransfer, 'part', v)} scan={() => setScanTarget('transfer.part')} placeholder="SKU o ID" /><label className="field">Cantidad<input type="number" min="1" value={transfer.quantity} onChange={(e) => set(setTransfer, 'quantity', e.target.value)} /></label><button className="primary" disabled={busy}>Registrar transferencia</button></form>}
    {tab === 'count' && <form className="card" onSubmit={countSubmit}><h2>Conteo cíclico</h2><ScanInput label="Ubicación" value={count.location} setValue={(v) => set(setCount, 'location', v)} scan={() => setScanTarget('count.location')} placeholder="U-014 o ID" /><label className="field">Motivo obligatorio<input value={count.reason} onChange={(e) => set(setCount, 'reason', e.target.value)} placeholder="Conteo cíclico semanal" /></label><div className="count-entry"><ScanInput label="Pieza" value={count.part} setValue={(v) => set(setCount, 'part', v)} scan={() => setScanTarget('count.part')} placeholder="SKU o ID" /><label className="field">Contado<input type="number" min="0" value={count.quantity} onChange={(e) => set(setCount, 'quantity', e.target.value)} /></label><button type="button" className="secondary" onClick={addLine}>Agregar</button></div><ul className="lines">{count.lines.map((line, i) => <li key={`${line.part_id}-${i}`}><span>{line.label}</span><strong>{line.counted_quantity}</strong><button type="button" className="plain" onClick={() => setCount((old) => ({ ...old, lines: old.lines.filter((_, index) => index !== i) }))}>Quitar</button></li>)}</ul><button className="primary" disabled={busy}>Registrar conteo</button></form>}
    {tab === 'materials' && <section className="card"><h2>Materiales por orden</h2><form className="lookup" onSubmit={materialsSubmit}><input value={order} onChange={(e) => setOrder(e.target.value.toUpperCase())} placeholder="Código de orden" /><button className="primary" disabled={busy}>Consultar</button></form>{materials && <><p className="order-title">Orden <strong>{materials.code}</strong></p><div className="table-wrap"><table><thead><tr><th>Pieza</th><th>Req.</th><th>Res.</th><th>Ent.</th><th>Falta</th></tr></thead><tbody>{materials.lines.map((line) => <tr key={line.bom_line_id}><td>{line.name}</td><td>{line.required ?? '—'}</td><td>{line.reserved}</td><td>{line.issued}</td><td>{line.missing ?? '—'}</td></tr>)}</tbody></table></div></>}</section>}
    <Scanner target={scanTarget} close={() => setScanTarget(null)} read={capture} />
  </main>
}

export default App
