import Globe from 'react-globe.gl'
import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

export const HomePages = () => {
  const [brazilData, setBrazilData] = useState({ features: [] })
  const [selected, setSelected] = useState<string | null>(null)
  const globeRef = useRef<any>(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson')
      .then(r => r.json())
      .then(setBrazilData)
  }, [])

  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: -14.2350, lng: -51.9253, altitude: 1.2 }, 1000)
    }
  }, [brazilData])

  function getCentroid(geometry: any): { lat: number; lng: number } {
    const coords = geometry.type === 'MultiPolygon'
      ? geometry.coordinates.flat(2)
      : geometry.coordinates.flat(1)

    const lat = coords.reduce((sum: number, c: number[]) => sum + c[1], 0) / coords.length
    const lng = coords.reduce((sum: number, c: number[]) => sum + c[0], 0) / coords.length

    return { lat, lng }
  }

  function handleClick(polygon: any) {
    const name = polygon.properties.name
    setSelected(name)

    const { lat, lng } = getCentroid(polygon.geometry)
    globeRef.current.pointOfView({ lat, lng, altitude: 0.08 }, 1200)

    
    setTimeout(() => {
      const slug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-')

      navigate(`/estado/${slug}`, { viewTransition: true })
    }, 1300)
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0a0a', position: 'relative' }}>
      <Globe
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        polygonsData={brazilData.features}
        polygonAltitude={(d: any) => d.properties.name === selected ? 0.06 : 0.01}
        polygonCapColor={(d: any) =>
          d.properties.name === selected
            ? 'rgba(29, 158, 117, 0.7)'
            : 'rgba(29, 158, 117, 0.2)'
        }
        polygonSideColor={() => 'rgba(29, 158, 117, 0.4)'}
        polygonStrokeColor={() => '#1D9E75'}
        polygonLabel={(d: any) => `<b style="color:#1D9E75">${d.properties.name}</b>`}
        onPolygonClick={(polygon: any) => handleClick(polygon)}
        width={window.innerWidth}
        height={window.innerHeight}
      />

      {selected && (
        <div style={{
          position: 'absolute',
          top: 24,
          left: 24,
          background: 'rgba(10,10,10,0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(29,158,117,0.4)',
          borderRadius: 12,
          padding: '16px 20px',
          color: '#fff',
          minWidth: 200,
        }}>
          <p style={{ margin: 0, fontSize: 11, color: '#1D9E75' }}>ESTADO SELECIONADO</p>
          <h2 style={{ margin: '4px 0 0', fontSize: 20 }}>{selected}</h2>
          <p style={{ margin: '6px 0 0', fontSize: 11, color: '#555' }}>navegando...</p>
        </div>
      )}
    </div>
  )
}

export default HomePages