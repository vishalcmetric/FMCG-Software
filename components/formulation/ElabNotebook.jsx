'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, Download, FileText, MessageSquare, Paperclip, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { sanitizeHtml } from '@/components/ppd/ppdFields'

/* E-Lab Notebook sheet layout (Form Overview → Formulation Development) — same as the PDF export */
const BASIC = [['trial_no', 'Trial No.'], ['batch_no', 'Batch No.'], ['batch_size', 'Batch Size (gm)'], ['unit_qty', 'Unit Qty. (gm)'], ['mfg_date', 'Mfg Date']]
const ING = [['name', 'Name of Ingredients'], ['ins_cas_inci', 'INS / CAS / INCI No.'], ['vendor', 'Vendor / Supplier Name'], ['use_function', 'Use / Function'],
  ['cost_per_kg', 'Cost Per Kg'], ['qty_pct', 'Quantity in Percentage (%)'], ['qty_per_unit', 'Quantity per Unit or BOM'], ['cost_per_unit', 'Cost per Unit (in INR)']]
const RICH = [['method_of_preparation', 'Method of Preparation'], ['observation', 'Observation / Reason of Modification'], ['conclusion', 'Conclusion']]
const PAGE = 20   // sheets rendered per batch — keeps the page fast for PPDs with very many trials
const STATUS_COLOR = {
  'Draft': 'bg-slate-100 text-slate-700', 'In Testing': 'bg-blue-100 text-blue-700', 'Sensory Pass': 'bg-emerald-100 text-emerald-700',
  'Recommended': 'bg-green-100 text-green-800', 'Rejected': 'bg-red-100 text-red-700',
}
const cellB = 'border border-slate-400 px-2 py-1.5 align-top'
const headB = `${cellB} bg-slate-100 font-semibold text-xs`

