'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, Save, RefreshCw, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import RichTextEditor from './RichTextEditor'
import { TEAM_FIELDS, RICH_SECTIONS, DRAFT_KEYS } from './ppdFields'

/* Draft PPD Form Overview (source: Zydus Wellness spec, section 1) — 26 fields */
const NAV = [['basic', 'Basic Information'], ['team', 'Project Team'], ...RICH_SECTIONS.map(([id, h]) => [id, h])]

const emptyForm = () => ({ project_name: '', brand: '', ...Object.fromEntries(DRAFT_KEYS.map(k => [k, ''])) })

function Section({ id, title, children }) {
  return (
    <Card id={`ppd-sec-${id}`} className="scroll-mt-24">
      <CardHeader className="pb-3"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  )
}

async function uploadFile(ppdId, file, token) {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(`/api/ppd/${ppdId}/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || `Upload failed: ${file.name}`) }
  const d = await res.json()
  return { url: d.url, filename: d.filename, size: d.size }
}

/**
 * Reusable full-page Draft PPD form.
 * mode 'create' → POST /api/ppd ; mode 'edit' → PUT /api/ppd/:id
 */
export default function DraftPPDForm({ mode = 'create', ppd, token, apiCall, onBack, onSaved, canSubmit }) {
  const isEdit = mode === 'edit' && ppd
  const [form, setForm] = useState(() => {
    const f = emptyForm()
    if (!isEdit) return f
    const d = ppd.draft_form || {}
    return { ...f, ...Object.fromEntries(DRAFT_KEYS.map(k => [k, d[k] || ''])), project_name: ppd.project_name || '', brand: ppd.brand || '' }
  })
  const [attachments, setAttachments] = useState(() => (isEdit && ppd.draft_form?.attachments) || {})
  const [pending, setPending] = useState({})             // create mode: { field: [File] }
  const [team, setTeam] = useState([])
  const [saving, setSaving] = useState(false)
  const [active, setActive] = useState('basic')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    apiCall('/api/ppd/team-options', { token }).then(setTeam).catch(() => setTeam([]))
  }, [apiCall, token])

  // Highlight current section in the left nav
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => e.isIntersecting && setActive(e.target.id.replace('ppd-sec-', ''))),
      { rootMargin: '-120px 0px -60% 0px' },
    )
    NAV.forEach(([id]) => { const el = document.getElementById(`ppd-sec-${id}`); if (el) obs.observe(el) })
    return () => obs.disconnect()
  }, [])

  const teamNames = useMemo(() => [...new Set(team.map(u => u.name).filter(Boolean))], [team])

  const handleAttach = async (field, files) => {
    if (!isEdit) {
      setPending(p => ({ ...p, [field]: [...(p[field] || []), ...files] }))
      return
    }
    for (const file of files) {
      try {
        const a = await uploadFile(ppd.ppd_id, file, token)
        setAttachments(prev => ({ ...prev, [field]: [...(prev[field] || []), a] }))
        toast.success(`Attached ${a.filename}`)
      } catch (err) { toast.error(err.message) }
    }
  }

  const removeAttachment = (field, idx) => {
    const saved = attachments[field] || []
    if (idx < saved.length) setAttachments(prev => ({ ...prev, [field]: saved.filter((_, i) => i !== idx) }))
    else setPending(p => ({ ...p, [field]: (p[field] || []).filter((_, i) => i !== idx - saved.length) }))
  }

  const fieldAttachments = (field) => [
    ...(attachments[field] || []),
    ...(pending[field] || []).map(f => ({ filename: f.name, pending: true })),
  ]

  const buildDraft = (att) => ({ ...Object.fromEntries(DRAFT_KEYS.map(k => [k, form[k]])), attachments: att })

  // submit=true: Source Team sends the PPD to PM + R&D Head + F&D Team Head
  const handleSave = async (submit = false) => {
    // Existing API rules: project_name and brand are required
    if (!form.project_name.trim()) return toast.error('Project Name is required')
    if (!form.brand.trim()) return toast.error('Brand is required')
    setSaving(true)
    try {
      if (isEdit) {
        await apiCall(`/api/ppd/${ppd.ppd_id}`, {
          method: 'PUT', token,
          body: { project_name: form.project_name.trim(), brand: form.brand.trim(), draft_form: buildDraft(attachments) },
        })
        if (submit) await apiCall(`/api/ppd/${ppd.ppd_id}/submit`, { method: 'POST', token })
        toast.success(submit ? `PPD submitted: ${ppd.ppd_id}` : `Draft saved: ${ppd.ppd_id}`)
        onSaved?.(ppd.ppd_id)
        return
      }
      const created = await apiCall('/api/ppd', {
        method: 'POST', token,
        body: { project_name: form.project_name.trim(), brand: form.brand.trim(), draft_form: buildDraft({}), submit },
      })
      // Upload files queued before the PPD existed, then store their links on the draft
      const queued = Object.entries(pending).filter(([, fs]) => fs.length)
      if (queued.length) {
        const att = {}
        for (const [field, files] of queued) {
          for (const file of files) {
            try { (att[field] ||= []).push(await uploadFile(created.ppd_id, file, token)) }
            catch (err) { toast.error(err.message) }
          }
        }
        await apiCall(`/api/ppd/${created.ppd_id}`, { method: 'PUT', token, body: { draft_form: buildDraft(att) } })
      }
      toast.success(submit ? `PPD submitted: ${created.ppd_id}` : `Draft PPD created: ${created.ppd_id}`)
      onSaved?.(created.ppd_id)
    } catch (err) {
      toast.error(err.message)
    } finally { setSaving(false) }
  }

  const goTo = (id) => document.getElementById(`ppd-sec-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const showSubmit = canSubmit && (!isEdit || ppd.status === 'Draft')
  const saveBtn = (
    <div className="flex gap-2">
      <Button variant={showSubmit ? 'outline' : 'default'} onClick={() => handleSave(false)} disabled={saving}>
        {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
        Save as Draft
      </Button>
      {showSubmit && (
        <Button onClick={() => handleSave(true)} disabled={saving}>
          <Send className="h-4 w-4 mr-2" />Submit PPD
        </Button>
      )}
    </div>
  )

  return (
    <div className="space-y-4">
      {/* ── Sticky top bar ── */}
      <div className="sticky top-0 z-20 -mx-1 flex flex-wrap items-center justify-between gap-3 border-b bg-background/95 px-1 py-3 backdrop-blur">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate">{isEdit ? 'Edit Draft PPD' : 'Create Draft PPD'}</h1>
            <p className="text-xs text-muted-foreground truncate">
              {isEdit ? `${ppd.ppd_id} · ${ppd.ppd_version}` : 'Product Development Plan — draft'}
            </p>
          </div>
        </div>
        {saveBtn}
      </div>

      <div className="flex gap-6">
        {/* ── Left section navigation ── */}
        <nav className="hidden lg:block w-56 shrink-0">
          <ul className="sticky top-24 space-y-0.5 text-sm">
            {NAV.map(([id, label], i) => (
              <li key={id}>
                <button type="button" onClick={() => goTo(id)}
                  className={`w-full rounded-md px-3 py-1.5 text-left transition-colors ${active === id ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                  <span className="mr-2 text-xs tabular-nums opacity-60">{i + 1}.</span>{label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 flex-1 space-y-5">
          {/* 1. Basic Information */}
          <Section id="basic" title="1. Basic Information">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ppd-project-name">Project Name <span className="text-red-500">*</span></Label>
                <Input id="ppd-project-name" value={form.project_name} onChange={e => set('project_name', e.target.value)} placeholder="e.g. Complan Pro Chocolate Boost" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ppd-project-type">Project Type</Label>
                <Input id="ppd-project-type" value={form.project_type} onChange={e => set('project_type', e.target.value)} placeholder="e.g. New Product, Line Extension, Renovation" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ppd-brand">Brand <span className="text-red-500">*</span></Label>
                <Input id="ppd-brand" value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Enter brand name" autoComplete="off" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ppd-date">Date</Label>
                <Input id="ppd-date" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
              </div>
            </div>
          </Section>

          {/* 2. Project Team */}
          <Section id="team" title="2. Project Team">
            <div className="grid gap-4 sm:grid-cols-2">
              {TEAM_FIELDS.map(([k, label]) => {
                const opts = form[k] && !teamNames.includes(form[k]) ? [form[k], ...teamNames] : teamNames
                return (
                  <div key={k} className="space-y-2">
                    <Label>{label}</Label>
                    <Select value={form[k] || undefined} onValueChange={v => set(k, v === '__none' ? '' : v)}>
                      <SelectTrigger aria-label={label}><SelectValue placeholder={`Select ${label}…`} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none" className="text-muted-foreground">— None —</SelectItem>
                        {opts.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )
              })}
            </div>
          </Section>

          {/* 3–12. Rich-text sections */}
          {RICH_SECTIONS.map(([id, heading, fields, large], si) => (
            <Section key={id} id={id} title={`${si + 3}. ${heading}`}>
              {fields.map(([k, label]) => (
                <div key={k} className="space-y-2">
                  {fields.length > 1 && <Label htmlFor={`ppd-${k}`}>{label}</Label>}
                  <RichTextEditor
                    id={`ppd-${k}`}
                    value={form[k]}
                    onChange={v => set(k, v)}
                    placeholder={`Enter ${label.toLowerCase()}…`}
                    minHeight={large ? 240 : 140}
                    attachments={fieldAttachments(k)}
                    onAttach={files => handleAttach(k, files)}
                    onRemoveAttachment={i => removeAttachment(k, i)}
                  />
                </div>
              ))}
            </Section>
          ))}

          {/* 13. Action */}
          <div className="flex flex-wrap justify-end gap-2 pb-6">
            <Button variant="outline" onClick={onBack}>Cancel</Button>
            {saveBtn}
          </div>
        </div>
      </div>
    </div>
  )
}
