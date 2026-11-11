import { useState } from 'react'
import RowShell from './RowShell'
import { usePlaceSearch } from '../../hooks/useSettings'
import { color, radius } from '../../tokens'
import type { Place, WeatherPlace } from '../../types/weather'

/**
 * Where the weather module looks.
 *
 * A search rather than a "use my location" button, and that is the whole design
 * decision here. Every automatic answer reaches outside the machine — an IP
 * lookup hands a third party the user's approximate address the moment Crest
 * starts, and the Windows location capability is a permission prompt for a
 * feature that has not been asked for yet. Crest's rule for anything that reaches
 * outside itself is that the user asks first (see `notifications.rs`), and a city
 * is two seconds of typing.
 *
 * The rows show region and country because that is what tells thirty Springfields
 * apart, and picking one stores the coordinates it came with — the name is never
 * re-resolved, so the choice made here is the choice that sticks.
 */
export default function WeatherLocation({
  place,
  onChange,
}: {
  place: WeatherPlace | null
  onChange: (place: WeatherPlace | null) => void
}) {
  const [query, setQuery] = useState('')
  const [hovered, setHovered] = useState<string | null>(null)
  const { results, searching, error } = usePlaceSearch(query)
  const [manual, setManual] = useState(false)
  const [coords, setCoords] = useState('')
  const [label, setLabel] = useState('')
  const parsed = parseCoords(coords)

  const pick = (name: string, latitude: number, longitude: number, timezone: string | null) => {
    onChange({ name, latitude, longitude, timezone })
    setQuery('')
    setManual(false)
    setCoords('')
    setLabel('')
  }

  const select = (found: Place) => {
    onChange({
      name: found.detail ? `${found.name}, ${found.detail}` : found.name,
      latitude: found.latitude,
      longitude: found.longitude,
      timezone: found.timezone,
    })
    // The field clears itself: the answer is now shown above it as the chosen
    // place, and leaving the query behind would make the list sit there looking
    // like it was still asking a question.
    setQuery('')
  }

  return (
    <RowShell
      title="Weather location"
      body="Search for your town, tap one of the cities below, or enter exact coordinates. The forecast comes from Open-Meteo and needs no account. Prayer times use this location too."
      icon={
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11z" />
          <circle cx="12" cy="10" r="2.6" />
        </svg>
      }
    >
      {place && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8,
            padding: '7px 8px 7px 11px',
            borderRadius: radius.small,
            background: color.tile,
          }}
        >
          <span
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 12,
              color: color.text.strong,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {place.name}
          </span>
          <span style={{ flex: 'none', fontSize: 10.5, color: color.text.muted, fontVariantNumeric: 'tabular-nums' }}>
            {place.latitude.toFixed(2)}, {place.longitude.toFixed(2)}
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            title="Forget this place"
            style={{
              flex: 'none',
              height: 22,
              padding: '0 8px',
              borderRadius: radius.small,
              fontSize: 11,
              color: color.text.secondary,
              background: color.hover,
            }}
          >
            Clear
          </button>
        </div>
      )}

      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={place ? 'Search for somewhere else…' : 'Search for a town or city…'}
        spellCheck={false}
        aria-label="Search for a place"
        style={{
          width: '100%',
          height: 30,
          border: 'none',
          outline: 'none',
          padding: '0 10px',
          borderRadius: radius.small,
          background: color.inset,
          boxShadow: color.insetShadow,
          fontFamily: 'inherit',
          fontSize: 12,
          color: color.text.primary,
          caretColor: color.accent,
          userSelect: 'text',
          WebkitUserSelect: 'text',
        }}
      />

      {query.trim().length >= 2 && (
        <div style={{ marginTop: 6 }}>
          {results.length === 0 ? (
            <div style={{ padding: '6px 10px', fontSize: 11.5, color: color.text.muted }}>
              {/* "Searching" and "nothing found" are different answers and the
                  second one is only true once the first has finished. */}
              {searching
                ? 'Searching…'
                : error
                  ? `${error}. Pick a city below or enter its coordinates instead.`
                  : 'Nothing found. Try the nearest larger town, or enter coordinates below.'}
            </div>
          ) : (
            results.map((found) => {
              const id = `${found.latitude},${found.longitude}`
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => select(found)}
                  onMouseEnter={() => setHovered(id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 8,
                    padding: '7px 10px',
                    borderRadius: radius.small,
                    textAlign: 'left',
                    background: hovered === id ? color.tile : 'transparent',
                    transition: 'background 90ms linear',
                  }}
                >
                  <span style={{ fontSize: 12, color: color.text.primary, flex: 'none' }}>
                    {found.name}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontSize: 11,
                      color: color.text.muted,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {found.detail}
                  </span>
                </button>
              )
            })
          )}
        </div>
      )}
      {/* Quick picks: works even when the search can't reach its server. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
        {CITIES.map((city) => {
          const active = place !== null && Math.abs(place.latitude - city.lat) < 0.01 && Math.abs(place.longitude - city.lon) < 0.01
          return (
            <button
              key={city.name}
              type="button"
              onClick={() => pick(`${city.name}, Pakistan`, city.lat, city.lon, 'Asia/Karachi')}
              style={{
                height: 24,
                padding: '0 10px',
                borderRadius: radius.pill,
                fontSize: 11,
                fontWeight: 500,
                color: active ? color.onAccent : color.text.body,
                background: active ? color.accent : color.tile,
              }}
            >
              {city.name}
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => setManual(!manual)}
          style={{
            height: 24,
            padding: '0 10px',
            borderRadius: radius.pill,
            fontSize: 11,
            fontWeight: 600,
            color: color.accent,
            background: manual ? color.accentWash : 'transparent',
          }}
        >
          {manual ? 'Hide coordinates' : 'Enter coordinates…'}
        </button>
      </div>

      {manual && (
        <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
          <div style={{ fontSize: 11, lineHeight: 1.45, color: color.text.secondary }}>
            In Google Maps, right-click your exact spot and click the numbers at the top of the menu to copy them, then paste here.
          </div>
          <input
            value={coords}
            onChange={(event) => setCoords(event.target.value)}
            placeholder="32.1617, 74.1883"
            spellCheck={false}
            aria-label="Latitude and longitude"
            style={field}
          />
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Name (optional), e.g. Home"
            spellCheck={false}
            aria-label="Name for this place"
            style={field}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              disabled={!parsed}
              onClick={() => parsed && pick(label.trim() || `${parsed.lat.toFixed(3)}, ${parsed.lon.toFixed(3)}`, parsed.lat, parsed.lon, null)}
              style={{
                height: 26,
                padding: '0 12px',
                borderRadius: radius.small,
                fontSize: 11.5,
                fontWeight: 600,
                color: color.onAccent,
                background: color.accent,
                opacity: parsed ? 1 : 0.4,
              }}
            >
              Use this location
            </button>
            <span style={{ fontSize: 11, color: coords && !parsed ? 'var(--danger)' : color.text.muted }}>
              {coords && !parsed ? 'Paste two numbers: latitude, longitude' : parsed ? `${parsed.lat.toFixed(4)}, ${parsed.lon.toFixed(4)}` : ''}
            </span>
          </div>
        </div>
      )}
    </RowShell>
  )
}

const field = {
  width: '100%',
  height: 30,
  border: 'none',
  outline: 'none',
  padding: '0 10px',
  borderRadius: radius.small,
  background: color.inset,
  boxShadow: color.insetShadow,
  fontFamily: 'inherit',
  fontSize: 12,
  color: color.text.primary,
  caretColor: color.accent,
  userSelect: 'text',
  WebkitUserSelect: 'text',
} as const

/** Pakistan's larger cities, so a location can be set without the search. */
const CITIES = [
  { name: 'Gujranwala', lat: 32.1617, lon: 74.1883 },
  { name: 'Lahore', lat: 31.5204, lon: 74.3587 },
  { name: 'Karachi', lat: 24.8607, lon: 67.0011 },
  { name: 'Islamabad', lat: 33.6844, lon: 73.0479 },
  { name: 'Rawalpindi', lat: 33.5651, lon: 73.0169 },
  { name: 'Faisalabad', lat: 31.4504, lon: 73.135 },
  { name: 'Sialkot', lat: 32.4945, lon: 74.5229 },
  { name: 'Multan', lat: 30.1575, lon: 71.5249 },
  { name: 'Peshawar', lat: 34.0151, lon: 71.5249 },
  { name: 'Quetta', lat: 30.1798, lon: 66.975 },
]

/** "32.1617, 74.1883", "32.1617 74.1883" or "32.1617,74.1883" → numbers in range. */
function parseCoords(text: string): { lat: number; lon: number } | null {
  const m = text.trim().match(/^(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)$/)
  if (!m) return null
  const lat = Number(m[1])
  const lon = Number(m[2])
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null
  return { lat, lon }
}
