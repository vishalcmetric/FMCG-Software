'use client'

import { useState } from 'react'
import { Download, ExternalLink, FileText, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg']
const FRAME_EXT = ['pdf', 'txt', 'csv']

/** Uploaded files are opened through the frontend origin (/uploads/... is proxied to the backend). */
export function fileHref(url) {
  const u = url || ''
  const i = u.indexOf('/uploads/')
  return i > 0 && /^https?:\/\//i.test(u) ? u.slice(i) : u
}

const extOf = (f) => ((f?.filename || f?.url || '').split('?')[0].split('.').pop() || '').toLowerCase()

/** Preview dialog: images and PDFs/text shown inline; other types get Open / Download. */
export function FilePreviewDialog({ file, onClose }) {
  const href = fileHref(file?.url)
  const ext = extOf(file)
  const name = file?.filename || href.split('/').pop() || 'file'
  return (
    <Dialog open={!!file} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="flex h-[90vh] max-w-5xl flex-col">
        <DialogHeader>
          <DialogTitle className="break-all pr-6">{name}</DialogTitle>
          <DialogDescription className="flex flex-wrap gap-2 pt-1">
            <a href={href} target="_blank" rel="noreferrer"><Button size="sm" variant="outline"><ExternalLink className="mr-1 h-4 w-4" />Open in new tab</Button></a>
            <a href={href} download={name}><Button size="sm" variant="outline"><Download className="mr-1 h-4 w-4" />Download</Button></a>
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-auto rounded border bg-slate-50">
          {IMAGE_EXT.includes(ext)
            ? <img src={href} alt={name} className="mx-auto max-h-full max-w-full object-contain" />
            : FRAME_EXT.includes(ext)
              ? <iframe src={href} title={name} className="h-full w-full bg-white" />
              : (
                <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
                  <FileText className="h-12 w-12 opacity-40" />
                  <p className="text-sm">Preview is not available for .{ext || 'this'} files.</p>
                  <p className="text-xs">Use <b>Open in new tab</b> or <b>Download</b> above.</p>
                </div>
              )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Clickable file chip that opens the preview dialog. file = { url, filename } */
export function FileLink({ file, className, children }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <a href={fileHref(file?.url)} onClick={e => { e.preventDefault(); setOpen(true) }}
        className={className || 'inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs text-blue-600 hover:underline'}>
        {children || <><Paperclip className="h-3 w-3" />{file?.filename || 'Attachment'}</>}
      </a>
      <FilePreviewDialog file={open ? file : null} onClose={() => setOpen(false)} />
    </>
  )
}
