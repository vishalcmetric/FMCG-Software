'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Save, Trash2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import RichTextEditor from '@/components/ppd/RichTextEditor'

/* Form Overview — Formulation: Basic Information, Ingredients table, final section */
const BASIC = [
  ['trial_no',   'Trial No.',        'text'],
  ['batch_no',   'Batch No.',        'text'],
  ['batch_size', 'Batch Size (gm)',  'text'],
  ['unit_qty',   'Unit Qty. (gm)',   'text'],
  ['mfg_date',   'Mfg Date',         'date'],
]
const COLS = [
  ['name',          'Name of Ingredients',          'text',   'min-w-[180px]'],
  ['ins_cas_inci',  'INS / CAS / INCI No.',         'text',   'min-w-[150px]'],
  ['vendor',        'Vendor / Supplier Name',       'text',   'min-w-[160px]'],
  ['use_function',  'Use / Function',               'text',   'min-w-[140px]'],
  ['cost_per_kg',   'Cost Per Kg',                  'number', 'min-w-[110px]'],
  ['qty_pct',       'Quantity in Percentage (%)',   'number', 'min-w-[120px]'],
  ['qty_per_unit',  'Quantity per Unit or BOM',     'number', 'min-w-[120px]'],
  ['cost_per_unit', 'Cost per Unit (in INR)',       'number', 'min-w-[120px]'],
]
const RICH = [
  ['method_of_preparation', 'Method of Preparation'],
  ['observation',           'Observation / Reason of Modification'],
  ['conclusion',            'Conclusion'],
]
const emptyRow = () => Object.fromEntries(COLS.map(([k]) => [k, '']))

