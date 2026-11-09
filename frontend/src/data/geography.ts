export type Position = number[]
type Ring = Position[]
type Polygon = Ring[]
export type Area = { type: 'Polygon'; coordinates: Polygon } | { type: 'MultiPolygon'; coordinates: Polygon[] }
export type StateFeature = { type: 'Feature'; properties: { uf: string }; geometry: Area }

let pending: Promise<StateFeature[]> | undefined

export function loadStateFeatures() {
  pending ??= fetch(import.meta.env.BASE_URL + 'map/brazil-states.json')
    .then(response => {
      if (!response.ok) throw new Error('Limites dos estados indisponíveis')
      return response.json() as Promise<{ features: StateFeature[] }>
    })
    .then(data => data.features)
    .catch(error => { pending = undefined; throw error })
  return pending
}

function polygons(area: Area) {
  return area.type === 'Polygon' ? [area.coordinates] : area.coordinates
}

export function bounds(area: Area) {
  let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity
  for (const polygon of polygons(area)) {
    for (const [lng, lat] of polygon[0]) {
      west = Math.min(west, lng)
      south = Math.min(south, lat)
      east = Math.max(east, lng)
      north = Math.max(north, lat)
    }
  }
  return { west, south, east, north }
}

function inRing([x, y]: Position, ring: Ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export function contains(area: Area, point: Position) {
  return polygons(area).some(([outer, ...holes]) => inRing(point, outer) && !holes.some(hole => inRing(point, hole)))
}
