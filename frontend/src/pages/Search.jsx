import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { searchApi } from '../services/search.js'
import { useDebouncedValue } from '../utils/useDebouncedValue.js'
import { useToastFeedback } from '../utils/useToastFeedback.js'

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams()
  const qParam = searchParams.get('q') || ''

  const [q, setQ] = useState(qParam)
  const debouncedQ = useDebouncedValue(q, 300)

  const [results, setResults] = useState({ leads: [], customers: [], deals: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  useToastFeedback({ error })

  useEffect(() => setQ(qParam), [qParam])

  useEffect(() => {
    const next = new URLSearchParams()
    if (debouncedQ.trim()) next.set('q', debouncedQ.trim())
    if (next.toString() !== searchParams.toString()) {
       setSearchParams(next, { replace: true })
    }
  }, [debouncedQ, searchParams, setSearchParams])

  useEffect(() => {
    if (!qParam.trim()) {
      setResults({ leads: [], customers: [], deals: [] })
      return
    }

    setLoading(true)
    setError('')
    searchApi.global(qParam.trim())
      .then(setResults)
      .catch((e) => setError(e.message || 'Search failed'))
      .finally(() => setLoading(false))
  }, [qParam])

  return (
    <div className="stack">
      <div className="row">
        <h1>Search</h1>
        <div className="muted">Customers + Leads</div>
      </div>

      <div className="filters">
        <input
          className="input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type to search name/email/phone/source..."
        />
        <div />
        <div />
      </div>

      {error ? <div className="alert error">{error}</div> : null}

      {!qParam.trim() ? <div className="muted">Enter a search term.</div> : null}
      {loading ? <div className="muted">Searching...</div> : null}

      {qParam.trim() && !loading ? (
        <div className="grid3">
          {/* CUSTOMERS */}
          <div className="card stack">
            <div className="row">
              <h3>Customers</h3>
              <Link className="btn" to={`/customers?q=${encodeURIComponent(qParam.trim())}`}>
                List
              </Link>
            </div>
            {results.customers.length ? (
              <div className="stack small-gap">
                {results.customers.map((c) => (
                  <Link key={c.id} className="resultLink" to={`/customers/${c.id}`}>
                    <strong>{c.name}</strong>
                    <div className="muted small">{c.email || c.phone || 'No contact info'}</div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="muted small">0 matches.</div>
            )}
          </div>

          {/* LEADS */}
          <div className="card stack">
            <div className="row">
              <h3>Leads</h3>
              <Link className="btn" to={`/leads?q=${encodeURIComponent(qParam.trim())}`}>
                List
              </Link>
            </div>
            {results.leads.length ? (
              <div className="stack small-gap">
                {results.leads.map((l) => (
                  <Link key={l.id} className="resultLink" to={`/leads/${l.id}`}>
                    <strong>{l.name}</strong>
                    <div className="muted small">{l.status} &bull; {l.source}</div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="muted small">0 matches.</div>
            )}
          </div>

          {/* DEALS */}
          <div className="card stack">
            <div className="row">
              <h3>Deals</h3>
              <Link className="btn" to={`/deals?q=${encodeURIComponent(qParam.trim())}`}>
                List
              </Link>
            </div>
            {results.deals.length ? (
              <div className="stack small-gap">
                {results.deals.map((d) => (
                  <Link key={d.id} className="resultLink" to={`/deals/${d.id}`}>
                    <strong>{d.name}</strong>
                    <div className="muted small">{d.status} &bull; {d.customer_id?.name || 'No Customer'}</div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="muted small">0 matches.</div>
            )}
          </div>
        </div>
      ) : null}

      <style>{`
        .grid3 {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 24px;
        }
        .resultLink {
          display: block;
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid var(--border);
          text-decoration: none;
          color: inherit;
        }
        .resultLink:hover { background: rgba(55, 125, 255, 0.05); border-color: var(--primary); }
        .small-gap { gap: 8px; }
      `}</style>
    </div>
  )
}
