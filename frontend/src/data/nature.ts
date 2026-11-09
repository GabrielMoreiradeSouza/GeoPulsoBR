import { booleanIntersects } from '@turf/boolean-intersects'
import type { State } from './states'
import { bounds, contains, loadStateFeatures, type Area, type Position } from './geography'

export const sourceLinks = {
  weather: 'https://open-meteo.com/',
  quakes: 'https://earthquake.usgs.gov/earthquakes/search/',
  eonet: 'https://eonet.gsfc.nasa.gov/',
}

export const localCategories = {
  wildfires: 'Queimadas',
  severeStorms: 'Tempestades',
  floods: 'Inundações',
  drought: 'Secas',
  landslides: 'Deslizamentos',
  tempExtremes: 'Temperaturas extremas',
  dustHaze: 'Poeira e névoa',
  snow: 'Neve',
  waterColor: 'Alterações na água',
} as const

export type LocalCategory = keyof typeof localCategories
export type Category = 'weather' | 'quakes' | 'volcanoes' | LocalCategory

export const categories: { id: Category; label: string }[] = [
  { id: 'weather', label: 'Tempo' },
  { id: 'quakes', label: 'Terremotos' },
  ...Object.entries(localCategories).map(([id, label]) => ({ id: id as LocalCategory, label })),
  { id: 'volcanoes', label: 'Vulcões · Mundo' },
]

type Weather = {
  current: { time: string; temperature_2m: number | null; apparent_temperature: number | null; relative_humidity_2m: number | null; weather_code: number | null; wind_speed_10m: number | null }
  daily: { time: string[]; temperature_2m_min: (number | null)[]; temperature_2m_max: (number | null)[]; precipitation_probability_max: (number | null)[] }
}

type Quake = {
  id: string
  properties: { mag: number | null; place: string | null; time: number; url: string }
  geometry: { coordinates: Position }
}

type NaturalEvent = {
  id: string
  title: string
  link: string
  closed?: string | null
  sources: { url: string }[]
  categories: { id: string }[]
  geometry: (({ type: 'Point'; coordinates: Position } | Area) & { date: string })[]
}

const eonetUrl = 'https://eonet.gsfc.nasa.gov/api/v3/events'

async function getJson<T>(endpoint: string, params: Record<string, string>, signal: AbortSignal): Promise<T> {
  const response = await fetch(endpoint + '?' + new URLSearchParams(params), {
    signal: AbortSignal.any([signal, AbortSignal.timeout(12_000)]),
  })
  if (!response.ok) throw new Error('HTTP ' + response.status)
  return response.json() as Promise<T>
}

async function stateArea(state: State) {
  const feature = (await loadStateFeatures()).find(({ properties }) => properties.uf === state.uf)
  if (!feature) throw new Error('Limites indisponíveis para ' + state.uf)
  return feature.geometry
}

export function loadWeather(state: State, signal: AbortSignal) {
  return getJson<Weather>('https://api.open-meteo.com/v1/forecast', {
    latitude: String(state.latitude),
    longitude: String(state.longitude),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m',
    daily: 'temperature_2m_min,temperature_2m_max,precipitation_probability_max',
    forecast_days: '3',
    timezone: 'auto',
  }, signal)
}

export async function loadQuakes(state: State, signal: AbortSignal) {
  const area = await stateArea(state)
  const { west, south, east, north } = bounds(area)
  const { features } = await getJson<{ features: Quake[] }>('https://earthquake.usgs.gov/fdsnws/event/1/query', {
    format: 'geojson', eventtype: 'earthquake', orderby: 'time',
    starttime: new Date(Date.now() - 30 * 86_400_000).toISOString(),
    minlatitude: String(south), minlongitude: String(west),
    maxlatitude: String(north), maxlongitude: String(east),
  }, signal)
  return features.filter(event => contains(area, event.geometry.coordinates))
}

function eventRow(event: NaturalEvent, date: string) {
  return { id: event.id, title: event.title, date, active: !event.closed, url: event.sources[0]?.url ?? event.link }
}

export type EventRow = ReturnType<typeof eventRow>

function inLastDays(date: string, days: number) {
  return Date.parse(date) >= Date.now() - days * 86_400_000
}

export async function loadLocalEvents(state: State, signal: AbortSignal, days: number) {
  const area = await stateArea(state)
  const { west, south, east, north } = bounds(area)
  const now = Date.now()
  const start = new Date(now - (days - 1) * 86_400_000).toISOString().slice(0, 10)
  const end = new Date(now).toISOString().slice(0, 10)
  const { events } = await getJson<{ events: NaturalEvent[] }>(eonetUrl, {
    bbox: [west, north, east, south].join(','),
    category: Object.keys(localCategories).join(','), status: 'all', start, end,
  }, signal)
  return events.flatMap(event => {
    const observations = new Map<string, string>()
    for (const shape of event.geometry) {
      const day = shape.date.slice(0, 10)
      if (day < start || day > end) continue
      const intersects = shape.type === 'Point' ? contains(area, shape.coordinates) : booleanIntersects(area, shape)
      if (!intersects) continue

      const month = day.slice(0, 7)
      if (shape.date > (observations.get(month) ?? '')) observations.set(month, shape.date)
    }
    const date = [...observations.values()].sort().at(-1)
    return date ? [{ ...eventRow(event, date), categories: event.categories.map(({ id }) => id), observations }] : []
  }).sort((a, b) => b.date.localeCompare(a.date))
}

export type LocalEvent = Awaited<ReturnType<typeof loadLocalEvents>>[number]

export async function loadVolcanoes(_state: State, signal: AbortSignal) {
  const { events } = await getJson<{ events: NaturalEvent[] }>(eonetUrl, {
    category: 'volcanoes', status: 'open', days: '30',
  }, signal)
  return events.flatMap(event => {
    const date = event.geometry.map(shape => shape.date).filter(date => inLastDays(date, 30)).sort().at(-1)
    return date ? [eventRow(event, date)] : []
  }).sort((a, b) => b.date.localeCompare(a.date))
}

export function describeWeather(code: number | null) {
  if (code === null) return 'Condição indisponível'
  if (code === 0) return 'Céu limpo'
  if (code === 1 || code === 2) return 'Parcialmente nublado'
  if (code === 3) return 'Nublado'
  if (code === 45 || code === 48) return 'Neblina'
  if (code >= 95) return 'Trovoadas'
  if (code >= 85 || (code >= 71 && code <= 77)) return 'Neve'
  if (code >= 61) return 'Chuva'
  if (code >= 51) return 'Garoa'
  return 'Condição indisponível'
}
