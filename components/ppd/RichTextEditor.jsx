'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Bold, Italic, Underline, List, ListOrdered, Link2, Undo2, Redo2, Pilcrow, Paperclip, X, FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { sanitizeHtml } from './ppdFields'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const ALLOWED = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip'   // mirrors backend ALLOWED_EXTENSIONS
const MAX_SIZE = 10 * 1024 * 1024                                   // mirrors backend MAX_FILE_SIZE

/**
 * Lightweight rich text editor (contentEditable) with formatting toolbar and file attachments.
 * value/onChange are HTML strings. attachments: [{url, filename, pending?}].
 */
export default function RichTextEditor({
  id, value = '', onChange, placeholder, minHeight = 140,
  attachments = [], onAttach, onRemoveAttachment, disabled,
}) {
  const ref = useRef(null)
  const fileRef = useRef(null)
  const rangeRef = useRef(null)                     // selection saved while the link dialog is open
  const [link, setLink] = useState(null)            // { url, text, hasSelection } when dialog open

  // Sync external value without clobbering the caret while typing
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || '')) ref.current.innerHTML = sanitizeHtml(value)
  }, [value])

  const exec = (cmd, arg) => {
    ref.current?.focus()
    document.execCommand(cmd, false, arg)
    onChange?.(ref.current.innerHTML)
  }

  // In-app "Insert link" dialog (replaces the browser prompt)
  const addLink = () => {
    const sel = window.getSelection()
    const r = sel && sel.rangeCount ? sel.getRangeAt(0) : null
    rangeRef.current = r && ref.current?.contains(r.commonAncestorContainer) ? r.cloneRange() : null
    const text = rangeRef.current ? rangeRef.current.toString() : ''
    setLink({ url: '', text, hasSelection: !!text })
  }

  const insertLink = () => {
    const raw = (link?.url || '').trim()
    if (!raw) return
    const url = /^(https?:\/\/|mailto:)/i.test(raw) ? raw : `https://${raw}`
    const text = (link.text || '').trim() || url
    setLink(null)
    const el = ref.current
    if (!el) return
    el.focus()
    const sel = window.getSelection()
    sel.removeAllRanges()
    if (rangeRef.current) sel.addRange(rangeRef.current)
    else { const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); sel.addRange(r) }
    if (link.hasSelection && text === link.text.trim()) {
      document.execCommand('createLink', false, url)
    } else {
      const a = document.createElement('a')
      a.href = url; a.textContent = text
      document.execCommand('insertHTML', false, a.outerHTML + '&nbsp;')
    }
    onChange?.(el.innerHTML)
  }

  const pickFiles = (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    const ok = files.filter(f => {
      if (f.size > MAX_SIZE) { window.alert(`${f.name} exceeds 10 MB limit`); return false }
      return true
    })
    if (ok.length) onAttach?.(ok)
  }

  const tools = [
    { icon: Pilcrow,     title: 'Normal paragraph', run: () => exec('formatBlock', 'P') },
    { icon: Bold,        title: 'Bold (Ctrl+B)',    run: () => exec('bold') },
    { icon: Italic,      title: 'Italic (Ctrl+I)',  run: () => exec('italic') },
    { icon: Underline,   title: 'Underline (Ctrl+U)', run: () => exec('underline') },
    'sep',
    { icon: List,        title: 'Bulleted list',    run: () => exec('insertUnorderedList') },
    { icon: ListOrdered, title: 'Numbered list',    run: () => exec('insertOrderedList') },
    { icon: Link2,       title: 'Insert link',      run: addLink },
    'sep',
    { icon: Undo2,       title: 'Undo (Ctrl+Z)',    run: () => exec('undo') },
    { icon: Redo2,       title: 'Redo (Ctrl+Y)',    run: () => exec('redo') },
  ]

  return (
    <div className={cn('rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring/40', disabled && 'opacity-60')}>
      <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/40 px-1.5 py-1">
        {tools.map((t, i) => t === 'sep'
          ? <span key={i} className="mx-1 h-5 w-px bg-border" />
          : (
            <button key={i} type="button" title={t.title} aria-label={t.title} disabled={disabled}
              onMouseDown={e => e.preventDefault()} onClick={t.run}
              className="rounded p-1.5 text-muted-foreground hover:bg-background hover:text-foreground">
              <t.icon className="h-4 w-4" />
            </button>
          ))}
        {onAttach && (
          <>
            <span className="mx-1 h-5 w-px bg-border" />
            <button type="button" disabled={disabled} onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-background hover:text-foreground">
              <Paperclip className="h-3.5 w-3.5" />Attach
            </button>
            <input ref={fileRef} type="file" multiple accept={ALLOWED} className="hidden" onChange={pickFiles} />
          </>
        )}
      </div>
      <div
        id={id} ref={ref} role="textbox" aria-multiline="true" data-placeholder={placeholder}
        contentEditable={!disabled} suppressContentEditableWarning
        onInput={e => onChange?.(e.currentTarget.innerHTML)}
        style={{ minHeight }}
        className="rte-content max-h-[480px] overflow-y-auto px-3 py-2 text-sm outline-none"
      />
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t px-3 py-2">
          {attachments.map((a, i) => (
            <span key={a.url || `${a.filename}-${i}`} className="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1 text-xs">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              {a.url
                ? <a href={a.url} target="_blank" rel="noreferrer" className="max-w-[200px] truncate hover:underline">{a.filename}</a>
                : <span className="max-w-[200px] truncate">{a.filename}</span>}
              {a.pending && <span className="text-[10px] text-amber-600">(uploads on save)</span>}
              {onRemoveAttachment && !disabled && (
                <button type="button" onClick={() => onRemoveAttachment(i)} className="text-muted-foreground hover:text-red-600" aria-label={`Remove ${a.filename}`}>
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      <Dialog open={!!link} onOpenChange={v => { if (!v) setLink(null) }}>
        <DialogContent className="max-w-md" onCloseAutoFocus={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Insert link</DialogTitle>
            <DialogDescription>Enter the web address to link to.</DialogDescription>
          </DialogHeader>
          <form className="space-y-3 py-1" onSubmit={e => { e.preventDefault(); insertLink() }}>
            <div className="space-y-1.5">
              <Label htmlFor="rte-link-url">URL</Label>
              <Input id="rte-link-url" autoFocus placeholder="https://example.com" value={link?.url || ''}
                onChange={e => setLink(l => ({ ...l, url: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rte-link-text">Text to display</Label>
              <Input id="rte-link-text" placeholder="Optional — defaults to the URL" value={link?.text || ''}
                onChange={e => setLink(l => ({ ...l, text: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setLink(null)}>Cancel</Button>
              <Button type="submit" disabled={!(link?.url || '').trim()}>Insert link</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