async function uploadFile(ppdId, file, token) {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(`/api/ppd/${ppdId}/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || `Upload failed: ${file.name}`) }
  const d = await res.json()
  return { url: d.url, filename: d.filename, size: d.size }
}

function Section({ title, desc, children, action }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><CardTitle className="text-base">{title}</CardTitle>{desc && <CardDescription>{desc}</CardDescription>}</div>
          {action}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

/**
 * Full-page New / Edit Formulation (linked to a PPD).
 * mode 'create' → POST /api/formulation ; mode 'edit' → PUT /api/formulation/:id
 */
export default function FormulationForm({ mode = 'create', formula, ppds = [], initialPpdId, token, apiCall, onBack, onSaved }) {
  const isEdit = mode === 'edit' && formula
  const [ppdId, setPpdId] = useState(isEdit ? formula.ppd_id : (initialPpdId || ''))
  const [basic, setBasic] = useState(() => Object.fromEntries(BASIC.map(([k]) => [k, (isEdit && formula[k]) || ''])))
  const [people, setPeople] = useState({ trial_taken_by: (isEdit && formula.trial_taken_by) || '', evaluated_by: (isEdit && formula.evaluated_by) || '' })
  const [rows, setRows] = useState(() => (isEdit && formula.ingredients?.length ? formula.ingredients.map(r => ({ ...emptyRow(), ...r })) : [emptyRow()]))
  const [rich, setRich] = useState(() => Object.fromEntries(RICH.map(([k]) => [k, (isEdit && formula.rich_html?.[k]) || ''])))
  const [attachments, setAttachments] = useState(() => (isEdit && formula.attachments) || {})
  const [inci, setInci] = useState([])
  const [saving, setSaving] = useState(false)

  const ppd = useMemo(() => ppds.find(p => p.ppd_id === ppdId), [ppds, ppdId])
  const productName = ppd?.project_name || formula?.project_name || ''

  // INCI / INS / CAS master data for the ingredient table
  useEffect(() => {
    apiCall('/api/master-config?config_type=inci', { token }).then(d => setInci(Array.isArray(d) ? d : [])).catch(() => setInci([]))
  }, [apiCall, token])

  const setCell = (i, k, v) => setRows(rs => rs.map((r, idx) => {
    if (idx !== i) return r
    const next = { ...r, [k]: v }
    // Picking an ingredient / number from INCI master fills the linked columns when empty
    const m = k === 'name' ? inci.find(x => x.label.toLowerCase() === v.trim().toLowerCase())
      : k === 'ins_cas_inci' ? inci.find(x => x.key.toLowerCase() === v.trim().toLowerCase()) : null
    if (m) {
      if (!next.name) next.name = m.label
      if (!next.ins_cas_inci) next.ins_cas_inci = m.key
      if (!next.use_function && m.meta?.function) next.use_function = m.meta.function
    }
    return next
  }))

  const attach = async (field, files) => {
    if (!ppdId) return toast.error('Select a PPD first')
    for (const f of files) {
      try {
        const a = await uploadFile(ppdId, f, token)
        setAttachments(prev => ({ ...prev, [field]: [...(prev[field] || []), a] }))
      } catch (err) { toast.error(err.message) }
    }
  }

  const save = async () => {
    if (!ppdId) return toast.error('Select a PPD')
    setSaving(true)
    try {
      const body = {
        ...basic, ...people,
        ingredients: rows.filter(r => r.name?.trim()),
        rich_html: rich,
        attachments,
      }
      if (isEdit) {
        await apiCall(`/api/formulation/${formula.formula_id}`, { method: 'PUT', token, body })
        toast.success(`Formula ${formula.formula_id} saved`)
        onSaved?.(formula.formula_id)
      } else {
        const created = await apiCall('/api/formulation', { method: 'POST', token, body: { ppd_id: ppdId, ...body } })
        toast.success(`Formula ${created.formula_id} created`)
        onSaved?.(created.formula_id)
      }
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const saveBtn = (
    <Button onClick={save} disabled={saving}>
      {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save
    </Button>
  )

  return (
    <div className="space-y-5">
      {/* ── Header: Product Name - Trials / PPD Name + PPD ID ── */}
      <div className="sticky top-0 z-20 -mx-1 flex flex-wrap items-center justify-between gap-3 border-b bg-background/95 px-1 py-3 backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="mr-1 h-4 w-4" />Back</Button>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold">{productName ? `${productName} - Trials` : (isEdit ? 'Edit Formulation' : 'New Formulation')}</h1>
            <p className="truncate text-xs text-muted-foreground">
              {ppd || isEdit ? `${ppd?.ppd_title || ppd?.project_name || ''} · ${ppdId}` : 'Select the PPD this formulation belongs to'}
              {isEdit && ` · ${formula.formula_id} · ${formula.version}`}
            </p>
          </div>
        </div>
        {saveBtn}
      </div>

      {!isEdit && (
        <Section title="PPD" desc="The formulation is linked to this PPD">
          <Select value={ppdId} onValueChange={setPpdId}>
            <SelectTrigger className="max-w-xl"><SelectValue placeholder="Select PPD…" /></SelectTrigger>
            <SelectContent>
              {ppds.map(p => <SelectItem key={p.ppd_id} value={p.ppd_id}>{p.ppd_id} — {p.ppd_title || p.project_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Section>
      )}

      {/* ── 1. Basic Information ── */}
      <Section title="Basic Information">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {BASIC.map(([k, label, type]) => (
            <div key={k} className="space-y-1.5">
              <Label htmlFor={`f-${k}`}>{label}</Label>
              <Input id={`f-${k}`} type={type} value={basic[k]} onChange={e => setBasic(b => ({ ...b, [k]: e.target.value }))} />
            </div>
          ))}
        </div>
      </Section>

      {/* ── 2. Ingredients table ── */}
      <Section title="Ingredients" desc="INS / CAS / INCI numbers come from Master Data → INCI Number"
        action={<Button size="sm" variant="outline" onClick={() => setRows(rs => [...rs, emptyRow()])}><Plus className="mr-1 h-4 w-4" />Add Row</Button>}>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-xs">
              <tr>
                <th className="w-14 px-2 py-2 text-left font-semibold">Sr. No.</th>
                {COLS.map(([k, label, , w]) => <th key={k} className={`px-2 py-2 text-left font-semibold ${w}`}>{label}</th>)}
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="px-2 py-1.5 text-center font-medium text-muted-foreground">{i + 1}</td>
                  {COLS.map(([k, label, type]) => (
                    <td key={k} className="px-1 py-1">
                      <Input aria-label={`${label} row ${i + 1}`} type={type} step="any" className="h-8"
                        list={k === 'name' ? 'inci-names' : k === 'ins_cas_inci' ? 'inci-numbers' : undefined}
                        value={r[k] ?? ''} onChange={e => setCell(i, k, e.target.value)} />
                    </td>
                  ))}
                  <td className="px-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-red-600" aria-label={`Delete row ${i + 1}`}
                      onClick={() => setRows(rs => rs.length > 1 ? rs.filter((_, idx) => idx !== i) : [emptyRow()])}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <datalist id="inci-names">{inci.map(x => <option key={x.id} value={x.label}>{x.key}</option>)}</datalist>
        <datalist id="inci-numbers">{inci.map(x => <option key={x.id} value={x.key}>{x.label}</option>)}</datalist>
      </Section>

      {/* ── 3. Trial / Preparation / Observation / Conclusion ── */}
      <Section title="Trial Details">
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {[['trial_taken_by', 'Trial Taken By'], ['evaluated_by', 'Evaluated By']].map(([k, label]) => (
              <div key={k} className="space-y-1.5">
                <Label htmlFor={`f-${k}`}>{label}</Label>
                <Input id={`f-${k}`} value={people[k]} onChange={e => setPeople(p => ({ ...p, [k]: e.target.value }))} />
              </div>
            ))}
          </div>
          {RICH.map(([k, label]) => (
            <div key={k} className="space-y-1.5">
              <Label htmlFor={`f-${k}`}>{label}</Label>
              <RichTextEditor id={`f-${k}`} value={rich[k]} onChange={v => setRich(s => ({ ...s, [k]: v }))}
                placeholder={`Enter ${label.toLowerCase()}…`} minHeight={140}
                attachments={attachments[k] || []} onAttach={files => attach(k, files)}
                onRemoveAttachment={idx => setAttachments(a => ({ ...a, [k]: (a[k] || []).filter((_, j) => j !== idx) }))} />
            </div>
          ))}
        </div>
      </Section>

      <div className="flex justify-end gap-2 pb-6">
        <Button variant="outline" onClick={onBack}>Cancel</Button>
        {saveBtn}
      </div>
    </div>
  )
}
