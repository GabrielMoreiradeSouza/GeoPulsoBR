import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { State } from '../../data/states'
import { categories, describeWeather, loadLocalEvents, loadQuakes, loadVolcanoes, loadWeather,
  localCategories, sourceLinks, type Category, type EventRow, type LocalCategory, type LocalEvent } from '../../data/nature'

const defaults: Category[] = ['weather', 'quakes', 'wildfires']
const preferenceKey = 'geopulsobr:categories:v1'
const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
const day = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })
const eventDate = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' })
const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' })
const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' })

const periods = [
  { days: 30, label: 'Últimos 30 dias' },
  { days: 90, label: 'Últimos 90 dias' },
  { days: 365, label: 'Últimos 365 dias' },
  { days: 1095, label: 'Últimos 1.095 dias (cerca de 3 anos)' },
]

function readPreferences() {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(preferenceKey) ?? 'null')
    if (Array.isArray(saved)) return categories.filter(({ id }) => saved.includes(id)).map(({ id }) => id)
  } catch { /* Storage can be unavailable in private contexts. */ }
  return defaults
}

type Loader<T> = (state: State, signal: AbortSignal) => Promise<T>
type Request<T> = { attempt: number; load: Loader<T> } & ({ data: T } | { failed: true })

function useSource<T>(state: State, enabled: boolean, load: Loader<T>) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<Request<T>>()
  const current = result?.attempt === attempt && result.load === load ? result : undefined

  useEffect(() => {
    if (!enabled || current) return
    const controller = new AbortController()
    load(state, controller.signal).then(data => {
      if (!controller.signal.aborted) setResult({ attempt, load, data })
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ attempt, load, failed: true })
    })
    return () => controller.abort()
  }, [state, enabled, load, current, attempt])

  return {
    result: current,
    retry: () => setAttempt(value => value + 1),
  }
}

function SourceCard<T>({ title, label, source, request, controls, children }: {
  title: string
  label: string
  source: { name: string; url: string }
  request: ReturnType<typeof useSource<T>>
  controls?: ReactNode
  children: (data: T) => ReactNode
}) {
  return (
    <section className="pulse-card">
      <header className="pulse-card-head">
        <div><h3>{title}</h3><p>{label}</p></div>
        <a href={source.url} target="_blank" rel="noreferrer">{source.name} ↗</a>
      </header>
      {controls}
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

function EventList({ events, historical = false }: { events: EventRow[]; historical?: boolean }) {
  if (!events.length) return <p className="pulse-status">Nenhum registro no catálogo para esse recorte.</p>
  return (
    <ul className="pulse-events">{events.map(event => (
      <li key={event.id}>
        <a href={externalLink(event.url)} target="_blank" rel="noreferrer">{event.title} ↗</a>
        <span>{(historical ? eventDate : day).format(new Date(event.date))} · {event.active ? 'Em aberto' : 'Encerrado'}</span>
      </li>
    ))}</ul>
  )
}

function LocalHistory({ events, selected }: { events: LocalEvent[]; selected: LocalCategory[] }) {
  const [month, setMonth] = useState('')
  const matching = events.filter(event => selected.some(id => event.categories.includes(id)))
  const counts = new Map<string, number>()
  for (const event of matching) {
    for (const key of event.observations.keys()) counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const months = [...counts.keys()].sort().reverse()
  const max = Math.max(1, ...counts.values())
  const activeMonth = counts.has(month) ? month : ''
  const visible = activeMonth
    ? matching.flatMap(event => {
        const date = event.observations.get(activeMonth)
        return date ? [{ ...event, date }] : []
      }).sort((a, b) => b.date.localeCompare(a.date))
    : matching

  return (
    <>
      {months.length > 0 && (
        <details className="pulse-history">
          <summary>Histórico por mês{activeMonth && ' · ' + monthLabel.format(new Date(activeMonth + '-01'))}</summary>
          <p>Escolha um mês para filtrar a lista. Cada barra conta os eventos observados naquele mês.</p>
          <button type="button" aria-pressed={!activeMonth} onClick={() => setMonth('')}>Todo o período</button>
          <ul aria-label="Meses com registros">
            {months.map(key => {
              const count = counts.get(key) ?? 0
              return (
                <li key={key}>
                  <button type="button" aria-pressed={activeMonth === key} onClick={() => setMonth(key)}>
                    <span>{monthLabel.format(new Date(key + '-01'))}</span>
                    <span className="pulse-history-track" aria-hidden="true"><span style={{ width: count / max * 100 + '%' }} /></span>
                    <span>{count} <span className="pulse-history-count">{count === 1 ? 'evento' : 'eventos'}</span></span>
                  </button>
                </li>
              )
            })}
          </ul>
        </details>
      )}
      {selected.map(id => (
        <section key={id} className="pulse-event-group">
          <h4>{localCategories[id]}</h4>
          <EventList events={visible.filter(event => event.categories.includes(id))} historical />
        </section>
      ))}
    </>
  )
}

export default function NaturePanel({ state }: { state: State }) {
  const [selected, setSelected] = useState<Category[]>(readPreferences)
  const [days, setDays] = useState(30)
  const local = selected.filter((id): id is LocalCategory => Object.hasOwn(localCategories, id))
  const weather = useSource(state, selected.includes('weather'), loadWeather)
  const quakes = useSource(state, selected.includes('quakes'), loadQuakes)
  const loadHistory = useCallback((state: State, signal: AbortSignal) => loadLocalEvents(state, signal, days), [days])
  const localEvents = useSource(state, Boolean(local.length), loadHistory)
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
          <SourceCard title="Eventos no estado" label={state.uf + ' · catálogo de eventos observados'} source={sources.eonet} request={localEvents}
            controls={
              <div className="pulse-period">
                <label htmlFor="pulse-period">Período dos eventos</label>
                <select id="pulse-period" value={days} onChange={event => setDays(Number(event.target.value))}>
                  {periods.map(({ days, label }) => <option key={days} value={days}>{label}</option>)}
                </select>
                <p>A cobertura do catálogo varia por região e categoria.</p>
              </div>
            }>
            {events => <LocalHistory events={events} selected={local} />}
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