function TrialSheet({ t, n, total, ppd }) {
  return (
    <div id={`trial-${n}`} className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold">Trial {String(n).padStart(2, '0')} of {total}</span>
        <span className={`px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[t.status] || 'bg-slate-100 text-slate-600'}`}>{t.status}</span>
        {t.approval_status === 'pending_approval' && <span className="text-amber-700">⏳ Pending R&D Head review</span>}
        {t.approval_status === 'approved' && <span className="text-green-700">✓ Approved by R&D Head{t.approved_by ? ` (${t.approved_by})` : ''}</span>}
        {t.approval_status === 'rejected' && <span className="text-red-700">✗ Rejected by R&D Head</span>}
        <span className="ml-auto text-muted-foreground">Created by {t.created_by || '—'}{t.created_at ? ` · ${new Date(t.created_at).toLocaleString('en-IN')}` : ''}</span>
      </div>
      <div className="overflow-x-auto bg-white">
        <table className="w-full border-collapse text-sm min-w-[900px]">
          <tbody>
            <tr><td colSpan={5} className={`${cellB} bg-slate-100 text-center`}>
              <div className="text-base font-bold">{t.project_name || ppd.project_name} - Trials</div>
              <div className="text-xs text-muted-foreground">PPD: {ppd.ppd_id} · {ppd.title} | Formula ID: <span className="font-mono">{t.formula_id}</span></div>
            </td></tr>
            <tr>{BASIC.map(([, l]) => <td key={l} className={headB}>{l}</td>)}</tr>
            <tr>{BASIC.map(([k]) => <td key={k} className={cellB}>{t[k] || '—'}</td>)}</tr>
          </tbody>
        </table>
        <table className="w-full border-collapse text-sm min-w-[900px] -mt-px">
          <thead><tr><th className={`${headB} w-14`}>Sr. No.</th>{ING.map(([, l]) => <th key={l} className={`${headB} text-left`}>{l}</th>)}</tr></thead>
          <tbody>
            {(t.ingredients || []).length === 0
              ? <tr><td className={cellB} /><td colSpan={ING.length} className={`${cellB} text-muted-foreground`}>No ingredients recorded</td></tr>
              : t.ingredients.map((r, i) => (
                <tr key={i}>
                  <td className={`${cellB} text-center`}>{i + 1}</td>
                  {ING.map(([k], j) => <td key={k} className={`${cellB} ${j >= 4 ? 'text-right' : ''}`}>{r[k] || '—'}</td>)}
                </tr>
              ))}
          </tbody>
        </table>
        <table className="w-full border-collapse text-sm min-w-[900px] -mt-px">
          <tbody>
            <tr>
              <td className={`${headB} w-44`}>Trial Taken By</td><td className={cellB}>{t.trial_taken_by || '—'}</td>
              <td className={`${headB} w-44`}>Evaluated By</td><td className={cellB}>{t.evaluated_by || '—'}</td>
            </tr>
            {RICH.map(([k, l]) => (
              <tr key={k}>
                <td className={headB}>{l}</td>
                <td colSpan={3} className={cellB}>
                  <div className="prose prose-sm max-w-none [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(t.rich_html?.[k] || '') || '—' }} />
                  {(t.attachments?.[k] || []).length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {t.attachments[k].map(a => (
                        <a key={a.url} href={a.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          <Paperclip className="h-3 w-3" />{a.filename}
                        </a>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Full-screen E-Lab Notebook of ONE PPD: every formula/trial in creation order + one consolidated PDF */
export default function ElabNotebook({ ppd, user, token, apiCall, apiBase, onBack }) {
  const [trials, setTrials]   = useState([])
  const [loading, setLoading] = useState(true)
  const [shown, setShown]     = useState(PAGE)
  const [tab, setTab]         = useState('notebook')
  // Attachment selection for the PPD report (R&D Head / admin) — carried over from the old popup
  const isRdHead = ['admin', 'rd_head'].includes(user?.role)
  const [ppdReports, setPpdReports]   = useState([])
  const [ppdComments, setPpdComments] = useState([])
  const [selReports, setSelReports]   = useState([])
  const [selComments, setSelComments] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiCall(`/api/formulation/by-ppd/${encodeURIComponent(ppd.ppd_id)}`, { token })
      setTrials(Array.isArray(data?.trials) ? data.trials : Array.isArray(data) ? data : [])
    } catch (err) { toast.error(err.message || 'Failed to load trials') }
    finally { setLoading(false) }
  }, [ppd.ppd_id, token, apiCall])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!isRdHead) return
    Promise.all([
      apiCall(`/api/pilot-reports?ppd_id=${ppd.ppd_id}`, { token }).catch(() => []),
      apiCall(`/api/ppd/${ppd.ppd_id}/comments`, { token }).catch(() => []),
    ]).then(([r, c]) => { setPpdReports(Array.isArray(r) ? r : []); setPpdComments(Array.isArray(c) ? c : []) })
  }, [isRdHead, ppd.ppd_id, token, apiCall])

  const toggle = (setter) => (id) => setter(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  const exportPdf = () => window.open(`${apiBase}/api/formulation/report/${ppd.ppd_id}/elab?token=${encodeURIComponent(token)}`, '_blank')
  const generateWithAttachments = () => {
    const params = new URLSearchParams({ token, base_url: apiBase })
    if (selReports.length)  params.set('report_ids', selReports.join(','))
    if (selComments.length) params.set('comment_ids', selComments.join(','))
    window.open(`${apiBase}/api/formulation/report/${ppd.ppd_id}/with-attachments?${params}`, '_blank')
  }

  return (
    <div className="space-y-4">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-20 -mx-1 flex flex-wrap items-center gap-3 border-b bg-background/95 px-1 py-3 backdrop-blur">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
        <div className="min-w-0">
          <h1 className="text-lg font-bold truncate">{ppd.project_name} - Trials</h1>
          <p className="text-xs text-muted-foreground">E-Lab Notebook · <span className="font-mono">{ppd.ppd_id}</span>{ppd.title ? ` · ${ppd.title}` : ''} · {loading ? '…' : `${trials.length} trial${trials.length !== 1 ? 's' : ''}`}</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
          <Button variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-50"
            onClick={() => window.open(`${apiBase}/api/formulation/report/${ppd.ppd_id}?token=${encodeURIComponent(token)}`, '_blank')}>
            <FileText className="h-4 w-4 mr-1" />Download PPD Report
          </Button>
          {isRdHead && (selReports.length + selComments.length) > 0 && (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={generateWithAttachments}>
              <Download className="h-4 w-4 mr-1" />PPD Report + {selReports.length + selComments.length} Attachment{selReports.length + selComments.length !== 1 ? 's' : ''}
            </Button>
          )}
          <Button size="sm" onClick={exportPdf} disabled={loading}><Download className="h-4 w-4 mr-1" />Download PDF</Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        {isRdHead && (
          <TabsList>
            <TabsTrigger value="notebook">E-Lab Notebook</TabsTrigger>
            <TabsTrigger value="reports">Report Files {ppdReports.length > 0 && `(${ppdReports.length})`}</TabsTrigger>
            <TabsTrigger value="comments">PPD Comments</TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="notebook" className="space-y-8 pt-2">
          {loading ? (
            <div className="space-y-4">{[1, 2].map(i => <div key={i} className="h-64 rounded-lg bg-slate-100 animate-pulse" />)}</div>
          ) : trials.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <FileText className="h-12 w-12 mb-3 opacity-30" />
              <p className="font-medium">No formulas / trials for this PPD yet</p>
            </div>
          ) : (
            <>
              {trials.slice(0, shown).map((t, i) => <TrialSheet key={t.formula_id} t={t} n={i + 1} total={trials.length} ppd={ppd} />)}
              {shown < trials.length && (
                <div className="text-center">
                  <Button variant="outline" onClick={() => setShown(s => s + PAGE)}>
                    Show next {Math.min(PAGE, trials.length - shown)} trials ({shown} of {trials.length} shown)
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">The PDF export always contains all {trials.length} trials.</p>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {isRdHead && (
          <TabsContent value="reports" className="pt-2">
            <p className="text-sm text-muted-foreground mb-3">Select pilot reports to append to the PPD Report PDF.</p>
            {ppdReports.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm"><FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />No pilot reports found for PPD {ppd.ppd_id}</div>
            ) : (
              <div className="rounded-lg border overflow-hidden bg-white">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className="w-10" /><TableHead>Report ID</TableHead><TableHead>Type</TableHead><TableHead>File Name</TableHead>
                    <TableHead>Uploaded By</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {ppdReports.map(r => (
                      <TableRow key={r.report_id} className={`cursor-pointer ${selReports.includes(r.report_id) ? 'bg-primary/5' : ''}`} onClick={() => toggle(setSelReports)(r.report_id)}>
                        <TableCell onClick={e => e.stopPropagation()}><Checkbox checked={selReports.includes(r.report_id)} onCheckedChange={() => toggle(setSelReports)(r.report_id)} /></TableCell>
                        <TableCell className="font-mono text-xs">{r.report_id}</TableCell>
                        <TableCell className="text-sm">{r.report_type || '—'}</TableCell>
                        <TableCell className="text-sm max-w-[180px] truncate" title={r.file_name}>{r.file_name || '—'}</TableCell>
                        <TableCell className="text-sm">{r.created_by || '—'}</TableCell>
                        <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        )}

        {isRdHead && (
          <TabsContent value="comments" className="pt-2">
            <p className="text-sm text-muted-foreground mb-3">Select comments that have attached files to include in the PPD Report PDF.</p>
            {ppdComments.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm"><MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />No comments found for PPD {ppd.ppd_id}</div>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-2 pr-2">
                  {ppdComments.map(c => {
                    const hasFile = !!c.attachment_url
                    const on = selComments.includes(String(c.id))
                    return (
                      <div key={c.id} onClick={() => hasFile && toggle(setSelComments)(String(c.id))}
                        className={`flex items-start gap-3 rounded-lg border p-3 bg-white ${hasFile ? 'cursor-pointer hover:bg-slate-50' : 'opacity-60'} ${on ? 'bg-primary/5 border-primary/30' : ''}`}>
                        <Checkbox checked={on} disabled={!hasFile} onClick={e => e.stopPropagation()} onCheckedChange={() => hasFile && toggle(setSelComments)(String(c.id))} className="mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold">{c.user_name}</span>
                            <Badge variant="outline" className="text-[10px] py-0">{c.user_role}</Badge>
                            <span className="text-xs text-muted-foreground">{c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN') : '—'}</span>
                            {hasFile && <span className="flex items-center gap-1 text-xs text-primary font-medium"><Paperclip className="h-3 w-3" />{c.attachment_name || 'attachment'}</span>}
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{c.comment}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
