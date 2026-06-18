import Globe from 'react-globe.gl'
import { useEffect, useState, useRef } from 'react'

export const HomePages = () => {
   const [brazilData, setBrazilData] = useState({ features: [] })
  const globeRef = useRef<any>(null)

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

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0a0a' }}>
      <Globe
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        polygonsData={brazilData.features}
        polygonAltitude={0.01}
        polygonCapColor={() => 'rgba(29, 158, 117, 0.3)'}
        polygonSideColor={() => 'rgba(29, 158, 117, 0.6)'}
        polygonStrokeColor={() => '#1D9E75'}
        polygonLabel={(d: any) => `<b>${d.properties.name}</b>`}
        width={window.innerWidth}
        height={window.innerHeight}
      />
    </div>
  )
}

export default HomePages