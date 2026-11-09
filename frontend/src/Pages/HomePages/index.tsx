import Globe, { type GlobeMethods } from 'react-globe.gl'
import { Component, useEffect, useState, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { bounds, loadStateFeatures, type StateFeature } from '../../data/geography'
import { stateByUf, states } from '../../data/states'
import earth from '../../assets/earth-dark.jpg'
import sky from '../../assets/night-sky.png'
import './home.css'

const viewport = () => ({ width: window.innerWidth, height: window.innerHeight })
const sortedStates = [...states].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

class GlobeBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? <p className="map-unavailable" role="status">Globo indisponível. Use a lista de estados.</p> : this.props.children
  }
}

function Explorer() {
  const [features, setFeatures] = useState<StateFeature[]>([])
  const [mapError, setMapError] = useState(false)
  const [size, setSize] = useState(viewport)
  const [selected, setSelected] = useState('')
  const [ready, setReady] = useState(false)
  const globe = useRef<GlobeMethods | undefined>(undefined)
  const timer = useRef<number | undefined>(undefined)
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true
    loadStateFeatures().then(data => { if (mounted) setFeatures(data) })
      .catch(() => { if (mounted) setMapError(true) })
    const resize = () => setSize(viewport())
    window.addEventListener('resize', resize)
    return () => {
      mounted = false
      window.removeEventListener('resize', resize)
      window.clearTimeout(timer.current)
    }
  }, [])

  function openState(uf: string) {
    const state = stateByUf.get(uf)
    if (!state || selected) return
    if (state.image) new Image().src = state.image
    const feature = features.find(item => item.properties.uf === uf)
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!feature || !ready || !globe.current || reducedMotion) {
      navigate('/estado/' + state.slug, { viewTransition: !reducedMotion })
      return
    }

    setSelected(uf)
    const { west, east, south, north } = bounds(feature.geometry)
    globe.current.pointOfView({ lat: (south + north) / 2, lng: (west + east) / 2, altitude: 0.08 }, 1200)
    timer.current = window.setTimeout(() => navigate('/estado/' + state.slug, { viewTransition: true }), 1300)
  }

  return (
    <main className="explorer">
      {!mapError && <GlobeBoundary><Globe
        ref={globe}
        globeImageUrl={earth}
        backgroundImageUrl={sky}
        onGlobeReady={() => {
          setReady(true)
          globe.current?.pointOfView({ lat: -14.235, lng: -51.9253, altitude: 1.2 },
            window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1000)
        }}
        polygonsData={features}
        polygonAltitude={d => (d as StateFeature).properties.uf === selected ? 0.06 : 0.01}
        polygonCapColor={d => (d as StateFeature).properties.uf === selected ? 'rgba(29,158,117,0.7)' : 'rgba(29,158,117,0.2)'}
        polygonSideColor={() => 'rgba(29,158,117,0.4)'}
        polygonStrokeColor={() => '#1d9e75'}
        polygonLabel={d => stateByUf.get((d as StateFeature).properties.uf)?.name ?? ''}
        onPolygonClick={d => openState((d as StateFeature).properties.uf)}
        {...size}
      /></GlobeBoundary>}
      <header className="explorer-card">
        <p className="explorer-brand"><span aria-hidden="true">◉</span> GeoPulsoBR</p>
        <h1>Explore o Brasil</h1>
        <p>Escolha um estado para ver o tempo e os eventos naturais.</p>
        {mapError && <p role="status">Mapa indisponível. Escolha pela lista abaixo.</p>}
        <label htmlFor="state-select">Unidade federativa</label>
        <select id="state-select" value={selected} disabled={Boolean(selected)} onChange={event => openState(event.target.value)}>
          <option value="" disabled>Selecione um estado</option>
          {sortedStates.map(state => <option key={state.uf} value={state.uf}>{state.name}</option>)}
        </select>
        {selected && <p role="status">Abrindo {stateByUf.get(selected)?.name}…</p>}
      </header>
    </main>
  )
}

export default Explorer
