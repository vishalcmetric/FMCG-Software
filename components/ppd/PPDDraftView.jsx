'use client'

import { FileText } from 'lucide-react'
import { BASIC_FIELDS, TEAM_FIELDS, RICH_SECTIONS, sanitizeHtml } from './ppdFields'

const Empty = () => <span className="text-muted-foreground">—</span>

function Attachments({ items }) {
  if (!items?.length) return null
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {items.map(a => (
        <a key={a.url} href={a.url} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1 text-xs hover:underline">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />{a.filename}
        </a>
      ))}
    </div>
  )
}

/** Read-only rendering of the complete Draft PPD (all 26 fields). */
export default function PPDDraftView({ ppd }) {
  const d = ppd.draft_form || {}
  const att = d.attachments || {}
  const val = (k) => (k === 'project_name' || k === 'brand' ? ppd[k] : d[k])
  const fmtDate = (v) => { try { return v ? new Date(`${v}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '' } catch { return v } }

  const grid = (title, fields) => (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map(([k, label]) => (
          <div key={k}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm font-medium">{(k === 'date' ? fmtDate(val(k)) : val(k)) || <Empty />}</dd>
          </div>
        ))}
      </dl>
    </section>
  )

  return (
    <div className="space-y-6">
      {grid('1. Basic Information', BASIC_FIELDS)}
      {grid('2. Project Team', TEAM_FIELDS)}
      {RICH_SECTIONS.map(([id, heading, fields], si) => (
        <section key={id} className="space-y-3 border-t pt-4">
          <h3 className="text-sm font-semibold text-foreground">{si + 3}. {heading}</h3>
          {fields.map(([k, label]) => (
            <div key={k}>
              {fields.length > 1 && <p className="mb-1 text-xs text-muted-foreground">{label}</p>}
              {d[k]
                ? <div className="rte-content text-sm" dangerouslySetInnerHTML={{ __html: sanitizeHtml(d[k]) }} />
                : <p className="text-sm"><Empty /></p>}
              <Attachments items={att[k]} />
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
