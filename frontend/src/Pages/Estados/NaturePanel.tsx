import { useEffect, useState, type ReactNode } from 'react'
import type { State } from '../../data/states'
import { categories, describeWeather, loadLocalEvents, loadQuakes, loadVolcanoes, loadWeather,
  localCategories, sourceLinks, type Category, type EventRow, type LocalCategory } from '../../data/nature'

const defaults: Category[] = ['weather', 'quakes', 'wildfires']
const preferenceKey = 'geopulsobr:categories:v1'
const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
const day = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })
const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' })

function readPreferences() {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(preferenceKey) ?? 'null')
    if (Array.isArray(saved)) return categories.filter(({ id }) => saved.includes(id)).map(({ id }) => id)
  } catch { /* Storage can be unavailable in private contexts. */ }
  return defaults
}

type Request<T> = { attempt: number; data: T } | { attempt: number; failed: true }
type Loader<T> = (state: State, signal: AbortSignal) => Promise<T>

function useSource<T>(state: State, enabled: boolean, load: Loader<T>) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<Request<T>>()
  const current = result?.attempt === attempt ? result : undefined

  useEffect(() => {
    if (!enabled || current) return
    const controller = new AbortController()
    load(state, controller.signal).then(data => {
      if (!controller.signal.aborted) setResult({ attempt, data })
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ attempt, failed: true })
    })
    return () => controller.abort()
  }, [state, enabled, load, current, attempt])

  return {
    result: current,
    retry: () => setAttempt(value => value + 1),
  }
}

function SourceCard<T>({ title, label, source, request, children }: {
  title: string
  label: string
  source: { name: string; url: string }
  request: ReturnType<typeof useSource<T>>
  children: (data: T) => ReactNode
}) {
  return (
    <section className="pulse-card">
      <header className="pulse-card-head">
        <div><h3>{title}</h3><p>{label}</p></div>
        <a href={source.url} target="_blank" rel="noreferrer">{source.name} ↗</a>
      </header>
      {!request.result ? <p className="pulse-status" role="status">Buscando dados…</p>
        : 'failed' in request.result ? <div className="pulse-status">
          <p role="status">Fonte indisponível no momento.</p>
          <button className="pulse-action" onClick={request.retry}>Tentar novamente</button>
        </div> : children(request.result.data)}
    </section>
  )
}

const sources = {
  weather: { name: 'Open-Meteo', url: sourceLinks.weather },
  quakes: { name: 'USGS', url: sourceLinks.quakes },
  eonet: { name: 'NASA EONET', url: sourceLinks.eonet },
}

function format(value: number | null, unit: string) {
  return value == null ? '—' : number.format(value) + unit
}

function externalLink(url: string) {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : undefined
  } catch { return undefined }
}

function EventList({ events }: { events: EventRow[] }) {
  if (!events.length) return <p className="pulse-status">Nenhum registro encontrado no período.</p>
  return (
    <ul className="pulse-events">{events.map(event => (
      <li key={event.id}>
        <a href={externalLink(event.url)} target="_blank" rel="noreferrer">{event.title} ↗</a>
        <span>{day.format(new Date(event.date))} · {event.active ? 'Em aberto' : 'Encerrado'}</span>
      </li>
    ))}</ul>
  )
}

export default function NaturePanel({ state }: { state: State }) {
  const [selected, setSelected] = useState<Category[]>(readPreferences)
  const local = selected.filter((id): id is LocalCategory => Object.hasOwn(localCategories, id))
  const weather = useSource(state, selected.includes('weather'), loadWeather)
  const quakes = useSource(state, selected.includes('quakes'), loadQuakes)
  const localEvents = useSource(state, Boolean(local.length), loadLocalEvents)
  const volcanoes = useSource(state, selected.includes('volcanoes'), loadVolcanoes)

  function toggle(category: Category) {
    const next = selected.includes(category) ? selected.filter(id => id !== category) : [...selected, category]
    setSelected(next)
    try { localStorage.setItem(preferenceKey, JSON.stringify(next)) } catch { /* Preferences still work in this session. */ }
  }

  return (
    <>
      <fieldset className="pulse-filters">
        <legend>O que acompanhar</legend>
        <div>{categories.map(({ id, label }) => (
          <button type="button" key={id} aria-pressed={selected.includes(id)} onClick={() => toggle(id)}>
            <span aria-hidden="true">{selected.includes(id) ? '✓' : '+'}</span> {label}
          </button>
        ))}</div>
      </fieldset>
      <div className="pulse-cards">
        {!selected.length && <p className="pulse-status">Escolha uma categoria para ver os dados.</p>}
        {selected.includes('weather') && (
          <SourceCard title="Tempo agora" label={state.capital + ' · condições estimadas'} source={sources.weather} request={weather}>
            {({ current, daily }) => (
              <>
                <div className="pulse-weather-now">
                  <strong>{format(current.temperature_2m, ' °C')}</strong>
                  <div><b>{describeWeather(current.weather_code)}</b><p>Hora local: {current.time.slice(11, 16)}</p></div>
                </div>
                <dl className="pulse-metrics">
                  <div><dt>Sensação</dt><dd>{format(current.apparent_temperature, ' °C')}</dd></div>
                  <div><dt>Umidade</dt><dd>{format(current.relative_humidity_2m, '%')}</dd></div>
                  <div><dt>Vento</dt><dd>{format(current.wind_speed_10m, ' km/h')}</dd></div>
                </dl>
                <ul className="pulse-forecast" aria-label="Previsão para três dias">
                  {daily.time.map((date, i) => (
                    <li key={date}>
                      <b>{i === 0 ? 'Hoje' : weekday.format(new Date(date))}</b>
                      <span>{format(daily.temperature_2m_min[i], '°')} / {format(daily.temperature_2m_max[i], '°')}</span>
                      <small>Chuva: {format(daily.precipitation_probability_max[i], '%')}</small>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </SourceCard>
        )}
        {selected.includes('quakes') && (
          <SourceCard title="Terremotos" label={state.uf + ' · últimos 30 dias'} source={sources.quakes} request={quakes}>
            {events => events.length ? <ul className="pulse-events">{events.map(event => (
              <li key={event.id}>
                <a href={externalLink(event.properties.url)} target="_blank" rel="noreferrer">
                  {event.properties.place ?? 'Detalhes do terremoto'} ↗
                </a>
                <span>{day.format(event.properties.time)} · Magnitude {format(event.properties.mag, '')} · Prof. {format(event.geometry.coordinates[2], ' km')}</span>
              </li>
            ))}</ul> : <p className="pulse-status">Nenhum epicentro registrado no estado nesse período.</p>}
          </SourceCard>
        )}
        {local.length > 0 && (
          <SourceCard title="Eventos no estado" label={state.uf + ' · últimos 30 dias'} source={sources.eonet} request={localEvents}>
            {events => <div className="pulse-event-groups">{local.map(id => (
              <section key={id} className="pulse-event-group">
                <h4>{localCategories[id]}</h4>
                <EventList events={events.filter(event => event.categories.includes(id))} />
              </section>
            ))}</div>}
          </SourceCard>
        )}
        {selected.includes('volcanoes') && (
          <SourceCard title="Atividade vulcânica" label="Mundo · eventos em aberto com registros nos últimos 30 dias" source={sources.eonet} request={volcanoes}>
            {events => <EventList events={events} />}
          </SourceCard>
        )}
      </div>
      <p className="pulse-footnote">A cobertura varia por fonte. Para alertas no Brasil, consulte o <a href="https://alertas2.inmet.gov.br/" target="_blank" rel="noreferrer">INMET ↗</a>.</p>
    </>
  )
}
