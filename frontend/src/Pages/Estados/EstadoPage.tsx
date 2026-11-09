import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { states, type State } from '../../data/states'
import NaturePanel from './NaturePanel'
import './state.css'

function StateView({ state }: { state: State }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const openButton = useRef<HTMLButtonElement>(null)
  const timer = useRef<number | undefined>(undefined)
  const [imageReady, setImageReady] = useState(false)
  const [interacted, setInteracted] = useState(false)

  useEffect(() => {
    if (!imageReady || interacted) return
    timer.current = window.setTimeout(() => dialog.current?.showModal(), 2000)
    return () => window.clearTimeout(timer.current)
  }, [imageReady, interacted])

  function open() {
    window.clearTimeout(timer.current)
    setInteracted(true)
    if (!dialog.current?.open) dialog.current?.showModal()
  }

  return (
    <main className="state-view">
      <img className="state-photo" src={state.image} alt={state.credit?.place ?? 'Paisagem de ' + state.name}
        onLoad={() => setImageReady(true)} onError={() => setImageReady(true)}
        ref={node => { if (node?.complete) setImageReady(true) }} />
      <div className="state-shade" />
      <header className="state-top">
        <Link className="state-action" to="/home" viewTransition>← <span>Voltar ao mapa</span></Link>
        <span className="state-brand">◉ GeoPulsoBR</span>
      </header>
      <section className="state-intro">
        <p className="state-kicker"><span>{state.uf}</span> Região {state.region}</p>
        <h1>{state.name}</h1>
        <p>Capital: {state.capital}</p>
        <button className="state-action state-primary" ref={openButton} aria-haspopup="dialog" onClick={open}>
          Abrir painel natural <span aria-hidden="true">↗</span>
        </button>
      </section>
      {state.credit && <aside className="state-credit">
        <a href={state.credit.url} target="_blank" rel="noreferrer">{state.credit.place} · {state.credit.author}</a>
        {' · '}
        {state.credit.licenseUrl ? <a href={state.credit.licenseUrl} target="_blank" rel="noreferrer">{state.credit.license}</a> : state.credit.license}
      </aside>}
      <dialog ref={dialog} className="pulse-dialog" aria-labelledby="pulse-title"
        onClose={() => { setInteracted(true); openButton.current?.focus() }}
        onClick={event => { if (event.target === event.currentTarget) dialog.current?.close() }}>
        <div className="pulse-shell">
          <header className="pulse-header">
            <div>
              <p className="state-kicker">● Painel natural · {state.uf}</p>
              <h2 id="pulse-title">{state.name}</h2>
              <p>Condições do tempo e registros de eventos naturais.</p>
            </div>
            <button type="button" className="pulse-close" aria-label="Fechar painel" autoFocus onClick={() => dialog.current?.close()}>×</button>
          </header>
          <div className="pulse-body"><NaturePanel state={state} /></div>
        </div>
      </dialog>
    </main>
  )
}

export default function EstadoPage() {
  const { slug } = useParams()
  const state = states.find(item => item.slug === slug)
  if (state) return <StateView key={state.uf} state={state} />
  return (
    <main className="state-missing">
      <h1>Estado não encontrado</h1>
      <Link className="state-action" to="/home">← Voltar ao mapa</Link>
    </main>
  )
}
