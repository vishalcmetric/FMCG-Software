'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Users, MessageSquare, RefreshCw, Paperclip, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import RichTextEditor from './RichTextEditor'
import { sanitizeHtml, htmlToText } from './ppdFields'

/* R&D and F&D are separate teams: each head assigns only their own members */
export const TEAMS = {
  rd: { label: 'R&D Team', head: 'rd_head', headLabel: 'R&D Head', memberRole: 'rd_team', field: 'rd_assignees' },
  fd: { label: 'F&D Team', head: 'fd', headLabel: 'F&D Team Head', memberRole: 'fd_member', field: 'fd_assignees' },
}
export const TEAM_MEMBER_ROLES = new Set(['rd_team', 'fd_member'])

// Same limit as the backend (ppd_comments.comment is MySQL TEXT = 65,535 bytes)
export const COMMENT_MAX_BYTES = 65000

const teamsForRole = (role) => role === 'admin' ? ['rd', 'fd'] : Object.keys(TEAMS).filter(t => TEAMS[t].head === role)

async function uploadFile(ppdId, file, token) {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(`/api/ppd/${ppdId}/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || `Upload failed: ${file.name}`) }
  const d = await res.json()
  return { url: d.url, filename: d.filename, size: d.size }
}

function AssignDialog({ team, ppd, token, apiCall, open, onOpenChange, onSaved }) {
  const t = TEAMS[team]
  const [options, setOptions] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setSelected(new Set((ppd[t.field] || []).map(m => m.email)))
    apiCall('/api/ppd/team-options', { token })
      .then(list => setOptions(list.filter(u => u.role === t.memberRole && u.email)))
      .catch(err => toast.error(err.message))
  }, [open, ppd, t, token, apiCall])

  const toggle = (email) => setSelected(s => { const n = new Set(s); n.has(email) ? n.delete(email) : n.add(email); return n })

  const save = async () => {
    setSaving(true)
    try {
      const members = options.filter(o => selected.has(o.email)).map(o => ({ email: o.email, name: o.name }))
      const updated = await apiCall(`/api/ppd/${ppd.ppd_id}/assign-team`, { method: 'PATCH', token, body: { team, members } })
      toast.success(`${t.label} assignment saved`)
      onOpenChange(false)
      onSaved?.(updated)
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign {t.label}</DialogTitle>
          <DialogDescription>Select {t.label} member(s) to review {ppd.ppd_id}. Members can view and comment only.</DialogDescription>
        </DialogHeader>
        <div className="max-h-72 space-y-1 overflow-y-auto py-1">
          {options.length === 0
            ? <p className="py-6 text-center text-sm text-muted-foreground">No {t.label} members available.</p>
            : options.map(o => (
              <label key={o.email} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted">
                <Checkbox checked={selected.has(o.email)} onCheckedChange={() => toggle(o.email)} />
                <span className="text-sm font-medium">{o.name}</span>
                <span className="ml-auto truncate text-xs text-muted-foreground">{o.email}</span>
              </label>
            ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}Save Assignment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Header button: "Assign Team" for R&D Head / F&D Team Head (admin sees both). */
export function AssignTeamButton({ ppd, user, token, apiCall, onSaved }) {
  const teams = teamsForRole(user?.role)
  const [open, setOpen] = useState(null)
  if (!teams.length || ppd.status === 'Draft') return null
  return (
    <>
      {teams.map(team => (
        <Button key={team} variant="outline" size="sm" onClick={() => setOpen(team)}>
          <UserPlus className="mr-1 h-4 w-4" />Assign {teams.length > 1 ? TEAMS[team].label : 'Team'}
        </Button>
      ))}
      {open && <AssignDialog team={open} ppd={ppd} token={token} apiCall={apiCall} open={!!open} onOpenChange={v => !v && setOpen(null)} onSaved={onSaved} />}
    </>
  )
}

/** Reviewers tab card: assigned R&D Team / F&D Team members. */
export function TeamAssignmentCard({ ppd, user, token, apiCall, onSaved }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4" />Assigned Team Members</CardTitle>
        <CardDescription>Assigned by R&amp;D Head / F&amp;D Team Head. Team members review and comment only — heads approve.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {Object.entries(TEAMS).map(([key, t]) => (
          <div key={key} className="rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold">{t.label}</span>
              <span className="text-xs text-muted-foreground">by {t.headLabel}</span>
            </div>
            {(ppd[t.field] || []).length === 0
              ? <p className="text-xs text-muted-foreground">No members assigned yet.</p>
              : (
                <ul className="space-y-1">
                  {ppd[t.field].map(m => (
                    <li key={m.email} className="text-sm">
                      {m.name} <span className="text-xs text-muted-foreground">· {m.email}</span>
                    </li>
                  ))}
                </ul>
              )}
          </div>
        ))}
        <div className="flex gap-2 sm:col-span-2">
          <AssignTeamButton ppd={ppd} user={user} token={token} apiCall={apiCall} onSaved={onSaved} />
        </div>
      </CardContent>
    </Card>
  )
}

/** Comment content: rich text (or legacy plain text with links), attachments, author timestamp. */
export function CommentBody({ c, apiBase = '' }) {
  const isHtml = /<[a-z][\s\S]*>/i.test(c.comment || '')
  const files = c.attachments?.length ? c.attachments : (c.attachment_url ? [{ url: c.attachment_url, filename: c.attachment_name }] : [])
  return (
    <>
      {isHtml
        ? <div className="rte-content mt-1 text-sm" dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.comment) }} />
        : (
          <p className="mt-1 whitespace-pre-line text-sm">
            {(c.comment || '').split(/(\bhttps?:\/\/\S+)/g).map((part, i) =>
              /^https?:\/\//.test(part)
                ? <a key={i} href={part} target="_blank" rel="noreferrer" className="break-all text-blue-600 hover:underline">{part}</a>
                : part)}
          </p>
        )}
      {files.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {files.map((f, i) => (
            <a key={f.url || i} href={`${apiBase}${f.url}`} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs text-blue-600 hover:underline">
              <Paperclip className="h-3 w-3" />{f.filename || 'Attachment'}
            </a>
          ))}
        </div>
      )}
      {c.created_at && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          {c.user_name} · {new Date(c.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      )}
    </>
  )
}

/** New comment: rich text + multiple attachments. Rework option only when allowRework (never for team members).
 *  reworkPreset: bumped by "Request Rework" → Rework is preselected and the editor is focused. */
export function CommentComposer({ ppd, token, apiCall, allowRework, reworkPreset = 0, onPosted }) {
  const [html, setHtml] = useState('')
  const [files, setFiles] = useState([])
  const [tag, setTag] = useState('comment')
  const [busy, setBusy] = useState(false)
  const [editorKey, setEditorKey] = useState(0)
  const boxRef = useRef(null)

  useEffect(() => {
    if (!reworkPreset || !allowRework) return
    setTag('rework')
    const t = setTimeout(() => {
      boxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      boxRef.current?.querySelector('[role="textbox"]')?.focus()
    }, 50)
    return () => clearTimeout(t)
  }, [reworkPreset, allowRework])

  const attach = async (list) => {
    setBusy(true)
    for (const f of list) {
      try { const a = await uploadFile(ppd.ppd_id, f, token); setFiles(prev => [...prev, a]) }
      catch (err) { toast.error(err.message) }
    }
    setBusy(false)
  }

  const post = async () => {
    const text = htmlToText(html)
    if (!text && !files.length) return toast.error('Comment text is required')
    const clean = sanitizeHtml(html)
    const size = new TextEncoder().encode(clean).length
    if (size > COMMENT_MAX_BYTES) {
      return toast.error(`Comment is too long (${size.toLocaleString()} / ${COMMENT_MAX_BYTES.toLocaleString()} characters incl. formatting). Please shorten it or attach the content as a file.`)
    }
    setBusy(true)
    try {
      if (allowRework && tag === 'rework') {
        if (!text) throw new Error('Rework needs a comment explaining what to fix')
        await apiCall(`/api/ppd/${ppd.ppd_id}/rework`, { method: 'POST', token, body: { comment: clean, attachments: files } })
        toast.warning('Rework requested — PPD sent back to the Source Team')
      } else {
        await apiCall(`/api/ppd/${ppd.ppd_id}/comments`, {
          method: 'POST', token,
          body: {
            comment: clean, action_tag: 'comment', attachments: files,
            attachment_url: files[0]?.url || null, attachment_name: files[0]?.filename || null,
          },
        })
        toast.success('Comment posted')
      }
      setHtml(''); setFiles([]); setTag('comment'); setEditorKey(k => k + 1)
      await onPosted?.()
    } catch (err) { toast.error(err.message) }
    finally { setBusy(false) }
  }

  return (
    <div ref={boxRef} className={`space-y-3 rounded-lg border p-3 ${tag === 'rework' ? 'border-amber-400 ring-1 ring-amber-300' : ''}`}>
      <RichTextEditor key={editorKey} value={html} onChange={setHtml} placeholder="Add a comment or feedback…" minHeight={110}
        attachments={files} onAttach={attach} onRemoveAttachment={i => setFiles(f => f.filter((_, j) => j !== i))} disabled={busy} />
      <div className="flex items-center justify-between gap-2">
        {allowRework ? (
          <Select value={tag} onValueChange={setTag}>
            <SelectTrigger className={`h-8 w-40 text-xs ${tag === 'rework' ? 'border-amber-400 text-amber-700' : ''}`}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="comment">💬 Comment</SelectItem>
              <SelectItem value="rework">🔁 Rework</SelectItem>
            </SelectContent>
          </Select>
        ) : <span className="text-xs text-muted-foreground">PDF, Word, Excel, images, ZIP — max 10 MB</span>}
        <Button size="sm" onClick={post} disabled={busy}>
          {busy ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}{tag === 'rework' ? 'Post Rework' : 'Post Comment'}
        </Button>
      </div>
    </div>
  )
}
