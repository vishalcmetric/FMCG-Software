'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import {
  LayoutDashboard, FolderKanban, FileText, FlaskConical, Notebook, Factory, ShieldCheck, TestTube2,
  Calculator, BadgeCheck, Palette, Database, BarChart3, Archive, Users, KeyRound, Settings, ScrollText,
  Bell, LogOut, Search, Plus, Upload, Eye, Edit, CheckCircle2, XCircle, Clock, ChevronRight, Filter,
  Download, GitCompare, History, Layers, Sparkles, TrendingUp, AlertCircle, Building2, Menu, ChevronDown,
  UserCog, Package, Beaker, ClipboardList, FileCheck2, RefreshCw, Send, MessageSquare, Trash2, Home
} from 'lucide-react'

/* -------------------- ROLES & MENU CONFIG -------------------- */
const ROLES = {
  admin:      { label: 'System Administrator',          color: 'bg-purple-600',  desc: 'Full system access, user & config management' },
  source:     { label: 'Source Team',                   color: 'bg-blue-600',    desc: 'Creates PPDs, initiates new product requests' },
  pm:         { label: 'Project Management',            color: 'bg-cyan-600',    desc: 'Reviews PPDs, assigns teams, tracks project lifecycle' },
  fd:         { label: 'R&D / F&D Team',                color: 'bg-emerald-600', desc: 'Formulation development, lab book, sensory trials' },
  rd_head:    { label: 'R&D Head',                      color: 'bg-emerald-800', desc: 'Approves formulations, oversees R&D pipeline' },
  marketing:  { label: 'Marketing Team',                color: 'bg-pink-600',    desc: 'PPD review, artwork briefs, brand approvals' },
  regulatory: { label: 'Regulatory Team',               color: 'bg-red-600',     desc: 'Regulatory compliance, ingredient checks, FSSAI' },
  packaging:  { label: 'Packaging Team',                color: 'bg-amber-600',   desc: 'Costing feasibility, artwork, SFG/PKG BOM' },
  adl:        { label: 'ADL Lab Team',                  color: 'bg-indigo-600',  desc: 'Analytical & Development Lab — stability, testing' },
  pmsa:       { label: 'PM & SA Team',                  color: 'bg-teal-600',    desc: 'Product Management & Scientific Affairs sensory eval' },
  sa:         { label: 'Scientific Affairs',            color: 'bg-sky-600',     desc: 'Claim substantiation, clinical evidence, regulatory docs' },
  mgmt:       { label: 'Management Committee',          color: 'bg-slate-800',   desc: 'Marketing Head, Sales, R&D, GDSO, Regulatory Head, CFO' },
  ceo:        { label: 'CEO',                           color: 'bg-black',       desc: 'Final approval authority for PPDs and major decisions' },
  production: { label: 'Production / Plant Trial',      color: 'bg-orange-600',  desc: 'Pilot trials, BOM, MFC, stability batch reports' },
}

// WBS-aligned menu — what each role needs access to per documented workflow
const MENU = [
  { key: 'dashboard',    label: 'Dashboard',             icon: LayoutDashboard, roles: 'all' },
  { key: 'projects',     label: 'Projects',              icon: FolderKanban,    roles: 'all' },
  // PPD: Source creates, PM assigns, Functional reviews, Mgmt/CEO approves
  { key: 'ppd',         label: 'PPD Management',        icon: FileText,        roles: ['admin','source','pm','fd','rd_head','marketing','regulatory','packaging','sa','adl','pmsa','mgmt','ceo'] },
  // Formulation: F&D team + R&D Head (after PPD CEO-approved)
  { key: 'formulation', label: 'Formulation Dev.',      icon: FlaskConical,    roles: ['admin','fd','rd_head','adl'] },
  // Lab Book: F&D team, ADL lab, R&D Head
  { key: 'labbook',     label: 'E-Lab Notebook',        icon: Notebook,        roles: ['admin','fd','rd_head','adl'] },
  // Plant Trials: Production team, Packaging, R&D Head
  { key: 'plant',       label: 'Plant Trials',          icon: Factory,         roles: ['admin','production','rd_head','packaging','fd'] },
  // Regulatory: Regulatory team reviews FD docs, R&D Head oversees
  { key: 'regulatory',  label: 'Regulatory',            icon: ShieldCheck,     roles: ['admin','regulatory','rd_head','sa'] },
  // Sensory: PM&SA team, ADL lab, R&D Head
  { key: 'sensory',     label: 'Sensory & Analytical',  icon: TestTube2,       roles: ['admin','pmsa','adl','rd_head','fd'] },
  // Costing: Packaging, R&D Head, Management (view)
  { key: 'costing',     label: 'Costing & Feasibility', icon: Calculator,      roles: ['admin','packaging','rd_head','mgmt'] },
  // Claims: Scientific Affairs, R&D Head, Regulatory
  { key: 'claim',       label: 'Claim Substantiation',  icon: BadgeCheck,      roles: ['admin','sa','rd_head','regulatory'] },
  // Artwork: Packaging manages, Marketing reviews
  { key: 'artwork',     label: 'Artwork (Karomi)',       icon: Palette,         roles: ['admin','packaging','marketing','production'] },
  // Master Data: SAP integration — PM, Packaging, Production manage
  { key: 'master',      label: 'Master Data (SAP)',      icon: Database,        roles: ['admin','production','packaging','pm'] },
  { key: 'reports',     label: 'Reports & Analytics',   icon: BarChart3,       roles: 'all' },
  { key: 'archive',     label: 'Archive',               icon: Archive,         roles: 'all' },
  // Admin-only tools
  { key: 'admin_users',   label: 'Users',                icon: Users,           roles: ['admin'], group: 'Administration' },
  { key: 'admin_roles',   label: 'Roles & Permissions',  icon: KeyRound,        roles: ['admin'], group: 'Administration' },
  { key: 'admin_masters', label: 'Master Configuration', icon: Settings,        roles: ['admin'], group: 'Administration' },
  { key: 'audit',         label: 'Audit Logs',           icon: ScrollText,      roles: ['admin','mgmt','ceo'], group: 'Administration' },
]

/* -------------------- MOCK DATA -------------------- */
const MOCK_PROJECTS = [
  { id: 'ZW-2026-001', name: 'Complan Pro Chocolate Boost', brand: 'Complan', type: 'New Product', status: 'PPD Review', progress: 25, owner: 'Rahul Mehta', updated: '2 hrs ago', priority: 'High' },
  { id: 'ZW-2026-002', name: 'Sugar Free Green Stevia+', brand: 'Sugar Free', type: 'Product Improvement', status: 'Formulation', progress: 55, owner: 'Priya Sharma', updated: '5 hrs ago', priority: 'Medium' },
  { id: 'ZW-2026-003', name: 'Nycil Cool Menthol XT', brand: 'Nycil', type: 'Innovation', status: 'Plant Trial', progress: 78, owner: 'Anil Kumar', updated: '1 day ago', priority: 'High' },
  { id: 'ZW-2026-004', name: 'Glucon-D Immunity+ Orange', brand: 'Glucon-D', type: 'AVD', status: 'Regulatory Review', progress: 62, owner: 'Sneha Patel', updated: '3 hrs ago', priority: 'Medium' },
  { id: 'ZW-2026-005', name: 'Everyuth Naturals Aloe Face Wash', brand: 'Everyuth', type: 'Cost Reduction', status: 'CEO Approval', progress: 92, owner: 'Vikram Singh', updated: '30 mins ago', priority: 'Critical' },
  { id: 'ZW-2026-006', name: 'Complan NutriGro Strawberry', brand: 'Complan', type: 'New Product', status: 'Draft', progress: 10, owner: 'Rahul Mehta', updated: '1 hr ago', priority: 'Low' },
  { id: 'ZW-2025-098', name: 'Nutralite Choco Spread Lite', brand: 'Nutralite', type: 'Sustainability', status: 'Completed', progress: 100, owner: 'Meera Iyer', updated: '3 days ago', priority: 'Medium' },
]

const STATUS_COLORS = {
  'Draft': 'bg-slate-200 text-slate-800',
  'PPD Review': 'bg-blue-100 text-blue-800',
  'Formulation': 'bg-emerald-100 text-emerald-800',
  'Plant Trial': 'bg-orange-100 text-orange-800',
  'Regulatory Review': 'bg-red-100 text-red-800',
  'CEO Approval': 'bg-purple-100 text-purple-800',
  'Completed': 'bg-green-600 text-white',
  'Archived': 'bg-gray-500 text-white',
  'Rework': 'bg-amber-100 text-amber-800',
}

/* -------------------- API CONFIG -------------------- */
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://fmcg-software.onrender.com').replace(/\/$/, '')

async function apiCall(path, { method = 'GET', body, token } = {}) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }
  const res = await fetch(`${API_BASE}${path}`, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

/* -------------------- APP ROOT -------------------- */
// SOW requirement: auto-logout after 5 minutes of inactivity
const SESSION_TIMEOUT_MS = 5 * 60 * 1000  // 5 minutes

export default function App() {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [view, setView] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleLogin = (userData, accessToken) => {
    setUser(userData)
    setToken(accessToken)
  }

  const handleLogout = () => {
    setUser(null)
    setToken(null)
    setView('dashboard')
  }

  // ── 5-minute inactivity auto-logout ──────────────────────────────────────
  useEffect(() => {
    if (!user) return
    let timer = null

    const reset = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        toast.warning('Session expired due to inactivity. Please sign in again.')
        handleLogout()
      }, SESSION_TIMEOUT_MS)
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))
    reset() // start timer immediately on login

    return () => {
      clearTimeout(timer)
      events.forEach(e => window.removeEventListener(e, reset))
    }
  }, [user])

  if (!user) return <Login onLogin={handleLogin} />
  return <Shell user={user} token={token} view={view} setView={setView} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} onLogout={handleLogout} />
}

/* -------------------- AUTH PAGES (Login / Signup / Forgot / OTP / Reset) ---- */

/** Shared left-panel brand block */
function BrandPanel() {
  return (
    <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 text-white relative overflow-hidden">
      <div className="relative z-10">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">FMCG Software</h1>
            <p className="text-sm opacity-80">FMCG Product Development Platform</p>
          </div>
        </div>
      </div>
      <div className="relative z-10 space-y-6">
        <h2 className="text-4xl font-bold leading-tight">Digitizing the future of <span className="text-orange-400">FMCG innovation</span></h2>
        <p className="text-lg opacity-80 max-w-md">End-to-end product lifecycle management — from PPD to plant trials, approvals, and archival.</p>
        <div className="grid grid-cols-3 gap-4 pt-6">
          {[{ l: 'Brands', v: '12+' }, { l: 'Active Projects', v: '48' }, { l: 'Teams', v: '14' }].map(s => (
            <div key={s.l} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
              <div className="text-2xl font-bold">{s.v}</div>
              <div className="text-xs opacity-80">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="relative z-10 text-xs opacity-70">© 2026 FMCG Software. All rights reserved.</div>
    </div>
  )
}

/** API status badge */
function ApiStatusBadge({ status }) {
  return null
}

/* ── LOGIN ── */
function Login({ onLogin }) {
  const [email, setEmail]       = useState('admin@fmcgsoftware.com')
  const [password, setPassword] = useState('Welcome@123')
  const [role, setRole]         = useState('admin')
  const [loading, setLoading]   = useState(false)
  const [apiStatus, setApiStatus] = useState(null)
  const [authPage, setAuthPage] = useState('login') // 'login' | 'signup' | 'forgot'

  useEffect(() => {
    fetch(`${API_BASE}/health`).then(() => setApiStatus('online')).catch(() => setApiStatus('offline'))
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) return toast.error('Please enter credentials')
    setLoading(true)
    try {
      const data = await apiCall('/api/auth/login', { method: 'POST', body: { email, password, role } })
      onLogin(data.user, data.access_token)
      toast.success(`Welcome, ${ROLES[data.user.role]?.label || data.user.role}`)
    } catch (err) {
      toast.error(err.message || 'Login failed')
    } finally { setLoading(false) }
  }

  if (authPage === 'signup') return <Signup onBack={() => setAuthPage('login')} onLogin={onLogin} apiStatus={apiStatus} />
  if (authPage === 'forgot') return <ForgotPassword onBack={() => setAuthPage('login')} apiStatus={apiStatus} />

  return (
    <div className="min-h-screen flex auth-pattern">
      <BrandPanel />
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="space-y-1 text-center">
            <div className="lg:hidden mx-auto h-12 w-12 rounded-xl bg-primary flex items-center justify-center mb-2">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <CardTitle className="text-2xl">Sign in to your account</CardTitle>
            <CardDescription>Secure access • Role-based • Access is audited</CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Employee Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@fmcgsoftware.com" autoComplete="email" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password">Password</Label>
                  <button type="button" onClick={() => setAuthPage('forgot')} className="text-xs text-primary hover:underline">Forgot password?</button>
                </div>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Login as</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger id="role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">In production, role is derived from your AD/SSO profile.</p>
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-3">
              <ApiStatusBadge status={apiStatus} />
              <Button type="submit" disabled={loading} className="w-full h-11 text-base">
                {loading && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
                Sign In Securely
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                New user?{' '}
                <button type="button" onClick={() => setAuthPage('signup')} className="text-primary hover:underline font-medium">Create account</button>
              </p>
              <p className="text-xs text-muted-foreground text-center">Access is secured & audited</p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}

/* ── SIGNUP ── */
function Signup({ onBack, onLogin, apiStatus }) {
  const [form, setForm] = useState({ name: '', email: '', department: '', role: 'fd', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSignup = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.department || !form.password)
      return toast.error('Please fill all fields')
    if (form.password.length < 8)
      return toast.error('Password must be at least 8 characters')
    if (form.password !== form.confirm)
      return toast.error('Passwords do not match')
    setLoading(true)
    try {
      const data = await apiCall('/api/auth/signup', {
        method: 'POST',
        body: { name: form.name, email: form.email, department: form.department, role: form.role, password: form.password },
      })
      onLogin(data.user, data.access_token)
      toast.success(`Account created! Welcome, ${data.user.name}`)
    } catch (err) {
      toast.error(err.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex auth-pattern">
      <BrandPanel />
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl">Create your account</CardTitle>
            <CardDescription>Register to access the FMCG Software platform</CardDescription>
          </CardHeader>
          <form onSubmit={handleSignup}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={form.name} onChange={set('name')} placeholder="Dr. Anjali Rao" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={set('email')} placeholder="name@fmcgsoftware.com" autoComplete="email" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input value={form.department} onChange={set('department')} placeholder="R&D" />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLES).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Password <span className="text-muted-foreground text-xs">(min 8 chars)</span></Label>
                <Input type="password" value={form.password} onChange={set('password')} autoComplete="new-password" />
              </div>
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <Input type="password" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-3">
              <ApiStatusBadge status={apiStatus} />
              <Button type="submit" disabled={loading} className="w-full h-11 text-base">
                {loading && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
                Create Account
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Already have an account?{' '}
                <button type="button" onClick={onBack} className="text-primary hover:underline font-medium">Sign in</button>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}

/* ── FORGOT PASSWORD (3-step: email → OTP → new password) ── */
function ForgotPassword({ onBack, apiStatus }) {
  const [step, setStep]         = useState(1)          // 1 = email, 2 = otp, 3 = new password
  const [email, setEmail]       = useState('')
  const [otp, setOtp]           = useState('')
  const [otpInputs, setOtpInputs] = useState(['', '', '', '', '', ''])
  const [newPass, setNewPass]   = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [resendTimer, setResendTimer] = useState(0)

  // countdown timer for resend
  useEffect(() => {
    if (resendTimer <= 0) return
    const t = setTimeout(() => setResendTimer(r => r - 1), 1000)
    return () => clearTimeout(t)
  }, [resendTimer])

  // Join OTP digit inputs into a string
  const otpValue = otpInputs.join('')

  const handleOtpDigit = (idx, val) => {
    if (!/^\d?$/.test(val)) return
    const next = [...otpInputs]
    next[idx] = val
    setOtpInputs(next)
    if (val && idx < 5) document.getElementById(`otp-${idx + 1}`)?.focus()
    if (!val && idx > 0) document.getElementById(`otp-${idx - 1}`)?.focus()
  }

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setOtpInputs(pasted.split(''))
      e.preventDefault()
    }
  }

  // Step 1: send OTP
  const sendOtp = async (e) => {
    e.preventDefault()
    if (!email) return toast.error('Please enter your email')
    setLoading(true)
    try {
      await apiCall('/api/auth/forgot-password', { method: 'POST', body: { email } })
      toast.success('OTP sent! Check your email (or terminal in dev mode)')
      setStep(2)
      setResendTimer(60)
    } catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  // Resend OTP
  const resendOtp = async () => {
    if (resendTimer > 0) return
    setLoading(true)
    try {
      await apiCall('/api/auth/forgot-password', { method: 'POST', body: { email } })
      toast.success('New OTP sent!')
      setOtpInputs(['', '', '', '', '', ''])
      setResendTimer(60)
    } catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  // Step 2: verify OTP
  const verifyOtp = async (e) => {
    e.preventDefault()
    if (otpValue.length !== 6) return toast.error('Please enter the 6-digit OTP')
    setLoading(true)
    try {
      await apiCall('/api/auth/verify-otp', { method: 'POST', body: { email, otp: otpValue } })
      toast.success('OTP verified!')
      setStep(3)
    } catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  // Step 3: reset password
  const resetPassword = async (e) => {
    e.preventDefault()
    if (newPass.length < 8) return toast.error('Password must be at least 8 characters')
    if (newPass !== confirm) return toast.error('Passwords do not match')
    setLoading(true)
    try {
      await apiCall('/api/auth/reset-password', { method: 'POST', body: { email, otp: otpValue, new_password: newPass } })
      toast.success('Password reset! You can now log in.')
      onBack()
    } catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  const stepTitles = ['Forgot Password', 'Enter OTP', 'Set New Password']
  const stepDescs  = [
    'Enter your registered email and we\'ll send a 6-digit OTP.',
    `We sent a 6-digit code to ${email}`,
    'Choose a strong new password.',
  ]

  return (
    <div className="min-h-screen flex auth-pattern">
      <BrandPanel />
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3].map(n => (
                <div key={n} className={`h-2 rounded-full transition-all duration-300 ${n === step ? 'w-8 bg-primary' : n < step ? 'w-4 bg-primary/40' : 'w-4 bg-muted'}`} />
              ))}
            </div>
            <CardTitle className="text-2xl">{stepTitles[step - 1]}</CardTitle>
            <CardDescription>{stepDescs[step - 1]}</CardDescription>
          </CardHeader>

          {/* Step 1: Email */}
          {step === 1 && (
            <form onSubmit={sendOtp}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fp-email">Registered Email</Label>
                  <Input id="fp-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@fmcgsoftware.com" autoFocus />
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-3">
                <ApiStatusBadge status={apiStatus} />
                <Button type="submit" disabled={loading} className="w-full h-11">
                  {loading && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
                  Send OTP
                </Button>
                <button type="button" onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">
                  ← Back to Sign In
                </button>
              </CardFooter>
            </form>
          )}

          {/* Step 2: OTP */}
          {step === 2 && (
            <form onSubmit={verifyOtp}>
              <CardContent className="space-y-6">
                <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                  {otpInputs.map((d, i) => (
                    <Input
                      key={i}
                      id={`otp-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={e => handleOtpDigit(i, e.target.value)}
                      onKeyDown={e => { if (e.key === 'Backspace' && !d && i > 0) document.getElementById(`otp-${i - 1}`)?.focus() }}
                      className="w-12 h-14 text-center text-2xl font-bold tracking-widest"
                      autoFocus={i === 0}
                    />
                  ))}
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  {resendTimer > 0
                    ? `Resend OTP in ${resendTimer}s`
                    : <button type="button" onClick={resendOtp} className="text-primary hover:underline">Resend OTP</button>
                  }
                </p>
              </CardContent>
              <CardFooter className="flex-col gap-3">
                <Button type="submit" disabled={loading || otpValue.length !== 6} className="w-full h-11">
                  {loading && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
                  Verify OTP
                </Button>
                <button type="button" onClick={() => setStep(1)} className="text-sm text-muted-foreground hover:text-foreground">
                  ← Change Email
                </button>
              </CardFooter>
            </form>
          )}

          {/* Step 3: New Password */}
          {step === 3 && (
            <form onSubmit={resetPassword}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>New Password <span className="text-muted-foreground text-xs">(min 8 chars)</span></Label>
                  <Input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} autoComplete="new-password" autoFocus />
                </div>
                <div className="space-y-2">
                  <Label>Confirm New Password</Label>
                  <Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" />
                </div>
                {newPass && (
                  <div className="space-y-1">
                    {[
                      { ok: newPass.length >= 8,          label: 'At least 8 characters' },
                      { ok: /[A-Z]/.test(newPass),        label: 'One uppercase letter' },
                      { ok: /[0-9]/.test(newPass),        label: 'One number' },
                      { ok: newPass === confirm && !!confirm, label: 'Passwords match' },
                    ].map(({ ok, label }) => (
                      <div key={label} className={`flex items-center gap-2 text-xs ${ok ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                        {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {label}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex-col gap-3">
                <Button type="submit" disabled={loading} className="w-full h-11">
                  {loading && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
                  Reset Password
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}

// Map sidebar menu keys → permission module names
const MENU_TO_MODULE = {
  projects:    'Projects',
  ppd:         'PPD',
  formulation: 'Formulation',
  labbook:     'Lab Notebook',
  plant:       'Plant Trials',
  regulatory:  'Regulatory',
  sensory:     'Sensory',
  costing:     'Costing',
  claim:       'Claim',
  artwork:     'Artwork',
  master:      'Master Data',
  reports:     'Reports',
  archive:     'Archive',
  admin_users: 'Users',
  audit:       'Audit',
}

/* -------------------- SHELL (Sidebar + Header + Content) -------------------- */
function Shell({ user, token, view, setView, sidebarOpen, setSidebarOpen, onLogout }) {
  // Load this user's permissions from DB
  const [userPerms, setUserPerms] = useState(null)   // null = loading, {} = loaded

  useEffect(() => {
    if (!token) { setUserPerms({}); return }
    apiCall('/api/role-permissions/my', { token })
      .then(data => setUserPerms(data.permissions || {}))
      .catch(() => setUserPerms({}))  // fallback: show all on API failure
  }, [token, user.role])

  // Helper: can current user perform `action` on `module`?
  const can = useCallback((module, action = 'view') => {
    if (user.role === 'admin') return true   // admin always has full access
    if (!userPerms) return false             // still loading
    return !!userPerms[module]?.[action]
  }, [userPerms, user.role])

  // Filter sidebar — show item only when the role has `view` permission for its module.
  // If admin has explicitly removed view permission, hide the item entirely (no "Access Denied").
  const isVisible = (item) => {
    if (user.role === 'admin') return true
    if (item.roles === 'all') {
      // For "all-roles" items check if view permission was explicitly revoked
      const moduleName = MENU_TO_MODULE[item.key]
      if (!moduleName || !userPerms) return true   // no perm record → keep visible
      // If the module has a permission record and view is explicitly false, hide it
      if (userPerms[moduleName] && userPerms[moduleName].view === false) return false
      return true
    }
    // Role-restricted item: must be in the hardcoded roles list
    if (!item.roles.includes(user.role)) return false
    // Also check DB permission — if view is explicitly false, hide even if role matches
    const moduleName = MENU_TO_MODULE[item.key]
    if (!moduleName) return true                         // no module mapping → just use role list
    if (userPerms === null) return false                 // still loading permissions → hide until ready
    if (userPerms[moduleName] && userPerms[moduleName].view === false) return false  // explicitly denied
    return true
  }

  const menuItems = MENU.filter(isVisible)
  const mainMenu  = menuItems.filter(m => !m.group)
  const adminMenu = menuItems.filter(m => m.group === 'Administration')

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-sidebar text-sidebar-foreground transition-all duration-200 flex flex-col shrink-0`}>
        <div className="h-16 flex items-center gap-3 px-4 border-b border-sidebar-border">
          <div className="h-9 w-9 rounded-lg bg-white flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate">FMCG Software</div>
              <div className="text-[10px] opacity-70 truncate">FMCG Dev Platform</div>
            </div>
          )}
        </div>
        <ScrollArea className="flex-1 py-2">
          <nav className="px-2 space-y-0.5">
            {/* Dashboard always visible */}
            <NavItem item={MENU[0]} active={view === 'dashboard'} onClick={() => setView('dashboard')} collapsed={!sidebarOpen} />
            {mainMenu.filter(m => m.key !== 'dashboard').map(item => (
              <NavItem key={item.key} item={item} active={view === item.key} onClick={() => setView(item.key)} collapsed={!sidebarOpen} />
            ))}
            {adminMenu.length > 0 && (
              <>
                {sidebarOpen && <div className="px-3 pt-4 pb-1 text-[10px] uppercase tracking-wider opacity-60">Administration</div>}
                {adminMenu.map(item => (
                  <NavItem key={item.key} item={item} active={view === item.key} onClick={() => setView(item.key)} collapsed={!sidebarOpen} />
                ))}
              </>
            )}
          </nav>
        </ScrollArea>
        <div className="p-2 border-t border-sidebar-border">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-sidebar-accent text-sm">
            <Menu className="h-4 w-4" />
            {sidebarOpen && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header user={user} onLogout={onLogout} view={view} setView={setView} token={token} />
        <main className="flex-1 overflow-auto">
          <ViewRouter view={view} setView={setView} user={user} token={token} userPerms={userPerms} can={can} />
        </main>
      </div>
    </div>
  )
}

function NavItem({ item, active, onClick, collapsed }) {
  const Icon = item.icon
  return (
    <button
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
        active ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm' : 'hover:bg-sidebar-accent text-sidebar-foreground'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate text-left flex-1">{item.label}</span>}
    </button>
  )
}

/* -------------------- NOTIFICATION PANEL -------------------- */
const NOTIF_ICONS = {
  project_created:  { icon: Plus,         color: 'text-emerald-600', bg: 'bg-emerald-50' },
  project_updated:  { icon: Edit,         color: 'text-blue-600',    bg: 'bg-blue-50'    },
  project_deleted:  { icon: Trash2,       color: 'text-red-600',     bg: 'bg-red-50'     },
  task_assigned:    { icon: FileCheck2,   color: 'text-orange-600',  bg: 'bg-orange-50'  },
  ppd_created:      { icon: FileText,     color: 'text-blue-600',    bg: 'bg-blue-50'    },
  ppd_updated:      { icon: Edit,         color: 'text-cyan-600',    bg: 'bg-cyan-50'    },
  ppd_reviewed:     { icon: CheckCircle2, color: 'text-teal-600',    bg: 'bg-teal-50'    },
  ppd_comment:      { icon: MessageSquare,color: 'text-slate-600',   bg: 'bg-slate-50'   },
  ppd_deleted:      { icon: Trash2,       color: 'text-red-600',     bg: 'bg-red-50'     },
  info:             { icon: Bell,         color: 'text-slate-600',   bg: 'bg-slate-50'   },
}

function NotificationPanel({ token, setView }) {
  const [open, setOpen]           = useState(false)
  const [notifs, setNotifs]       = useState([])
  const [unread, setUnread]       = useState(0)
  const [loading, setLoading]     = useState(false)
  const [markingAll, setMarkingAll] = useState(false)

  // Poll unread count every 15 seconds
  const fetchCount = useCallback(async () => {
    if (!token) return
    try {
      const data = await apiCall('/api/notifications/count', { token })
      setUnread(data.unread || 0)
    } catch (_) {}
  }, [token])

  useEffect(() => {
    fetchCount()
    const t = setInterval(fetchCount, 15000)
    return () => clearInterval(t)
  }, [fetchCount])

  // Load full list when panel opens
  const fetchNotifs = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await apiCall('/api/notifications', { token })
      setNotifs(data)
      setUnread(data.filter(n => !n.is_read).length)
    } catch (_) {}
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { if (open) fetchNotifs() }, [open, fetchNotifs])

  const markRead = async (id) => {
    try {
      await apiCall(`/api/notifications/${id}/read`, { method: 'POST', token })
      setNotifs(ns => ns.map(n => n.id === id ? { ...n, is_read: true } : n))
      setUnread(u => Math.max(0, u - 1))
    } catch (_) {}
  }

  const markAllRead = async () => {
    setMarkingAll(true)
    try {
      await apiCall('/api/notifications/read-all', { method: 'POST', token })
      setNotifs(ns => ns.map(n => ({ ...n, is_read: true })))
      setUnread(0)
    } catch (_) {}
    finally { setMarkingAll(false) }
  }

  const handleClick = (n) => {
    markRead(n.id)
    if (n.entity_id && setView) {
      // Route to the correct module based on entity_id prefix
      const id = n.entity_id || ''
      let dest = 'projects'
      if (id.startsWith('PPD-'))    dest = 'ppd'
      else if (id.startsWith('F-')) dest = 'formulation'
      else if (id.startsWith('EXP-')) dest = 'labbook'
      else if (id.startsWith('PT-')) dest = 'plant'
      else if (id.startsWith('REG-')) dest = 'regulatory'
      else if (id.startsWith('SE-'))  dest = 'sensory'
      else if (id.startsWith('CST-')) dest = 'costing'
      else if (id.startsWith('CLM-')) dest = 'claim'
      else if (id.startsWith('ART-')) dest = 'artwork'
      else if (id.startsWith('NP-') || id.startsWith('ZW-')) dest = 'projects'
      setView(dest)
      toast.info(`Opening: ${n.entity_name || n.entity_id}`)
    }
    setOpen(false)
  }

  const relTime = (iso) => {
    if (!iso) return ''
    const d = Math.floor((Date.now() - new Date(iso)) / 1000)
    if (d < 60)   return 'just now'
    if (d < 3600) return `${Math.floor(d/60)}m ago`
    if (d < 86400)return `${Math.floor(d/3600)}h ago`
    return `${Math.floor(d/86400)}d ago`
  }

  return (
    <div className="relative">
      <Button
        variant="ghost" size="icon"
        className="relative"
        onClick={() => setOpen(o => !o)}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 leading-none">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </Button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div className="absolute right-0 top-12 z-50 w-96 bg-white rounded-xl shadow-2xl border border-border overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Notifications</span>
                {unread > 0 && (
                  <span className="bg-red-100 text-red-700 text-xs font-bold px-1.5 py-0.5 rounded-full">{unread} new</span>
                )}
              </div>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  disabled={markingAll}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  {markingAll && <RefreshCw className="h-3 w-3 animate-spin" />}
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[420px] overflow-y-auto divide-y divide-border">
              {loading ? (
                <div className="space-y-2 p-3">
                  {[1,2,3].map(i => <div key={i} className="h-14 bg-slate-100 rounded animate-pulse" />)}
                </div>
              ) : notifs.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-30" />
                  <p className="text-sm text-muted-foreground">No notifications yet</p>
                </div>
              ) : notifs.map(n => {
                const cfg = NOTIF_ICONS[n.action_type] || NOTIF_ICONS.info
                const Icon = cfg.icon
                return (
                  <div
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${!n.is_read ? 'bg-blue-50/40' : ''}`}
                  >
                    <div className={`h-9 w-9 rounded-full ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon className={`h-4 w-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-snug ${!n.is_read ? 'font-semibold text-foreground' : 'font-medium text-foreground'}`}>
                          {n.title}
                        </p>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">{relTime(n.created_at)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      {n.entity_id && (
                        <span className="text-[10px] font-mono text-primary mt-1 inline-block">{n.entity_id}</span>
                      )}
                    </div>
                    {!n.is_read && (
                      <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-2" />
                    )}
                  </div>
                )
              })}
            </div>

            {notifs.length > 0 && (
              <div className="px-4 py-2 border-t bg-slate-50 text-xs text-center text-muted-foreground">
                {notifs.length} notification{notifs.length !== 1 ? 's' : ''} • Showing last 30
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function Header({ user, onLogout, view, setView, token }) {
  const roleInfo = ROLES[user.role]
  const initials = user.name.split(' ').map(s => s[0]).join('').slice(0,2).toUpperCase()
  return (
    <header className="h-16 bg-white border-b border-border flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-4">
        <button onClick={() => setView('dashboard')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <Home className="h-4 w-4" />
        </button>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-semibold capitalize">{MENU.find(m=>m.key===view)?.label || view}</h2>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search projects, formulas, docs..." className="pl-9 w-80 h-9" />
        </div>
        <NotificationPanel token={token} setView={setView} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 hover:bg-slate-100 rounded-lg p-1 pr-3">
              <Avatar className="h-9 w-9"><AvatarFallback className={`${roleInfo.color} text-white text-xs`}>{initials}</AvatarFallback></Avatar>
              <div className="hidden md:block text-left">
                <div className="text-sm font-medium leading-tight">{user.name}</div>
                <div className="text-[10px] text-muted-foreground">{roleInfo.label}</div>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="font-medium">{user.name}</div>
              <div className="text-xs text-muted-foreground">{user.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem><UserCog className="h-4 w-4 mr-2"/>My Profile</DropdownMenuItem>
            <DropdownMenuItem><Settings className="h-4 w-4 mr-2"/>Preferences</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="text-red-600"><LogOut className="h-4 w-4 mr-2"/>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

/* -------------------- ROUTER -------------------- */
function ViewRouter({ view, setView, user, token, userPerms, can }) {
  const p = "p-6 space-y-6"

  // Map view key → module name so we can check permission for the active view
  const MENU_TO_MODULE_LOCAL = {
    projects:'Projects', ppd:'PPD', formulation:'Formulation',
    labbook:'Lab Notebook', plant:'Plant Trials', regulatory:'Regulatory',
    sensory:'Sensory', costing:'Costing', claim:'Claim', artwork:'Artwork',
    master:'Master Data', reports:'Reports', archive:'Archive', audit:'Audit',
  }

  // Redirect to dashboard if the active view's permission is revoked
  // (runs after render, safe from React state-during-render warning)
  useEffect(() => {
    if (user.role === 'admin' || userPerms === null) return
    const moduleName = MENU_TO_MODULE_LOCAL[view]
    if (!moduleName) return
    if (userPerms[moduleName] && userPerms[moduleName].view === false) {
      setView('dashboard')
    }
  }, [view, userPerms, user.role])

  // Permission guard: show spinner while loading; if view permission is false,
  // return null (useEffect above will redirect to dashboard on next tick).
  const guard = (moduleName, el) => {
    if (user.role === 'admin') return el
    if (userPerms === null) return (
      <div className={p}>
        <div className="text-center py-20 text-muted-foreground text-sm">Loading…</div>
      </div>
    )
    // Permission explicitly false → return null (redirect handled by useEffect above)
    if (userPerms[moduleName] && userPerms[moduleName].view === false) return null
    return el
  }
  switch (view) {
    case 'dashboard':    return <div className={p}><Dashboard user={user} setView={setView} token={token} /></div>
    case 'projects':     return guard('Projects',    <div className={p}><ProjectsView setView={setView} user={user} token={token} can={can} /></div>)
    case 'ppd':          return guard('PPD',         <div className={p}><PPDView user={user} token={token} can={can} /></div>)
    case 'formulation':  return guard('Formulation', <div className={p}><FormulationView user={user} token={token} can={can} /></div>)
    case 'labbook':      return guard('Lab Notebook',<div className={p}><LabBookView user={user} token={token} can={can} /></div>)
    case 'plant':        return guard('Plant Trials',<div className={p}><PlantTrialsView user={user} token={token} can={can} /></div>)
    case 'regulatory':   return guard('Regulatory',  <div className={p}><RegulatoryView user={user} token={token} can={can} /></div>)
    case 'sensory':      return guard('Sensory',     <div className={p}><SensoryView user={user} token={token} can={can} /></div>)
    case 'costing':      return guard('Costing',     <div className={p}><CostingView user={user} token={token} can={can} /></div>)
    case 'claim':        return guard('Claim',       <div className={p}><ClaimView user={user} token={token} can={can} /></div>)
    case 'artwork':      return guard('Artwork',     <div className={p}><ArtworkView user={user} token={token} can={can} /></div>)
    case 'master':       return guard('Master Data', <div className={p}><MasterDataView user={user} token={token} can={can} /></div>)
    case 'reports':      return guard('Reports',     <div className={p}><ReportsView token={token} /></div>)
    case 'archive':      return guard('Archive',     <div className={p}><ArchiveView token={token} /></div>)
    case 'admin_users':  return <div className={p}><UsersAdmin token={token} /></div>
    case 'admin_roles':  return <div className={p}><RolesAdmin token={token} /></div>
    case 'admin_masters':return <div className={p}><MastersAdmin token={token} /></div>
    case 'audit':        return guard('Audit',       <div className={p}><AuditView token={token} /></div>)
    default:             return <div className={p}><Dashboard user={user} setView={setView} token={token} /></div>
  }
}

/* -------------------- ICON MAP (for dynamic stat icons) -------------------- */
const ICON_MAP = {
  FolderKanban, FileCheck2, FlaskConical, CheckCircle2,
  ShieldCheck, AlertCircle, XCircle, Clock, TrendingUp,
  FileText, Package, ClipboardList, RefreshCw, Factory, Users,
  // Additional icons used in role-specific fallback dashboard stats
  TestTube2, BadgeCheck, Bell, Beaker,
}

/* -------------------- ROLE-AWARE TASK STATUS OPTIONS -------------------- */
// Each role is only shown status options relevant to their responsibilities.
// admin/mgmt/ceo see full list; other roles see a subset on THEIR OWN tasks.
const ROLE_TASK_STATUSES = {
  source:     [{ v:'in_progress', l:'Mark In Progress', cls:'text-blue-700 border-blue-300 hover:bg-blue-50' }, { v:'approved', l:'Approve', cls:'text-emerald-700 border-emerald-300 hover:bg-emerald-50' }, { v:'rejected', l:'Reject', cls:'text-red-700 border-red-300 hover:bg-red-50' }, { v:'rework', l:'Request Rework', cls:'text-amber-700 border-amber-300 hover:bg-amber-50' }, { v:'completed', l:'Mark Complete', cls:'text-slate-700 border-slate-300 hover:bg-slate-50' }],
  pm:         [{ v:'in_progress', l:'Mark In Progress', cls:'text-blue-700 border-blue-300 hover:bg-blue-50' }, { v:'completed', l:'Mark Complete', cls:'text-emerald-700 border-emerald-300 hover:bg-emerald-50' }],
  fd:         [{ v:'in_progress', l:'Mark In Progress', cls:'text-blue-700 border-blue-300 hover:bg-blue-50' }, { v:'completed', l:'Mark Complete', cls:'text-emerald-700 border-emerald-300 hover:bg-emerald-50' }],
  rd_head:    [{ v:'in_progress', l:'Mark In Progress', cls:'text-blue-700 border-blue-300 hover:bg-blue-50' }, { v:'approved', l:'Approve', cls:'text-emerald-700 border-emerald-300 hover:bg-emerald-50' }, { v:'rejected', l:'Reject', cls:'text-red-700 border-red-300 hover:bg-red-50' }, { v:'rework', l:'Request Rework', cls:'text-amber-700 border-amber-300 hover:bg-amber-50' }, { v:'completed', l:'Mark Complete', cls:'text-slate-700 border-slate-300 hover:bg-slate-50' }],
  marketing:  [{ v:'in_progress', l:'Mark In Progress', cls:'text-blue-700 border-blue-300 hover:bg-blue-50' }, { v:'approved', l:'Approve', cls:'text-emerald-700 border-emerald-300 hover:bg-emerald-50' }, { v:'rework', l:'Request Rework', cls:'text-amber-700 border-amber-300 hover:bg-amber-50' }, { v:'completed', l:'Mark Complete', cls:'text-slate-700 border-slate-300 hover:bg-slate-50' }],
  regulatory: [{ v:'in_progress', l:'Mark In Progress', cls:'text-blue-700 border-blue-300 hover:bg-blue-50' }, { v:'approved', l:'Approve', cls:'text-emerald-700 border-emerald-300 hover:bg-emerald-50' }, { v:'rework', l:'Request Rework', cls:'text-amber-700 border-amber-300 hover:bg-amber-50' }, { v:'completed', l:'Mark Complete', cls:'text-slate-700 border-slate-300 hover:bg-slate-50' }],
  packaging:  [{ v:'in_progress', l:'Mark In Progress', cls:'text-blue-700 border-blue-300 hover:bg-blue-50' }, { v:'completed', l:'Mark Complete', cls:'text-emerald-700 border-emerald-300 hover:bg-emerald-50' }],
  adl:        [{ v:'in_progress', l:'Mark In Progress', cls:'text-blue-700 border-blue-300 hover:bg-blue-50' }, { v:'completed', l:'Mark Complete', cls:'text-emerald-700 border-emerald-300 hover:bg-emerald-50' }],
  pmsa:       [{ v:'in_progress', l:'Mark In Progress', cls:'text-blue-700 border-blue-300 hover:bg-blue-50' }, { v:'completed', l:'Mark Complete', cls:'text-emerald-700 border-emerald-300 hover:bg-emerald-50' }],
  sa:         [{ v:'in_progress', l:'Mark In Progress', cls:'text-blue-700 border-blue-300 hover:bg-blue-50' }, { v:'approved', l:'Approve / Verify', cls:'text-emerald-700 border-emerald-300 hover:bg-emerald-50' }, { v:'rejected', l:'Reject', cls:'text-red-700 border-red-300 hover:bg-red-50' }, { v:'completed', l:'Mark Complete', cls:'text-slate-700 border-slate-300 hover:bg-slate-50' }],
  mgmt:       [{ v:'in_progress', l:'Mark In Progress', cls:'text-blue-700 border-blue-300 hover:bg-blue-50' }, { v:'approved', l:'Approve', cls:'text-emerald-700 border-emerald-300 hover:bg-emerald-50' }, { v:'rejected', l:'Reject', cls:'text-red-700 border-red-300 hover:bg-red-50' }, { v:'rework', l:'Request Rework', cls:'text-amber-700 border-amber-300 hover:bg-amber-50' }, { v:'completed', l:'Mark Complete', cls:'text-slate-700 border-slate-300 hover:bg-slate-50' }],
  ceo:        [{ v:'in_progress', l:'Mark In Progress', cls:'text-blue-700 border-blue-300 hover:bg-blue-50' }, { v:'approved', l:'Approve', cls:'text-emerald-700 border-emerald-300 hover:bg-emerald-50' }, { v:'rejected', l:'Reject', cls:'text-red-700 border-red-300 hover:bg-red-50' }, { v:'completed', l:'Mark Complete', cls:'text-slate-700 border-slate-300 hover:bg-slate-50' }],
  production: [{ v:'in_progress', l:'Mark In Progress', cls:'text-blue-700 border-blue-300 hover:bg-blue-50' }, { v:'completed', l:'Mark Complete', cls:'text-emerald-700 border-emerald-300 hover:bg-emerald-50' }],
  admin:      [{ v:'in_progress', l:'Mark In Progress', cls:'text-blue-700 border-blue-300 hover:bg-blue-50' }, { v:'approved', l:'Approve', cls:'text-emerald-700 border-emerald-300 hover:bg-emerald-50' }, { v:'rejected', l:'Reject', cls:'text-red-700 border-red-300 hover:bg-red-50' }, { v:'rework', l:'Request Rework', cls:'text-amber-700 border-amber-300 hover:bg-amber-50' }, { v:'completed', l:'Mark Complete', cls:'text-slate-700 border-slate-300 hover:bg-slate-50' }, { v:'cancelled', l:'Cancel', cls:'text-gray-600 border-gray-300 hover:bg-gray-50' }],
}

const TASK_STATUS_BADGE = {
  pending:     'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-800',
  approved:    'bg-emerald-100 text-emerald-800',
  rejected:    'bg-red-100 text-red-800',
  rework:      'bg-amber-100 text-amber-800',
  completed:   'bg-green-100 text-green-800',
  cancelled:   'bg-gray-200 text-gray-600',
}

/* -------------------- MY TASKS PANEL (reusable across module views) -------------------- */
/**
 * Shows tasks assigned to the current role that match the given taskType(s).
 * Displayed at the top of each module view so users can update task status inline.
 * Only rendered when there are matching tasks — otherwise renders nothing.
 */
function MyTasksPanel({ user, token, taskTypes, onStatusChange }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchTasks = useCallback(async () => {
    if (!token || user?.role === 'admin') { setLoading(false); return }
    setLoading(true)
    try {
      const all = await apiCall('/api/projects/tasks/mine', { token })
      const typesArr = Array.isArray(taskTypes) ? taskTypes : [taskTypes]
      const filtered = all.filter(t =>
        t.task_type && typesArr.some(tt => t.task_type.toLowerCase() === tt.toLowerCase())
      )
      setTasks(filtered)
    } catch { setTasks([]) }
    finally { setLoading(false) }
  }, [token, user?.role, taskTypes])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const doStatus = async (t, newStatus) => {
    try {
      await apiCall(`/api/projects/${t.project_id}/tasks/${t.task_id}/status`, {
        method: 'PATCH', token, body: { status: newStatus }
      })
      toast.success(`Task marked as "${newStatus.replace('_', ' ')}"`)
      // re-fetch + notify parent
      fetchTasks()
      if (onStatusChange) onStatusChange()
    } catch (err) { toast.error(err.message) }
  }

  if (loading || tasks.length === 0) return null

  const myStatusOptions = ROLE_TASK_STATUSES[user?.role] || []

  return (
    <Card className="border-l-4 border-l-primary bg-primary/5">
      <CardHeader className="py-3 px-5">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-semibold text-primary">
            My Assigned Tasks ({tasks.length})
          </CardTitle>
          <span className="text-xs text-muted-foreground ml-1">— update status below</span>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-4 pt-0">
        <div className="space-y-2">
          {tasks.map((t) => {
            const statusCls = TASK_STATUS_BADGE[t.status] || TASK_STATUS_BADGE.pending
            const isActionable = !['completed','cancelled','rejected'].includes(t.status)
            return (
              <div key={t.task_id || t.id || t.title} className="flex items-center justify-between gap-3 bg-white rounded-lg px-4 py-2.5 border">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${statusCls}`}>
                      {(t.status || 'pending').replace('_', ' ')}
                    </span>
                    <span className="text-sm font-medium truncate">{t.task}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t.project} • Due: {t.due}
                    <Badge variant={t.priority === 'Critical' ? 'destructive' : t.priority === 'High' ? 'default' : 'secondary'} className="ml-2 text-[10px] py-0">{t.priority}</Badge>
                  </div>
                </div>
                {isActionable && myStatusOptions.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" className="h-7 text-xs px-2 gap-1 shrink-0">
                        Update <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuLabel className="text-xs text-muted-foreground pb-1">
                        {ROLES[user?.role]?.label || user?.role}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {myStatusOptions.map(opt => (
                        <DropdownMenuItem
                          key={opt.v}
                          className={`text-xs cursor-pointer ${opt.cls}`}
                          onClick={() => doStatus(t, opt.v)}
                        >
                          {opt.l}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

/* -------------------- DASHBOARD -------------------- */
function Dashboard({ user, setView, token }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchDashboard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const result = await apiCall('/api/dashboard', { token })
      setData(result)
      setError(null)
    } catch (err) {
      setError(err.message)
      // If API is unreachable, use built-in fallback data so the page still shows
      if (!data) {
        setData(FALLBACK_DASHBOARD(user.role))
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [token, user.role])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  const stats   = data?.stats           || FALLBACK_DASHBOARD(user.role).stats
  const tasks   = data?.pending_tasks   || FALLBACK_DASHBOARD(user.role).pending_tasks
  const activity= data?.recent_activity || FALLBACK_DASHBOARD(user.role).recent_activity
  const pipeline= data?.pipeline        || FALLBACK_DASHBOARD(user.role).pipeline

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {user.name.split(' ')[0]} 👋</h1>
          <p className="text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{ROLES[user.role]?.label || user.role}</span>
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="icon" onClick={() => fetchDashboard(true)} disabled={refreshing} title="Refresh dashboard">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          {/* Only source, pm, and admin can create new projects per WBS */}
          {['admin','source','pm'].includes(user.role) && (
            <Button onClick={() => setView('projects')} className="gap-2"><Plus className="h-4 w-4"/>New Project</Button>
          )}
        </div>
      </div>

      {/* ── Stat Cards ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <Card key={i} className="overflow-hidden animate-pulse">
              <CardContent className="p-6 h-24 bg-slate-100 rounded" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(s => {
            const Icon = ICON_MAP[s.icon] || FolderKanban
            return (
              <Card key={s.label} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-muted-foreground">{s.label}</p>
                      <p className="text-3xl font-bold mt-2">{s.value}</p>
                      <p className="text-xs mt-1">
                        <span className={s.change?.startsWith('+')?'text-emerald-600':'text-red-600'}>{s.change}</span> this month
                      </p>
                    </div>
                    <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Tasks + Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>My Pending Tasks</CardTitle>
              <CardDescription>
                Items assigned to <span className="font-semibold text-foreground">{ROLES[user.role]?.label || user.role}</span> — use the status dropdown to take action
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setView('projects')}>View all</Button>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">{[1,2,3].map(i=><div key={i} className="h-8 bg-slate-100 rounded animate-pulse"/>)}</div>
            ) : tasks.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">🎉 No pending tasks — you're all caught up!</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((t) => {
                    const typeMap = {
                      formulation: 'formulation', lab: 'labbook', labbook: 'labbook',
                      regulatory: 'regulatory', sensory: 'sensory', costing: 'costing',
                      claim: 'claim', plant: 'plant', production: 'plant',
                      artwork: 'artwork', master: 'master',
                      approval: 'ppd', review: 'ppd', report: 'projects',
                    }
                    const dest = (t.task_type && typeMap[t.task_type.toLowerCase()]) ||
                      (t.task?.toLowerCase().includes('formula') ? 'formulation' :
                       t.task?.toLowerCase().includes('regulat') ? 'regulatory' :
                       t.task?.toLowerCase().includes('sensory') ? 'sensory' :
                       t.task?.toLowerCase().includes('plant') ? 'plant' :
                       t.task?.toLowerCase().includes('ppd') ? 'ppd' : 'projects')
                    // Role-specific status options — only show for the current user's role
                    const myStatusOptions = ROLE_TASK_STATUSES[user.role] || ROLE_TASK_STATUSES['fd']
                    const currentStatusKey = t.status || 'pending'
                    const statusBadgeCls = TASK_STATUS_BADGE[currentStatusKey] || TASK_STATUS_BADGE.pending
                    const isActionable = t.task_id && t.project_id && token && !['completed','cancelled','rejected'].includes(currentStatusKey)
                    return (
                      <TableRow key={t.task_id || t.id || `${t.project}-${t.task}`}>
                        <TableCell className="font-medium max-w-[130px] truncate" title={t.project}>{t.project}</TableCell>
                        <TableCell className="max-w-[180px]">
                          <span className="text-sm">{t.task}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={t.priority==='Critical'?'destructive':t.priority==='High'?'default':'secondary'} className="text-xs">{t.priority}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadgeCls}`}>
                            {currentStatusKey.replace('_', ' ')}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">{t.due}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 flex-wrap">
                            {/* Open module button */}
                            <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => { setView(dest); toast.info(`Opening ${t.project}`) }}>
                              <Eye className="h-3 w-3 mr-1"/>Open
                            </Button>
                            {/* Role-specific status update — only shown when task is actionable */}
                            {isActionable && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="outline" className="h-7 text-xs px-2 gap-1">
                                    Update Status <ChevronDown className="h-3 w-3"/>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                                    {ROLES[user.role]?.label || user.role} actions
                                  </DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {myStatusOptions.map(opt => (
                                    <DropdownMenuItem
                                      key={opt.v}
                                      className="text-xs cursor-pointer"
                                      onClick={async () => {
                                        try {
                                          await apiCall(`/api/projects/${t.project_id}/tasks/${t.task_id}/status`, { method: 'PATCH', token, body: { status: opt.v } })
                                          toast.success(`Task marked as "${opt.l}"`)
                                          fetchDashboard(true)
                                        } catch(err) { toast.error(err.message) }
                                      }}
                                    >
                                      {opt.l}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent Activity</CardTitle><CardDescription>Latest updates across projects</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-3">{[1,2,3,4].map(i=><div key={i} className="h-10 bg-slate-100 rounded animate-pulse"/>)}</div>
            ) : (
              activity.map((a, i) => (
                <div key={i} className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-primary text-white">
                      {a.user.split(' ').map(s=>s[0]).join('').slice(0,2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-sm">
                    <div><span className="font-medium">{a.user}</span> {a.action}</div>
                    <div className="text-muted-foreground text-xs">{a.project} • {a.time} ago</div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Pipeline ── */}
      <Card>
        <CardHeader><CardTitle>Active Projects Pipeline</CardTitle><CardDescription>Live status across all lifecycle stages</CardDescription></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {loading ? (
              [1,2,3,4,5,6].map(i=><div key={i} className="h-20 bg-slate-100 rounded animate-pulse"/>)
            ) : (
              pipeline.map(s => (
                <div key={s.stage} className="p-4 rounded-lg border bg-slate-50">
                  <div className="text-xs text-muted-foreground">{s.stage}</div>
                  <div className="text-2xl font-bold">{s.count}</div>
                  <Progress value={s.progress} className="h-1 mt-2" />
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/* -------------------- FALLBACK DASHBOARD DATA (when API offline) -------------------- */
function FALLBACK_DASHBOARD(role) {
  const ROLE_OVERRIDES = {
    fd: {
      stats: [
        { label: 'My Formulas',       value: 8,  change: '+2', icon: 'FlaskConical', color: 'from-emerald-500 to-emerald-700' },
        { label: 'Pending Lab Tests', value: 3,  change: '+1', icon: 'FileCheck2',   color: 'from-orange-500 to-orange-700' },
        { label: 'Awaiting Approval', value: 2,  change: '0',  icon: 'Clock',        color: 'from-blue-500 to-blue-700' },
        { label: 'Completed Trials',  value: 5,  change: '+1', icon: 'CheckCircle2', color: 'from-purple-500 to-purple-700' },
      ],
      pending_tasks: [
        { project: 'Complan Pro Chocolate',  task: 'Update formula F-04 protein %', priority: 'High',   due: 'Today' },
        { project: 'Sugar Free Stevia+',     task: 'Lab trial report submission',   priority: 'Medium', due: 'Tomorrow' },
      ],
    },
    source: {
      stats: [
        { label: 'My PPDs (Draft)',       value: 3,  change: '+1', icon: 'FileText',     color: 'from-blue-500 to-blue-700' },
        { label: 'Under PM Review',       value: 2,  change: '0',  icon: 'Clock',         color: 'from-cyan-500 to-cyan-700' },
        { label: 'Awaiting Mgmt Approval',value: 1,  change: '0',  icon: 'FileCheck2',   color: 'from-orange-500 to-orange-700' },
        { label: 'CEO Approved (Live)',   value: 4,  change: '+2', icon: 'CheckCircle2', color: 'from-emerald-500 to-emerald-700' },
      ],
      pending_tasks: [
        { project: 'Complan NutriGro',     task: 'Complete PPD form & submit for PM review', priority: 'High',   due: 'Today' },
        { project: 'Sugar Free Stevia+',   task: 'Incorporate rework feedback from Mgmt',     priority: 'Medium', due: 'Tomorrow' },
      ],
    },
    pm: {
      stats: [
        { label: 'PPDs Awaiting Assignment', value: 4,  change: '+2', icon: 'ClipboardList', color: 'from-cyan-500 to-cyan-700' },
        { label: 'Active Projects',           value: 12, change: '+1', icon: 'FolderKanban',  color: 'from-blue-500 to-blue-700' },
        { label: 'Dept Reviews Pending',      value: 7,  change: '+3', icon: 'Clock',          color: 'from-orange-500 to-orange-700' },
        { label: 'Projects Completed (Q1)',  value: 5,  change: '+2', icon: 'CheckCircle2',  color: 'from-emerald-500 to-emerald-700' },
      ],
      pending_tasks: [
        { project: 'Complan Pro Chocolate', task: 'Review PPD draft & assign dept teams', priority: 'High',   due: 'Today' },
        { project: 'Glucon-D Immunity+',    task: 'Track departmental review progress',    priority: 'Medium', due: 'Tomorrow' },
      ],
    },
    adl: {
      stats: [
        { label: 'Lab Experiments Active', value: 6,  change: '+2', icon: 'FlaskConical', color: 'from-indigo-500 to-indigo-700' },
        { label: 'Sensory Evals Scheduled',value: 3,  change: '+1', icon: 'FileCheck2',   color: 'from-teal-500 to-teal-700' },
        { label: 'Awaiting Sign-off',       value: 2,  change: '0',  icon: 'Clock',         color: 'from-orange-500 to-orange-700' },
        { label: 'Completed This Month',   value: 8,  change: '+3', icon: 'CheckCircle2', color: 'from-emerald-500 to-emerald-700' },
      ],
      pending_tasks: [
        { project: 'Sugar Free Stevia+',    task: 'Stability batch test at 40°C',    priority: 'High',   due: 'Today' },
        { project: 'Complan Pro Chocolate', task: 'ADL protein & fat analysis',       priority: 'Medium', due: '2 days' },
      ],
    },
    pmsa: {
      stats: [
        { label: 'Sensory Evals Due',      value: 3,  change: '+1', icon: 'TestTube2',   color: 'from-teal-500 to-teal-700' },
        { label: 'Claim Reviews Pending',  value: 2,  change: '0',  icon: 'BadgeCheck',  color: 'from-sky-500 to-sky-700' },
        { label: 'Reports Submitted',      value: 5,  change: '+2', icon: 'FileCheck2',  color: 'from-emerald-500 to-emerald-700' },
        { label: 'Active Assignments',     value: 4,  change: '+1', icon: 'Users',       color: 'from-blue-500 to-blue-700' },
      ],
      pending_tasks: [
        { project: 'Nycil Cool Menthol XT', task: 'Sensory panel evaluation report',    priority: 'High',   due: 'Today' },
        { project: 'Everyuth Aloe',          task: 'Upload sensory scorecard',           priority: 'Medium', due: '2 days' },
      ],
    },
    sa: {
      stats: [
        { label: 'Claims Under Review',    value: 4,  change: '+2', icon: 'BadgeCheck',  color: 'from-sky-500 to-sky-700' },
        { label: 'Evidence Verified',      value: 7,  change: '+3', icon: 'CheckCircle2',color: 'from-emerald-500 to-emerald-700' },
        { label: 'Clinical Reports Due',   value: 1,  change: '0',  icon: 'FileText',    color: 'from-orange-500 to-orange-700' },
        { label: 'Rejected Claims',        value: 1,  change: '-1', icon: 'XCircle',     color: 'from-red-500 to-red-700' },
      ],
      pending_tasks: [
        { project: 'Complan Pro Chocolate', task: 'Clinical evidence for cognitive claim', priority: 'High',   due: 'Today' },
        { project: 'Sugar Free Stevia+',    task: 'Substantiate low-glycaemic index claim',priority: 'Medium', due: '3 days' },
      ],
    },
    regulatory: {
      stats: [
        { label: 'Pending Reviews',    value: 5, change: '+2', icon: 'ShieldCheck',  color: 'from-red-500 to-red-700' },
        { label: 'Approved',           value: 8, change: '+3', icon: 'CheckCircle2', color: 'from-emerald-500 to-emerald-700' },
        { label: 'Rework Requested',   value: 2, change: '-1', icon: 'AlertCircle',  color: 'from-orange-500 to-orange-700' },
        { label: 'Overdue Items',      value: 1, change: '0',  icon: 'XCircle',      color: 'from-purple-500 to-purple-700' },
      ],
      pending_tasks: [
        { project: 'Glucon-D Immunity+', task: 'Regulatory Assessment',       priority: 'Medium', due: '2 days' },
        { project: 'Complan NutriGro',   task: 'Ingredient compliance check', priority: 'High',   due: 'Today' },
      ],
    },
    production: {
      stats: [
        { label: 'Plant Trials Scheduled', value: 4, change: '+1', icon: 'Factory',    color: 'from-orange-500 to-orange-700' },
        { label: 'Trials In Progress',     value: 2, change: '0',  icon: 'RefreshCw',  color: 'from-blue-500 to-blue-700' },
        { label: 'Trials Completed',       value: 7, change: '+3', icon: 'CheckCircle2',color: 'from-emerald-500 to-emerald-700' },
        { label: 'Batch Failures',         value: 1, change: '-1', icon: 'XCircle',    color: 'from-purple-500 to-purple-700' },
      ],
      pending_tasks: [
        { project: 'Nycil Cool Menthol XT', task: 'Pilot batch report upload', priority: 'High',   due: 'Today' },
        { project: 'Glucon-D Immunity+',    task: 'Scale-up trial scheduling', priority: 'Medium', due: '3 days' },
      ],
    },
    marketing: {
      stats: [
        { label: 'My PPDs Under Review',   value: 3,  change: '+1', icon: 'FileText',     color: 'from-pink-500 to-pink-700' },
        { label: 'Awaiting Brief',          value: 4,  change: '+2', icon: 'ClipboardList',color: 'from-orange-500 to-orange-700' },
        { label: 'Active Brand Projects',  value: 11, change: '+2', icon: 'Package',       color: 'from-blue-500 to-blue-700' },
        { label: 'Launches This Quarter',  value: 2,  change: '0',  icon: 'TrendingUp',    color: 'from-purple-500 to-purple-700' },
      ],
      pending_tasks: [
        { project: 'Complan Pro Chocolate', task: 'Review PPD v2.1',       priority: 'High',    due: 'Today' },
        { project: 'Everyuth Aloe',         task: 'Provide artwork brief', priority: 'Critical', due: 'Today' },
      ],
    },
  }
  const override = ROLE_OVERRIDES[role] || {}
  return {
    stats: override.stats || [
      { label: 'Active Projects',     value: 24, change: '+3', icon: 'FolderKanban', color: 'from-emerald-500 to-emerald-700' },
      { label: 'Pending Approvals',   value: 7,  change: '+2', icon: 'FileCheck2',   color: 'from-orange-500 to-orange-700' },
      { label: 'In Formulation',      value: 12, change: '-1', icon: 'FlaskConical', color: 'from-blue-500 to-blue-700' },
      { label: 'Completed (Q1)',       value: 18, change: '+5', icon: 'CheckCircle2', color: 'from-purple-500 to-purple-700' },
    ],
    pending_tasks: override.pending_tasks || [
      { project: 'Complan Pro Chocolate',    task: 'Review PPD v2.1',           priority: 'High',     due: 'Today' },
      { project: 'Sugar Free Green Stevia+', task: 'Approve Formulation',       priority: 'Medium',   due: 'Tomorrow' },
      { project: 'Everyuth Aloe Face Wash',  task: 'Sensory Evaluation Report', priority: 'Critical', due: 'Today' },
      { project: 'Glucon-D Immunity+',       task: 'Regulatory Assessment',     priority: 'Medium',   due: '2 days' },
    ],
    recent_activity: [
      { user: 'Priya S.',   action: 'submitted FD for approval',   project: 'Sugar Free Stevia+', time: '5m' },
      { user: 'CEO Office', action: 'approved final PPD',           project: 'Everyuth Aloe',      time: '25m' },
      { user: 'Rahul M.',   action: 'created new project',          project: 'Complan NutriGro',   time: '1h' },
      { user: 'Regulatory', action: 'requested rework',             project: 'Nycil XT',           time: '2h' },
      { user: 'Plant Team', action: 'uploaded stability report',    project: 'Glucon-D',           time: '3h' },
    ],
    pipeline: [
      { stage: 'PPD Draft',    count: 6,  progress: 10 },
      { stage: 'PPD Review',   count: 4,  progress: 25 },
      { stage: 'Formulation',  count: 12, progress: 60 },
      { stage: 'Sensory/Reg',  count: 8,  progress: 45 },
      { stage: 'Plant Trial',  count: 3,  progress: 80 },
      { stage: 'Approvals',    count: 7,  progress: 90 },
    ],
  }
}

/* -------------------- PROJECTS -------------------- */
const BRANDS       = ['Complan','Sugar Free','Nycil','Glucon-D','Everyuth','Nutralite','Sugarlite']
const PROJ_TYPES   = ['New Product','AVD','Innovation','Sustainability','Cost Reduction','Product Improvement']
const PRIORITIES   = ['Low','Medium','High','Critical']
const ALL_ROLE_KEYS = ['source','pm','fd','rd_head','marketing','regulatory','packaging','adl','pmsa','sa','mgmt','ceo','production']

const TASK_TYPES = ['General','Formulation','Regulatory','Packaging','Marketing','Lab Testing','Review','Approval','Other']

function ProjectsView({ setView, user, token, can }) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading]   = useState(true)
  const [q, setQ]               = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [brandFilter, setBrandFilter]   = useState('all')

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ name:'', brand:'Complan', type:'New Product', priority:'Medium', objective:'', target_launch:'' })
  const [creating, setCreating] = useState(false)

  // Detail / Edit dialog
  const [selected, setSelected] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Tasks
  const [tasks, setTasks] = useState([])
  const [tasksLoading, setTasksLoading] = useState(false)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [taskTargetRole, setTaskTargetRole] = useState('')
  const [taskForm, setTaskForm] = useState({ title:'', type:'General', priority:'Medium', due_date:'', due_label:'' })
  const [creatingTask, setCreatingTask] = useState(false)

  const isAdmin    = user?.role === 'admin'
  // WBS: source and pm can also edit projects they are involved with
  const canEditProj = isAdmin || ['source','pm'].includes(user?.role)

  // ── fetch ──
  const fetchProjects = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q)            params.set('q', q)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (brandFilter  !== 'all') params.set('brand',  brandFilter)
      const data = await apiCall(`/api/projects?${params}`, { token })
      setProjects(data)
    } catch (err) {
      toast.error('Failed to load projects: ' + err.message)
    } finally { setLoading(false) }
  }, [q, statusFilter, brandFilter, token])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  // ── create ──
  const handleCreate = async () => {
    if (!form.name || !form.brand || !form.type) return toast.error('Name, Brand and Type are required')
    setCreating(true)
    try {
      await apiCall('/api/projects', { method: 'POST', token, body: form })
      toast.success(`Project "${form.name}" created — visible to all roles`)
      setCreateOpen(false)
      setForm({ name:'', brand:'Complan', type:'New Product', priority:'Medium', objective:'', target_launch:'' })
      fetchProjects()
    } catch (err) { toast.error(err.message) }
    finally { setCreating(false) }
  }

  // ── fetch tasks ──
  const fetchTasks = useCallback(async (pid) => {
    setTasksLoading(true)
    try {
      const data = await apiCall(`/api/projects/${pid}/tasks`, { token })
      setTasks(data)
    } catch { setTasks([]) }
    finally { setTasksLoading(false) }
  }, [token])

  // ── open detail ──
  const openDetail = (p) => {
    setSelected(p)
    setEditForm({
      name:         p.name,
      brand:        p.brand,
      type:         p.type,
      priority:     p.priority,
      status:       p.status,
      progress:     p.progress,
      objective:    p.objective || '',
      target_launch:p.target_launch || '',
    })
    setTasks([])
    fetchTasks(p.project_id)
    setDetailOpen(true)
  }

  // ── save edits ──
  const handleSave = async () => {
    setSaving(true)
    try {
      await apiCall(`/api/projects/${selected.project_id}`, { method: 'PUT', token, body: editForm })
      toast.success('Project updated')
      setDetailOpen(false)
      fetchProjects()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  // ── delete ──
  const handleDelete = async () => {
    if (!confirm(`Delete "${selected.name}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await apiCall(`/api/projects/${selected.project_id}`, { method: 'DELETE', token })
      toast.success('Project deleted')
      setDetailOpen(false)
      fetchProjects()
    } catch (err) { toast.error(err.message) }
    finally { setDeleting(false) }
  }

  // ── CSV download ──
  const downloadCSV = () => {
    const headers = ['Project ID','Name','Brand','Type','Status','Progress','Priority','Owner','Target Launch','Updated At']
    const rows = projects.map(p => [
      p.project_id, p.name, p.brand, p.type, p.status,
      p.progress + '%', p.priority, p.owner, p.target_launch || '', p.updated_at || ''
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'fmcg_software_projects.csv'; a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV downloaded')
  }

  // relative time helper
  const relTime = (iso) => {
    if (!iso) return '—'
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff/60000)
    if (m < 1)   return 'just now'
    if (m < 60)  return `${m}m ago`
    const h = Math.floor(m/60)
    if (h < 24)  return `${h}h ago`
    return `${Math.floor(h/24)}d ago`
  }

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground text-sm">
            {isAdmin ? 'All product development projects — admin view' : `Projects assigned to your team (${ROLES[user?.role]?.label})`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadCSV} className="gap-2"><Download className="h-4 w-4"/>Export CSV</Button>
          {/* WBS: admin, source team, and PM team can all create projects */}
          {(isAdmin || ['source','pm'].includes(user?.role)) && (
            <Button className="gap-2" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4"/>Create Project</Button>
          )}
        </div>
      </div>

      {/* ── Filters ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name or ID..." className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48"><Filter className="h-4 w-4 mr-1"/><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.keys(STATUS_COLORS).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Brands"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchProjects}><RefreshCw className="h-4 w-4 mr-1"/>Refresh</Button>
          </div>
        </CardHeader>

        {/* ── Table ── */}
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />)}
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FolderKanban className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No projects found</p>
              <p className="text-sm">{isAdmin ? 'Create your first project using the button above' : 'No projects assigned to your team yet'}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Project ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-36">Progress</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map(p => (
                  <TableRow key={p.project_id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetail(p)}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.project_id}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{p.name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{p.brand}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.type}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-md font-medium whitespace-nowrap ${STATUS_COLORS[p.status] || 'bg-slate-100'}`}>
                        {p.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={p.progress} className="h-1.5 w-20" />
                        <span className="text-xs tabular-nums">{p.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium ${p.priority==='Critical'?'text-red-600':p.priority==='High'?'text-orange-600':p.priority==='Medium'?'text-blue-600':'text-slate-500'}`}>
                        {p.priority}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{p.owner}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{relTime(p.updated_at)}</TableCell>
                    <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {projects.length > 0 && (
          <div className="px-6 py-2 border-t text-xs text-muted-foreground">
            {projects.length} project{projects.length !== 1 ? 's' : ''} shown
          </div>
        )}
      </Card>

      {/* ── Create Dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>Project will be visible to all roles immediately. You can adjust team access after creation.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-2">
              <Label>Project Name <span className="text-red-500">*</span></Label>
              <Input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Complan Pro Chocolate Boost" />
            </div>
            <div className="space-y-2">
              <Label>Brand <span className="text-red-500">*</span></Label>
              <Select value={form.brand} onValueChange={v => setForm(f=>({...f,brand:v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Project Type <span className="text-red-500">*</span></Label>
              <Select value={form.type} onValueChange={v => setForm(f=>({...f,type:v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PROJ_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm(f=>({...f,priority:v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Target Launch Date</Label>
              <Input type="date" value={form.target_launch} onChange={e => setForm(f=>({...f,target_launch:e.target.value}))} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Objective / Brief</Label>
              <Textarea rows={3} value={form.objective} onChange={e => setForm(f=>({...f,objective:e.target.value}))} placeholder="Describe the product objective, target consumer, key benefits..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Detail / Edit Dialog ── */}
      {selected && (
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <DialogTitle className="text-xl">{selected.name}</DialogTitle>
                  <DialogDescription className="font-mono text-xs mt-1">{selected.project_id} • {selected.brand} • Created by {selected.owner}</DialogDescription>
                </div>
                <span className={`text-xs px-2 py-1 rounded-md font-medium whitespace-nowrap ${STATUS_COLORS[selected.status]||'bg-slate-100'}`}>{selected.status}</span>
              </div>
            </DialogHeader>

            <Tabs defaultValue="details">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="progress">Status & Progress</TabsTrigger>
                <TabsTrigger value="teams">Teams</TabsTrigger>
              </TabsList>

              {/* ── Details tab ── */}
              <TabsContent value="details" className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Project Name</Label>
                    {canEditProj
                      ? <Input value={editForm.name||''} onChange={e => setEditForm(f=>({...f,name:e.target.value}))} />
                      : <p className="text-sm py-2">{editForm.name}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Brand</Label>
                    {canEditProj
                      ? <Select value={editForm.brand||''} onValueChange={v => setEditForm(f=>({...f,brand:v}))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                        </Select>
                      : <p className="text-sm py-2">{editForm.brand}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    {canEditProj
                      ? <Select value={editForm.type||''} onValueChange={v => setEditForm(f=>({...f,type:v}))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{PROJ_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                      : <p className="text-sm py-2">{editForm.type}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    {canEditProj
                      ? <Select value={editForm.priority||''} onValueChange={v => setEditForm(f=>({...f,priority:v}))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{PRIORITIES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                      : <p className="text-sm py-2">{editForm.priority}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Target Launch</Label>
                    {canEditProj
                      ? <Input type="date" value={editForm.target_launch||''} onChange={e => setEditForm(f=>({...f,target_launch:e.target.value}))} />
                      : <p className="text-sm py-2">{editForm.target_launch || '—'}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Owner</Label>
                    <p className="text-sm py-2">{selected.owner}</p>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Objective</Label>
                    {canEditProj
                      ? <Textarea rows={3} value={editForm.objective||''} onChange={e => setEditForm(f=>({...f,objective:e.target.value}))} />
                      : <p className="text-sm py-2 whitespace-pre-line">{editForm.objective || '—'}</p>}
                  </div>
                </div>
              </TabsContent>

              {/* ── Status & Progress tab ── */}
              <TabsContent value="progress" className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Current Status</Label>
                  {canEditProj
                    ? <Select value={editForm.status||''} onValueChange={v => setEditForm(f=>({...f,status:v}))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.keys(STATUS_COLORS).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    : <div className="py-2"><span className={`text-xs px-2 py-1 rounded-md font-medium ${STATUS_COLORS[editForm.status]||'bg-slate-100'}`}>{editForm.status}</span></div>}
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Progress</Label>
                    <span className="text-sm font-semibold">{editForm.progress || 0}%</span>
                  </div>
                  {canEditProj
                    ? <Input type="range" min={0} max={100} step={5}
                        value={editForm.progress || 0}
                        onChange={e => setEditForm(f=>({...f,progress:parseInt(e.target.value)}))}
                        className="w-full cursor-pointer" />
                    : null}
                  <Progress value={editForm.progress || 0} className="h-3" />
                </div>
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {[
                    { label: 'Created', value: selected.created_at ? new Date(selected.created_at).toLocaleDateString() : '—' },
                    { label: 'Last Updated', value: selected.updated_at ? new Date(selected.updated_at).toLocaleString() : '—' },
                    { label: 'Target Launch', value: selected.target_launch || '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-slate-50 rounded-lg p-3 border">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-sm font-medium mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* ── Teams tab ── */}
              <TabsContent value="teams" className="pt-2">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Teams currently assigned to this project. Only members of these teams can see this project in their dashboard.</p>

                  {/* Team badges + Assign Task buttons */}
                  <div className="space-y-2">
                    {(selected.teams_involved || '').split(',').filter(Boolean).map(r => (
                      <div key={r} className="flex items-center justify-between px-3 py-2 rounded-lg border bg-slate-50">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${ROLES[r]?.color || 'bg-slate-600'}`}/>
                          <span className="text-sm font-medium">{ROLES[r]?.label || r}</span>
                        </div>
                        {/* WBS: admin and pm can assign tasks to teams */}
                        {(isAdmin || user?.role === 'pm') && (
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                            onClick={() => { setTaskTargetRole(r); setTaskForm({ title:'', type:'General', priority:'Medium', due_date:'', due_label:'' }); setTaskDialogOpen(true) }}>
                            <Plus className="h-3 w-3"/>Assign Task
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Existing tasks list */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tasks on this project</p>
                    {tasksLoading ? (
                      <div className="space-y-1">{[1,2].map(i=><div key={i} className="h-9 bg-slate-100 rounded animate-pulse"/>)}</div>
                    ) : tasks.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">No tasks assigned yet.</p>
                    ) : (
                      <div className="space-y-1">
                        {tasks.map(t => (
                          <div key={t.id} className="flex items-center justify-between px-3 py-2 rounded-md border text-sm">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.priority==='Critical'?'bg-red-500':t.priority==='High'?'bg-orange-500':t.priority==='Medium'?'bg-blue-500':'bg-slate-400'}`}/>
                              <span className="font-medium truncate">{t.title}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                              <Badge variant="outline" className="text-xs">{ROLES[t.assigned_role]?.label || t.assigned_role}</Badge>
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${t.status==='completed'?'bg-green-100 text-green-700':t.status==='cancelled'?'bg-red-100 text-red-700':'bg-amber-100 text-amber-700'}`}>{t.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* ── Assign Task Dialog ── */}
            <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Assign Task</DialogTitle>
                  <DialogDescription>
                    Assigning to: <strong>{ROLES[taskTargetRole]?.label || taskTargetRole}</strong> on <strong>{selected.name}</strong>
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <div className="space-y-1.5">
                    <Label>Task Title <span className="text-red-500">*</span></Label>
                    <Input value={taskForm.title} onChange={e => setTaskForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Submit formulation report" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Task Type</Label>
                      <Select value={taskForm.type} onValueChange={v => setTaskForm(f=>({...f,type:v}))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{TASK_TYPES.map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Priority</Label>
                      <Select value={taskForm.priority} onValueChange={v => setTaskForm(f=>({...f,priority:v}))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{PRIORITIES.map(p=><SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Due Date</Label>
                    <Input type="date" value={taskForm.due_date} onChange={e => setTaskForm(f=>({...f,due_date:e.target.value,due_label:e.target.value}))} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>Cancel</Button>
                  <Button disabled={creatingTask} onClick={async () => {
                    if (!taskForm.title.trim()) return toast.error('Task title is required')
                    setCreatingTask(true)
                    try {
                      await apiCall(`/api/projects/${selected.project_id}/tasks`, {
                        method: 'POST', token,
                        body: { ...taskForm, assigned_role: taskTargetRole }
                      })
                      toast.success(`Task assigned to ${ROLES[taskTargetRole]?.label || taskTargetRole}`)
                      setTaskDialogOpen(false)
                      fetchTasks(selected.project_id)
                    } catch (err) { toast.error(err.message) }
                    finally { setCreatingTask(false) }
                  }}>
                    {creatingTask && <RefreshCw className="h-4 w-4 animate-spin mr-2"/>}
                    Assign Task
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <DialogFooter className="gap-2 pt-2">
              {isAdmin && (
                <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="mr-auto">
                  {deleting ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                  Delete
                </Button>
              )}
              <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
              {canEditProj && (
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
                  Save Changes
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

/* -------------------- PPD -------------------- */
const PPD_STATUS_COLORS = {
  'Draft':        'bg-slate-200 text-slate-800',
  'Under Review': 'bg-blue-100 text-blue-800',
  'Submitted':    'bg-indigo-100 text-indigo-800',
  'Approved':     'bg-emerald-100 text-emerald-800',
  'CEO Approved': 'bg-purple-100 text-purple-800',
  'Rework':       'bg-amber-100 text-amber-800',
  'Archived':     'bg-gray-200 text-gray-700',
}
const PPD_STATUSES = Object.keys(PPD_STATUS_COLORS)
const REVIEWER_STATUSES = ['Pending','In Progress','Reviewed','Approved','Rework']

/** Top-level PPD list (role-filtered from API) */
function PPDView({ user, token, can }) {
  const [ppds, setPpds]               = useState([])
  const [loading, setLoading]         = useState(true)
  const [q, setQ]                     = useState('')
  const [statusFilter, setStatus]     = useState('all')
  const [projects, setProjects]       = useState([])

  // Create PPD dialog
  const [createOpen, setCreateOpen]   = useState(false)
  const [creating, setCreating]       = useState(false)
  const [createForm, setCreateForm]   = useState({
    project_id:'', project_name:'', brand:'', product_category:'',
    target_consumer:'', market_segment:'', expected_launch:'', objective:'', key_benefits:''
  })

  // Detail view
  const [selected, setSelected]       = useState(null)

  const isAdmin = user?.role === 'admin'

  const fetchPPDs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const data = await apiCall(`/api/ppd?${params}`, { token })
      setPpds(data)
    } catch (err) {
      toast.error('Failed to load PPDs: ' + err.message)
    } finally { setLoading(false) }
  }, [q, statusFilter, token])

  const fetchProjects = useCallback(async () => {
    try {
      const data = await apiCall('/api/projects', { token })
      setProjects(data)
    } catch { /* ignore */ }
  }, [token])

  useEffect(() => { fetchPPDs() }, [fetchPPDs])
  useEffect(() => { if (createOpen) fetchProjects() }, [createOpen, fetchProjects])

  const openCreate = (proj = null) => {
    if (proj) {
      setCreateForm(f => ({
        ...f,
        project_id:   proj.project_id,
        project_name: proj.name,
        brand:        proj.brand,
        objective:    proj.objective || '',
        expected_launch: proj.target_launch || '',
      }))
    }
    setCreateOpen(true)
  }

  const handleCreate = async () => {
    if (!createForm.project_id || !createForm.project_name) return toast.error('Project is required')
    setCreating(true)
    try {
      const ppd = await apiCall('/api/ppd', { method: 'POST', token, body: createForm })
      toast.success(`PPD created: ${ppd.ppd_id}`)
      setCreateOpen(false)
      setCreateForm({ project_id:'', project_name:'', brand:'', product_category:'', target_consumer:'', market_segment:'', expected_launch:'', objective:'', key_benefits:'' })
      fetchPPDs()
    } catch (err) { toast.error(err.message) }
    finally { setCreating(false) }
  }

  const relTime = (iso) => {
    if (!iso) return '—'
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1)  return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  // If a PPD is selected, show its detail view
  if (selected) {
    return <PPDDetail ppd={selected} user={user} token={token}
      onBack={() => { setSelected(null); fetchPPDs() }}
      onRefresh={async () => {
        try {
          const updated = await apiCall(`/api/ppd/${selected.ppd_id}`, { token })
          setSelected(updated)
        } catch (err) { toast.error(err.message) }
      }}
    />
  }

  return (
    <div className="space-y-4">
      {/* ── My PPD Tasks ── */}
      <MyTasksPanel user={user} token={token} taskTypes={['ppd_review','ppd_mgmt_approval','PPD Creation','PM Review']} onStatusChange={fetchPPDs} />

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">PPD Management</h1>
          <p className="text-muted-foreground text-sm">
            {isAdmin
              ? 'All Product Development Plans — admin view'
              : `PPDs assigned to your team (${ROLES[user?.role]?.label || user?.role})`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchPPDs}><RefreshCw className="h-4 w-4 mr-1"/>Refresh</Button>
          {(isAdmin || (can && can('PPD','create'))) && (
            <Button className="gap-2" onClick={() => openCreate()}><Plus className="h-4 w-4"/>Create PPD</Button>
          )}
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name or PPD ID..." className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatus}>
          <SelectTrigger className="w-48"><Filter className="h-4 w-4 mr-1"/><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {PPD_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* ── Table ── */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">{[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />)}</div>
          ) : ppds.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No PPDs found</p>
              <p className="text-sm">{isAdmin ? 'Create a PPD for a project using the button above' : 'No PPDs are assigned to your team yet'}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-36">PPD ID</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Teams</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ppds.map(p => (
                  <TableRow key={p.ppd_id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(p)}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.ppd_id}</TableCell>
                    <TableCell>
                      <div className="font-medium text-sm max-w-[200px] truncate">{p.project_name}</div>
                      <div className="text-xs text-muted-foreground">{p.project_id}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{p.brand}</Badge></TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-md font-medium whitespace-nowrap ${PPD_STATUS_COLORS[p.status] || 'bg-slate-100'}`}>
                        {p.status}
                      </span>
                    </TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs font-mono">{p.ppd_version}</Badge></TableCell>
                    <TableCell className="text-sm">
                      <div>{p.created_by}</div>
                      <div className="text-xs text-muted-foreground">{ROLES[p.created_by_role]?.label || p.created_by_role}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[160px]">
                        {(p.teams_involved || '').split(',').filter(Boolean).slice(0, 4).map(r => (
                          <span key={r} className={`text-[10px] px-1.5 py-0.5 rounded text-white font-medium ${ROLES[r]?.color || 'bg-slate-600'}`}>
                            {r}
                          </span>
                        ))}
                        {(p.teams_involved || '').split(',').filter(Boolean).length > 4 && (
                          <span className="text-[10px] text-muted-foreground">+{(p.teams_involved || '').split(',').filter(Boolean).length - 4}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{relTime(p.updated_at)}</TableCell>
                    <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {ppds.length > 0 && (
          <div className="px-6 py-2 border-t text-xs text-muted-foreground">{ppds.length} PPD{ppds.length !== 1 ? 's' : ''} shown</div>
        )}
      </Card>

      {/* ── Create PPD Dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New PPD</DialogTitle>
            <DialogDescription>Link this PPD to an existing project. All teams on that project will be notified.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-2">
              <Label>Link to Project <span className="text-red-500">*</span></Label>
              <Select value={createForm.project_id} onValueChange={v => {
                const proj = projects.find(p => p.project_id === v)
                if (proj) setCreateForm(f => ({ ...f, project_id: proj.project_id, project_name: proj.name, brand: proj.brand, objective: proj.objective || '', expected_launch: proj.target_launch || '' }))
              }}>
                <SelectTrigger><SelectValue placeholder="Select project..." /></SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.project_id} value={p.project_id}>
                      {p.project_id} — {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {createForm.project_id && (
              <div className="col-span-2 p-3 bg-slate-50 rounded-lg border text-sm">
                <span className="font-medium">Brand:</span> {createForm.brand} &nbsp;|&nbsp;
                <span className="font-medium">Project:</span> {createForm.project_name}
              </div>
            )}
            <div className="space-y-2">
              <Label>Product Category</Label>
              <Input value={createForm.product_category} onChange={e => setCreateForm(f => ({...f, product_category: e.target.value}))} placeholder="e.g. Nutrition Powder" />
            </div>
            <div className="space-y-2">
              <Label>Target Consumer</Label>
              <Input value={createForm.target_consumer} onChange={e => setCreateForm(f => ({...f, target_consumer: e.target.value}))} placeholder="e.g. Kids 5–15 yrs" />
            </div>
            <div className="space-y-2">
              <Label>Market Segment</Label>
              <Input value={createForm.market_segment} onChange={e => setCreateForm(f => ({...f, market_segment: e.target.value}))} placeholder="e.g. Premium Health" />
            </div>
            <div className="space-y-2">
              <Label>Expected Launch</Label>
              <Input value={createForm.expected_launch} onChange={e => setCreateForm(f => ({...f, expected_launch: e.target.value}))} placeholder="e.g. Q4 2026" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Objective</Label>
              <Textarea rows={3} value={createForm.objective} onChange={e => setCreateForm(f => ({...f, objective: e.target.value}))} placeholder="Product objective, target consumer, key goals..." />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Key Benefits / Claims</Label>
              <Textarea rows={2} value={createForm.key_benefits} onChange={e => setCreateForm(f => ({...f, key_benefits: e.target.value}))} placeholder="• Claim 1&#10;• Claim 2" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
              Create PPD
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** ────────────────────────────────────────────────────────
 *  PPD DETAIL — full view for a single PPD record
 * ──────────────────────────────────────────────────────── */
function PPDDetail({ ppd: initialPpd, user, token, onBack, onRefresh }) {
  const [ppd, setPpd]           = useState(initialPpd)
  const [editForm, setEditForm] = useState({
    product_category: initialPpd.product_category || '',
    target_consumer:  initialPpd.target_consumer  || '',
    market_segment:   initialPpd.market_segment   || '',
    expected_launch:  initialPpd.expected_launch  || '',
    objective:        initialPpd.objective        || '',
    key_benefits:     initialPpd.key_benefits     || '',
    status:           initialPpd.status,
  })
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const [comments, setComments]   = useState([])
  const [newComment, setNewComment]   = useState('')
  const [actionTag, setActionTag]     = useState('comment')
  const [postingComment, setPostingComment] = useState(false)
  const [reviewers, setReviewers]     = useState(initialPpd.reviewers || [])
  const [mgmtApprovals, setMgmtApprovals] = useState(initialPpd.mgmt_approvals || [])
  const [committeeActing, setCommitteeActing] = useState(false)

  const isAdmin   = user?.role === 'admin'
  const isSource  = user?.role === 'source'
  const isPM      = user?.role === 'pm'
  const isCEOUser = user?.role === 'ceo'
  // Source can edit content in Draft/Rework; PM can edit/assign; admin has full control
  const canEditPPD = isAdmin || (isSource && ['Draft','Rework'].includes(ppd.status)) || isPM
  const myRole     = user?.role || 'fd'

  // Management Committee role → committee slot mapping (mirrors backend ROLE_TO_COMMITTEE)
  const COMMITTEE_SLOT_MAP = {
    mgmt:       'marketing_head',
    rd_head:    'rd_head',
    regulatory: 'regulatory',
    sa:         'sales_head',
    cfo:        'cfo',
    gdso:       'gdso_head',
    marketing:  'marketing_head',
  }
  const myCommitteeSlot = COMMITTEE_SLOT_MAP[myRole]
  const isMgmtCommittee = !!(myCommitteeSlot || isAdmin)

  const fetchComments = useCallback(async () => {
    try {
      const data = await apiCall(`/api/ppd/${ppd.ppd_id}/comments`, { token })
      setComments(data)
    } catch { /* ignore */ }
  }, [ppd.ppd_id, token])

  useEffect(() => { fetchComments() }, [fetchComments])

  const refreshPpd = async () => {
    const updated = await apiCall(`/api/ppd/${ppd.ppd_id}`, { token })
    setPpd(updated)
    setReviewers(updated.reviewers || [])
    setMgmtApprovals(updated.mgmt_approvals || [])
    setEditForm(f => ({ ...f, status: updated.status }))
    return updated
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiCall(`/api/ppd/${ppd.ppd_id}`, { method: 'PUT', token, body: editForm })
      toast.success('PPD updated — all teams notified')
      await refreshPpd()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete PPD ${ppd.ppd_id}? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await apiCall(`/api/ppd/${ppd.ppd_id}`, { method: 'DELETE', token })
      toast.success('PPD deleted')
      onBack()
    } catch (err) { toast.error(err.message) }
    finally { setDeleting(false) }
  }

  const handlePostComment = async () => {
    if (!newComment.trim()) return
    setPostingComment(true)
    try {
      await apiCall(`/api/ppd/${ppd.ppd_id}/comments`, { method: 'POST', token, body: { comment: newComment, action_tag: actionTag } })
      setNewComment(''); setActionTag('comment')
      fetchComments()
      await refreshPpd()
      toast.success('Comment posted')
    } catch (err) { toast.error(err.message) }
    finally { setPostingComment(false) }
  }

  const handleReviewerUpdate = async (roleKey, newStatus, comment = '') => {
    const updatedReviewers = reviewers.map(r =>
      r.role === roleKey ? { ...r, status: newStatus, comment, updated_at: new Date().toISOString() } : r
    )
    try {
      await apiCall(`/api/ppd/${ppd.ppd_id}/reviewers`, { method: 'PATCH', token, body: { reviewers: updatedReviewers } })
      // Refresh from DB so local state always matches persisted data
      await refreshPpd()
      toast.success('Review status updated — teams notified')
    } catch (err) { toast.error(err.message) }
  }

  // Step 5: Management Committee approve / rework
  const handleCommitteeAction = async (action, committeeRole, comment = '') => {
    setCommitteeActing(true)
    try {
      const res = await apiCall(`/api/ppd/${ppd.ppd_id}/mgmt-approve`, {
        method: 'PATCH', token,
        body: { action, committee_role: committeeRole, comment },
      })
      setMgmtApprovals(res.mgmt_approvals || mgmtApprovals)
      await refreshPpd()
      if (action === 'approve') toast.success('Approval recorded')
      else toast.warning('Rework requested — source team notified')
    } catch (err) { toast.error(err.message) }
    finally { setCommitteeActing(false) }
  }

  const relTime = (iso) => {
    if (!iso) return '—'
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1)  return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  // Derive workflow step status from reviewers
  const reviewedCount = reviewers.filter(r => ['Reviewed','Approved'].includes(r.status)).length
  const allMgmtApproved = mgmtApprovals.length > 0 && mgmtApprovals.every(m => m.status === 'Approved')
  const mgmtApprovedCount = mgmtApprovals.filter(m => m.status === 'Approved').length

  const isDraft       = ppd.status === 'Draft'
  const isUnderReview = ppd.status === 'Under Review'
  const isSubmitted   = ppd.status === 'Submitted'
  const isApproved    = ppd.status === 'Approved'
  const isCEOApproved = ppd.status === 'CEO Approved'
  const isRework      = ppd.status === 'Rework'

  // 7-step WBS approval workflow
  const wfSteps = [
    {
      s: '1. Source Team Creates PPD',
      d: `${ppd.created_by} (${ROLES[ppd.created_by_role]?.label || ppd.created_by_role}) — saved as draft`,
      st: 'done',
    },
    {
      s: '2. R&D / F&D and PM Review Draft',
      d: isDraft
        ? 'R&D/F&D and PM have been assigned review tasks — awaiting their review'
        : `Functional review initiated. Assigned: ${(ppd.teams_involved||'').split(',').filter(r => r && r !== 'admin').map(r => ROLES[r]?.label || r).join(', ')}`,
      st: isDraft ? 'active' : 'done',
    },
    {
      s: '3. Functional Teams Review',
      d: `${reviewedCount}/${reviewers.length} dept teams have submitted their review`,
      st: isUnderReview ? 'active' : (reviewedCount > 0 && !isDraft) ? 'done' : isDraft ? 'pending' : 'active',
    },
    {
      s: '4. Source Team — Submit for Approval',
      d: isSubmitted || isApproved || isCEOApproved
        ? 'Source team submitted PPD to Management Committee for approval'
        : isRework
        ? '⚠ PPD sent back for rework — Source team to revise and re-submit'
        : 'Source team to review consolidated feedback and click Submit for Approval',
      st: isSubmitted || isApproved || isCEOApproved ? 'done' : isRework ? 'active' : 'pending',
    },
    {
      s: '5. Management Committee Approval',
      d: isApproved || isCEOApproved
        ? `All ${mgmtApprovals.length} committee members approved`
        : isSubmitted
        ? `${mgmtApprovedCount}/${mgmtApprovals.length} committee approvals received — Marketing Head, Sales Head, R&D Head, GDSO Head, Regulatory Head, CFO`
        : 'Marketing Head, Sales Head, R&D Head, GDSO Head, Regulatory Head, CFO — each approves independently',
      st: isApproved || isCEOApproved ? 'done' : isSubmitted ? 'active' : 'pending',
    },
    {
      s: '6. CEO Final Approval',
      d: isCEOApproved ? 'CEO approved — execution initiated' : 'CEO Office — final sign-off to initiate execution',
      st: isCEOApproved ? 'done' : isApproved ? 'active' : 'pending',
    },
    {
      s: '7. Execution — Formulation Development',
      d: 'PPD locked; R&D/F&D team starts formulation development',
      st: isCEOApproved ? 'active' : 'pending',
    },
  ]

  const myReviewerEntry = reviewers.find(r => r.role === myRole)

  return (
    <div className="space-y-4">
      {/* ── Back + Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
            <ChevronRight className="h-4 w-4 rotate-180"/>Back
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{ppd.project_name}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${PPD_STATUS_COLORS[ppd.status] || 'bg-slate-100'}`}>{ppd.status}</span>
              <Badge variant="secondary" className="font-mono text-xs">{ppd.ppd_version}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {ppd.ppd_id} • {ppd.brand} • Created by {ppd.created_by}
              {' '}• <span className="font-medium text-foreground">ID: {ppd.project_id}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          {/* PPD Locked banner */}
          {isCEOApproved && (
            <Badge className="bg-purple-600 text-white px-3 py-1 text-xs gap-1.5 shadow-sm">
              <ShieldCheck className="h-4 w-4" /> PPD Locked — Formulation Unlocked
            </Badge>
          )}
          {/* Source: Save as Draft */}
          {isSource && ['Draft','Rework'].includes(ppd.status) && (
            <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-1"/> : <Edit className="h-4 w-4 mr-1"/>}
              Save as Draft
            </Button>
          )}
          {/* Source: Submit for Mgmt approval (Step 4) — after functional review */}
          {isSource && ['Draft','Under Review','Rework'].includes(ppd.status) && (
            <Button size="sm" className="gap-1 bg-amber-600 hover:bg-amber-700 text-white" onClick={async () => {
              setSaving(true)
              try {
                await apiCall(`/api/ppd/${ppd.ppd_id}`, { method: 'PUT', token, body: { ...editForm, status: 'Submitted' } })
                await refreshPpd()
                toast.success('PPD submitted to Management Committee for approval')
              } catch (err) { toast.error(err.message) }
              finally { setSaving(false) }
            }} disabled={saving}>
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-1"/> : <Send className="h-4 w-4 mr-1"/>}
              Submit for Approval
            </Button>
          )}
          {/* PM: Set Under Review (Step 2) */}
          {isPM && isDraft && (
            <Button size="sm" variant="outline" onClick={async () => {
              try {
                await apiCall(`/api/ppd/${ppd.ppd_id}`, { method: 'PUT', token, body: { status: 'Under Review' } })
                await refreshPpd()
                toast.success('PPD set to Under Review — assigned teams notified')
              } catch (err) { toast.error(err.message) }
            }}>
              <Users className="h-4 w-4 mr-1"/>Set Under Review
            </Button>
          )}
          {/* CEO: Final Approval (Step 6) — only when ALL mgmt committee approved (status = Approved) */}
          {(isCEOUser || isAdmin) && isApproved && (
            <Button size="sm" className="gap-1 bg-purple-700 hover:bg-purple-800 text-white" onClick={async () => {
              if (!confirm('Grant CEO Final Approval? This will lock the PPD and move the project to Formulation Development.')) return
              setSaving(true)
              try {
                await apiCall(`/api/ppd/${ppd.ppd_id}`, { method: 'PUT', token, body: { status: 'CEO Approved' } })
                await refreshPpd(); fetchComments()
                toast.success('CEO Approved! Project moved to Formulation phase.')
              } catch (err) { toast.error(err.message) }
              finally { setSaving(false) }
            }} disabled={saving}>
              <BadgeCheck className="h-4 w-4 mr-1"/>CEO Final Approval
            </Button>
          )}
          {/* Admin: full controls */}
          {isAdmin && (
            <>
              <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-1"/> : <Edit className="h-4 w-4 mr-1"/>}
                Save
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
                {deleting ? <RefreshCw className="h-4 w-4 animate-spin mr-1"/> : <Trash2 className="h-4 w-4 mr-1"/>}
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Teams Involved Banner ── */}
      <Card className="bg-slate-50">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Teams Involved:</span>
            {(ppd.teams_involved || '').split(',').filter(Boolean).map(r => (
              <span key={r} className={`text-xs px-2 py-0.5 rounded text-white font-medium ${ROLES[r]?.color || 'bg-slate-600'}`}>
                {ROLES[r]?.label || r}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="details">
        <TabsList className={`grid w-full max-w-3xl ${isAdmin ? 'grid-cols-6' : 'grid-cols-5'}`}>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="reviewers">Reviewers</TabsTrigger>
          <TabsTrigger value="committee">
            Committee
            {isSubmitted && <span className="ml-1 text-[10px] bg-amber-500 text-white rounded px-1">{mgmtApprovedCount}/{mgmtApprovals.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="comments">Comments ({comments.length})</TabsTrigger>
          <TabsTrigger value="workflow">Approval Flow</TabsTrigger>
          {isAdmin && <TabsTrigger value="admin">Admin</TabsTrigger>}
        </TabsList>

        {/* ── DETAILS TAB ── */}
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Product Details</CardTitle>
                  <CardDescription>Structured PPD fields — required for submission</CardDescription>
                </div>
                {!isAdmin && myReviewerEntry && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Your review:</span>
                    <Badge variant={myReviewerEntry.status === 'Reviewed' ? 'default' : myReviewerEntry.status === 'Rework' ? 'destructive' : 'secondary'}>
                      {myReviewerEntry.status}
                    </Badge>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Project ID</Label>
                <p className="text-sm font-mono py-2 text-muted-foreground">{ppd.project_id}</p>
              </div>
              <div className="space-y-2">
                <Label>Brand</Label>
                <p className="text-sm py-2">{ppd.brand}</p>
              </div>
              <div className="space-y-2">
                <Label>Product Category</Label>
                {canEditPPD
                  ? <Input value={editForm.product_category} onChange={e => setEditForm(f => ({...f, product_category: e.target.value}))} placeholder="e.g. Nutrition Powder" />
                  : <p className="text-sm py-2">{ppd.product_category || '—'}</p>}
              </div>
              <div className="space-y-2">
                <Label>Target Consumer</Label>
                {canEditPPD
                  ? <Input value={editForm.target_consumer} onChange={e => setEditForm(f => ({...f, target_consumer: e.target.value}))} placeholder="e.g. Kids 5-15 yrs" />
                  : <p className="text-sm py-2">{ppd.target_consumer || '—'}</p>}
              </div>
              <div className="space-y-2">
                <Label>Market Segment</Label>
                {canEditPPD
                  ? <Input value={editForm.market_segment} onChange={e => setEditForm(f => ({...f, market_segment: e.target.value}))} placeholder="e.g. Premium Health" />
                  : <p className="text-sm py-2">{ppd.market_segment || '—'}</p>}
              </div>
              <div className="space-y-2">
                <Label>Expected Launch</Label>
                {canEditPPD
                  ? <Input value={editForm.expected_launch} onChange={e => setEditForm(f => ({...f, expected_launch: e.target.value}))} placeholder="e.g. Q4 2026" />
                  : <p className="text-sm py-2">{ppd.expected_launch || '—'}</p>}
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Objective</Label>
                {canEditPPD
                  ? <Textarea rows={3} value={editForm.objective} onChange={e => setEditForm(f => ({...f, objective: e.target.value}))} placeholder="Product objective, target consumer, key goals..." />
                  : <p className="text-sm py-2 whitespace-pre-line">{ppd.objective || '—'}</p>}
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Key Benefits / Claims</Label>
                {canEditPPD
                  ? <Textarea rows={3} value={editForm.key_benefits} onChange={e => setEditForm(f => ({...f, key_benefits: e.target.value}))} placeholder="• Claim 1&#10;• Claim 2" />
                  : <p className="text-sm py-2 whitespace-pre-line">{ppd.key_benefits || '—'}</p>}
              </div>
              {isAdmin && (
                <div className="col-span-2 space-y-2">
                  <Label>Status (Admin Override)</Label>
                  <Select value={editForm.status} onValueChange={v => setEditForm(f => ({...f, status: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PPD_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
            {canEditPPD && (
              <CardFooter className="border-t pt-4">
                <Button onClick={handleSave} disabled={saving} className="ml-auto">
                  {saving && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
                  Save Changes
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        {/* ── REVIEWERS TAB ── */}
        <TabsContent value="reviewers">
          <Card>
            <CardHeader>
              <CardTitle>Sequential Review</CardTitle>
              <CardDescription>
                {isAdmin || isSource
                  ? `Full overview — ${reviewers.filter(r => ['Reviewed','Approved'].includes(r.status)).length}/${reviewers.length} teams have completed their review`
                  : 'Your team reviews when the previous step is approved. Only your row is actionable.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {reviewers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No reviewers assigned yet.</p>
              ) : (() => {
                // Determine the index of the current active reviewer (first non-approved)
                const activeIdx = reviewers.findIndex(r => !['Reviewed','Approved'].includes(r.status))
                // myIdx: which slot in the sequence this user occupies
                const myIdx = reviewers.findIndex(r => r.role === myRole)

                return reviewers.map((r, i) => {
                  const isDone   = ['Reviewed','Approved'].includes(r.status)
                  const isActive = i === activeIdx  // this slot is the current turn
                  const isMyRow  = r.role === myRole

                  // Visibility rules:
                  // - Admin / source / pm see ALL rows (admin has controls; source/pm read-only overview)
                  // - Other roles: see only rows up to and including their own row
                  //   (i.e. completed rows before them + their own row)
                  //   Rows AFTER their slot that haven't started yet are hidden
                  const canSeeRow = isAdmin || isSource || isPM
                    || isMyRow
                    || isDone            // completed rows visible to everyone (context)
                    || i < myIdx         // rows before my slot (already done, for context)

                  if (!canSeeRow) return null

                  // Can act = it's my row AND it's currently my turn (activeIdx === myIdx)
                  const canAct = (isMyRow && isActive && !isDone) || isAdmin

                  return (
                    <div key={i} className={`flex items-center justify-between p-3 border rounded-lg gap-4
                      ${isDone ? 'border-emerald-200 bg-emerald-50' :
                        isActive && isMyRow ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-300' :
                        isActive ? 'border-amber-200 bg-amber-50' :
                        'opacity-50'}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{r.team_label}</span>
                          {isActive && !isDone && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-white font-medium">
                              {isMyRow ? 'Your Turn' : 'Awaiting'}
                            </span>
                          )}
                          {isDone && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-600 text-white font-medium">Done</span>}
                        </div>
                        {r.head_name && <div className="text-xs text-muted-foreground">Head: {r.head_name}</div>}
                        {r.comment && <div className="text-xs text-muted-foreground mt-1 italic">"{r.comment}"</div>}
                        {r.updated_at && <div className="text-xs text-muted-foreground">{relTime(r.updated_at)}</div>}
                        {/* Show "waiting for previous" message for locked rows */}
                        {!isDone && !isActive && i > activeIdx && (isAdmin || isSource || isPM) && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Waiting for {reviewers[activeIdx]?.team_label || 'previous team'} to complete
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={isDone ? 'default' : r.status==='Rework' ? 'destructive' : r.status==='In Progress' ? 'secondary' : 'outline'}
                          className={isDone ? 'bg-emerald-600' : ''}>
                          {r.status}
                        </Badge>
                        {/* Active role can update their own review status */}
                        {canAct && (
                          <Select value={r.status} onValueChange={v => handleReviewerUpdate(r.role, v)}>
                            <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {REVIEWER_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  )
                })
              })()}
              {isAdmin && (
                <div className="pt-2 text-xs text-muted-foreground border-t">
                  Admin view: all rows shown. Each team's row becomes active only after the previous team approves.
                </div>
              )}
              {/* Source: read-only progress summary */}
              {isSource && reviewers.length > 0 && (
                <div className="pt-2 text-xs text-muted-foreground border-t">
                  Source team view: read-only overview of functional review progress.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── COMMITTEE TAB ── */}
        <TabsContent value="committee">
          <Card>
            <CardHeader>
              <CardTitle>Management Committee Approval</CardTitle>
              <CardDescription>
                Step 5 — Each of the 6 committee members must approve independently.
                {isSubmitted && ` ${mgmtApprovedCount} of ${mgmtApprovals.length} have approved.`}
                {isApproved && ' ✓ All approved — awaiting CEO final sign-off.'}
                {isCEOApproved && ' ✓ Completed — CEO approved.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {mgmtApprovals.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Committee approvals will be available after Source Team submits the PPD (Step 4).
                </p>
              ) : (
                mgmtApprovals.map((m, i) => {
                  const isMySlot = myCommitteeSlot === m.role || isAdmin
                  const canAct   = isMySlot && ['Submitted','Approved'].includes(ppd.status) && m.status !== 'Approved'
                  return (
                    <div key={i} className={`flex items-center justify-between p-3 border rounded-lg gap-4
                      ${m.status === 'Approved' ? 'border-emerald-200 bg-emerald-50' : m.status === 'Rework' ? 'border-red-200 bg-red-50' : ''}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{m.label}</span>
                          <Badge
                            variant={m.status === 'Approved' ? 'default' : m.status === 'Rework' ? 'destructive' : 'outline'}
                            className={`text-xs ${m.status === 'Approved' ? 'bg-emerald-600' : ''}`}>
                            {m.status}
                          </Badge>
                        </div>
                        {m.comment && <p className="text-xs text-muted-foreground mt-1 italic">"{m.comment}"</p>}
                        {m.approved_at && <p className="text-xs text-muted-foreground">{relTime(m.approved_at)}</p>}
                      </div>
                      {canAct && (
                        <div className="flex gap-2 shrink-0">
                          <Button size="sm" variant="outline"
                            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs"
                            disabled={committeeActing}
                            onClick={() => handleCommitteeAction('approve', m.role, '')}>
                            {committeeActing ? <RefreshCw className="h-3 w-3 animate-spin mr-1"/> : <CheckCircle2 className="h-3 w-3 mr-1"/>}
                            Approve
                          </Button>
                          <Button size="sm" variant="outline"
                            className="border-red-300 text-red-700 hover:bg-red-50 text-xs"
                            disabled={committeeActing}
                            onClick={async () => {
                              const reason = window.prompt(`Reason for rework (${m.label}):`)
                              if (reason === null) return
                              await handleCommitteeAction('rework', m.role, reason || 'Rework requested')
                            }}>
                            <AlertCircle className="h-3 w-3 mr-1"/>Rework
                          </Button>
                        </div>
                      )}
                      {m.status === 'Approved' && (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                      )}
                    </div>
                  )
                })
              )}
              {mgmtApprovals.length > 0 && !['Submitted','Approved'].includes(ppd.status) && !isCEOApproved && (
                <p className="text-xs text-muted-foreground pt-2 border-t">
                  Committee approval buttons will activate once the Source Team submits the PPD.
                </p>
              )}
              {allMgmtApproved && !isCEOApproved && (
                <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-800">
                  ✓ All committee members have approved. PPD is now awaiting <strong>CEO Final Approval</strong>.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── COMMENTS TAB ── */}
        <TabsContent value="comments">
          <Card>
            <CardHeader><CardTitle>Review Comments & Remarks</CardTitle><CardDescription>Consolidated feedback from all reviewers — any update here notifies all teams</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No comments yet. Be the first to review.</p>
              ) : (
                comments.map((c, i) => (
                  <div key={i} className="flex gap-3 p-3 border rounded-lg">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs bg-primary text-white">
                        {(c.user_name || '?').split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{c.user_name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded text-white font-medium ${ROLES[c.user_role]?.color || 'bg-slate-600'}`}>
                            {ROLES[c.user_role]?.label || c.user_role}
                          </span>
                          {c.action_tag !== 'comment' && (
                            <Badge variant={c.action_tag==='rework'?'destructive':c.action_tag==='approve'?'default':'secondary'} className="text-xs">
                              {c.action_tag}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{relTime(c.created_at)}</span>
                      </div>
                      <p className="text-sm mt-1 whitespace-pre-line">{c.comment}</p>
                    </div>
                  </div>
                ))
              )}

              {/* New comment box */}
              <div className="border rounded-lg p-3 space-y-2">
                <Textarea
                  placeholder="Add your review comment..."
                  rows={2}
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                />
                <div className="flex items-center justify-between gap-2">
                  <Select value={actionTag} onValueChange={setActionTag}>
                    <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comment">Comment</SelectItem>
                      <SelectItem value="rework">Request Rework</SelectItem>
                      {(isAdmin || ['mgmt','ceo','rd_head'].includes(myRole)) && <SelectItem value="approve">Approve</SelectItem>}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={handlePostComment} disabled={postingComment || !newComment.trim()}>
                    {postingComment ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <MessageSquare className="h-4 w-4 mr-2"/>}
                    Post
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── WORKFLOW TAB ── */}
        <TabsContent value="workflow">
          <Card>
            <CardHeader><CardTitle>Approval Workflow</CardTitle><CardDescription>Live status — derived from actual PPD and reviewer data</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {wfSteps.map((w, i, a) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0
                        ${w.st==='done'?'bg-emerald-600 text-white':w.st==='active'?'bg-orange-500 text-white':'bg-slate-200 text-slate-500'}`}>
                        {w.st==='done'?<CheckCircle2 className="h-5 w-5"/>:w.st==='active'?<Clock className="h-5 w-5 animate-pulse"/>:i+1}
                      </div>
                      {i < a.length - 1 && (
                        <div className={`w-0.5 flex-1 ${w.st==='done'?'bg-emerald-600':'bg-slate-200'}`} style={{minHeight:24}}/>
                      )}
                    </div>
                    <div className="pb-4 flex-1">
                      <div className="font-medium text-sm">{w.s}</div>
                      {w.d && <div className="text-xs text-muted-foreground mt-0.5">{w.d}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ADMIN TAB ── */}
        <TabsContent value="admin">
          <div className="space-y-4">
            {/* Role ID Card */}
            <Card>
              <CardHeader><CardTitle>Department & Role IDs</CardTitle><CardDescription>System identifiers for each team involved in this PPD</CardDescription></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role Key (ID)</TableHead>
                      <TableHead>Department / Team</TableHead>
                      <TableHead>Access Level</TableHead>
                      <TableHead>Reviewer Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(ppd.teams_involved || '').split(',').filter(Boolean).map(r => {
                      const rev = reviewers.find(rv => rv.role === r)
                      return (
                        <TableRow key={r}>
                          <TableCell className="font-mono text-xs font-semibold">{r}</TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-0.5 rounded text-white font-medium ${ROLES[r]?.color || 'bg-slate-600'}`}>
                              {ROLES[r]?.label || r}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {r === 'admin' ? 'Full control' : r === 'mgmt' || r === 'ceo' ? 'View all + approve' : 'View + comment'}
                          </TableCell>
                          <TableCell>
                            {rev ? (
                              <Badge variant={rev.status==='Reviewed'||rev.status==='Approved'?'default':rev.status==='Rework'?'destructive':'secondary'} className="text-xs">
                                {rev.status}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">Not a reviewer</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Admin: status management */}
            {isAdmin && (
              <Card>
                <CardHeader><CardTitle>Admin Controls</CardTitle><CardDescription>Override status, manage teams, force transitions</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Override Status</Label>
                      <Select value={editForm.status} onValueChange={v => setEditForm(f => ({...f, status: v}))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{PPD_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Current Version</Label>
                      <p className="text-sm font-mono py-2">{ppd.ppd_version}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Created', value: ppd.created_at ? new Date(ppd.created_at).toLocaleString() : '—' },
                      { label: 'Last Updated', value: ppd.updated_at ? new Date(ppd.updated_at).toLocaleString() : '—' },
                      { label: 'Project', value: ppd.project_id },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-slate-50 rounded-lg p-3 border">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-sm font-medium mt-0.5">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                      {deleting ? <RefreshCw className="h-4 w-4 animate-spin mr-2"/> : <Trash2 className="h-4 w-4 mr-2"/>}
                      Delete PPD
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                      {saving && <RefreshCw className="h-4 w-4 animate-spin mr-2"/>}
                      Save All Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Field({ label, value }) {
  return <div className="space-y-2"><Label>{label}</Label><Input defaultValue={value}/></div>
}

/* -------------------- FORMULATION -------------------- */
const FORMULA_STATUSES = ['Draft','In Testing','Sensory Pass','Recommended','Rejected']
const FORMULA_TYPES    = ['Trial','Pilot','Final']
const FORMULA_STATUS_COLORS = {
  'Draft':        'bg-slate-100 text-slate-700',
  'In Testing':   'bg-blue-100 text-blue-700',
  'Sensory Pass': 'bg-teal-100 text-teal-700',
  'Recommended':  'bg-green-600 text-white',
  'Rejected':     'bg-red-100 text-red-700',
}

function FormulationView({ user, token, can }) {
  const [formulas, setFormulas]           = useState([])
  const [projects, setProjects]           = useState([])
  const [loading, setLoading]             = useState(true)
  const [projectFilter, setProjectFilter] = useState('all')
  const [statusFilter, setStatusFilter]   = useState('all')
  const [q, setQ]                         = useState('')

  // Create dialog
  const [createOpen, setCreateOpen]   = useState(false)
  const [creating, setCreating]       = useState(false)
  const [createForm, setCreateForm]   = useState({
    project_id:'', formula_type:'Trial', protein_source:'', sweetener:'',
    cocoa_pct:'', protein_pct:'', sugar_per_100g:'', cost_per_kg:'',
    stability_40c:'', sensory_score:'', notes:'',
  })
  const [ingredients, setIngredients] = useState([{ name:'', qty:'', unit:'g', supplier:'' }])

  // Detail dialog
  const [selected, setSelected]       = useState(null)
  const [detailOpen, setDetailOpen]   = useState(false)
  const [editForm, setEditForm]       = useState({})
  const [saving, setSaving]           = useState(false)
  const [deleting, setDeleting]       = useState(false)
  const [activeTab, setActiveTab]     = useState('details')

  // Comments
  const [comments, setComments]       = useState([])
  const [commentText, setCommentText] = useState('')
  const [postingComment, setPostingComment] = useState(false)

  // Compare
  const [compareOpen, setCompareOpen] = useState(false)
  const [compareIds, setCompareIds]   = useState([])

  const canEdit = ['admin','fd','rd_head'].includes(user?.role) || (can && can('Formulation','edit'))
  const canCreate = ['admin','fd','rd_head'].includes(user?.role) || (can && can('Formulation','create'))
  const canDelete = ['admin','rd_head'].includes(user?.role)

  // ── fetch ──
  const fetchFormulas = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (projectFilter !== 'all') params.set('project_id', projectFilter)
      if (statusFilter  !== 'all') params.set('status', statusFilter)
      if (q) params.set('q', q)
      const data = await apiCall(`/api/formulation?${params}`, { token })
      setFormulas(data)
    } catch (err) { toast.error('Failed to load formulas: ' + err.message) }
    finally { setLoading(false) }
  }, [projectFilter, statusFilter, q, token])

  const fetchProjects = useCallback(async () => {
    try {
      const data = await apiCall('/api/projects', { token })
      setProjects(data)
    } catch {}
  }, [token])

  useEffect(() => { fetchFormulas(); fetchProjects() }, [fetchFormulas, fetchProjects])

  // ── fetch comments ──
  const fetchComments = useCallback(async (fid) => {
    try {
      const data = await apiCall(`/api/formulation/${fid}/comments`, { token })
      setComments(data)
    } catch { setComments([]) }
  }, [token])

  // ── open detail ──
  const openDetail = (f) => {
    setSelected(f)
    setEditForm({
      formula_type: f.formula_type, status: f.status,
      protein_source: f.protein_source||'', sweetener: f.sweetener||'',
      cocoa_pct: f.cocoa_pct||'', protein_pct: f.protein_pct||'',
      sugar_per_100g: f.sugar_per_100g||'', cost_per_kg: f.cost_per_kg||'',
      stability_40c: f.stability_40c||'', sensory_score: f.sensory_score||'',
      notes: f.notes||'',
      ingredients: f.ingredients||[],
    })
    setComments([])
    setCommentText('')
    setActiveTab('details')
    fetchComments(f.formula_id)
    setDetailOpen(true)
  }

  // ── create ──
  const handleCreate = async () => {
    if (!createForm.project_id) return toast.error('Select a project')
    setCreating(true)
    try {
      await apiCall('/api/formulation', {
        method:'POST', token,
        body: { ...createForm, ingredients: ingredients.filter(i => i.name.trim()) }
      })
      toast.success('Formula created')
      setCreateOpen(false)
      setCreateForm({ project_id:'', formula_type:'Trial', protein_source:'', sweetener:'',
        cocoa_pct:'', protein_pct:'', sugar_per_100g:'', cost_per_kg:'', stability_40c:'', sensory_score:'', notes:'' })
      setIngredients([{ name:'', qty:'', unit:'g', supplier:'' }])
      fetchFormulas()
    } catch (err) { toast.error(err.message) }
    finally { setCreating(false) }
  }

  // ── save edit ──
  const handleSave = async () => {
    setSaving(true)
    try {
      await apiCall(`/api/formulation/${selected.formula_id}`, {
        method:'PUT', token, body: { ...editForm }
      })
      toast.success('Formula updated')
      setDetailOpen(false)
      fetchFormulas()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  // ── delete ──
  const handleDelete = async () => {
    if (!confirm(`Delete formula ${selected.formula_id}? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await apiCall(`/api/formulation/${selected.formula_id}`, { method:'DELETE', token })
      toast.success('Formula deleted')
      setDetailOpen(false)
      fetchFormulas()
    } catch (err) { toast.error(err.message) }
    finally { setDeleting(false) }
  }

  // ── post comment ──
  const handleComment = async () => {
    if (!commentText.trim()) return
    setPostingComment(true)
    try {
      const c = await apiCall(`/api/formulation/${selected.formula_id}/comments`, {
        method:'POST', token, body:{ comment: commentText }
      })
      setComments(prev => [...prev, c])
      setCommentText('')
    } catch (err) { toast.error(err.message) }
    finally { setPostingComment(false) }
  }

  // ── compare helpers ──
  const compareList = formulas.filter(f => compareIds.includes(f.formula_id))
  const COMPARE_FIELDS = [
    { key:'formula_type',   label:'Type' },
    { key:'protein_source', label:'Protein Source' },
    { key:'sweetener',      label:'Sweetener' },
    { key:'protein_pct',    label:'Protein %' },
    { key:'cocoa_pct',      label:'Cocoa %' },
    { key:'sugar_per_100g', label:'Sugar (g/100g)' },
    { key:'cost_per_kg',    label:'Cost/kg (₹)' },
    { key:'stability_40c',  label:'Stability (40°C)' },
    { key:'sensory_score',  label:'Sensory Score' },
    { key:'status',         label:'Status' },
  ]

  const relTime = (iso) => {
    if (!iso) return '—'
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  // ── ingredient row helpers ──
  const addIngredient  = () => setIngredients(prev => [...prev, { name:'', qty:'', unit:'g', supplier:'' }])
  const removeIngredient = (i) => setIngredients(prev => prev.filter((_,idx) => idx !== i))
  const updateIngredient = (i, field, val) => setIngredients(prev => prev.map((row,idx) => idx===i ? {...row,[field]:val} : row))

  return (
    <div className="space-y-4">
      {/* ── My Assigned Tasks (Formulation) ── */}
      <MyTasksPanel user={user} token={token} taskTypes={['formulation','Formulation']} onStatusChange={fetchFormulas} />

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Formulation Development</h1>
          <p className="text-muted-foreground text-sm">R&D / F&D workspace — formula versions, ingredients, trials & comparison</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {compareIds.length >= 2 && (
            <Button variant="outline" onClick={() => setCompareOpen(true)}>
              <GitCompare className="h-4 w-4 mr-2"/>Compare ({compareIds.length})
            </Button>
          )}
          {compareIds.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setCompareIds([])}>Clear selection</Button>
          )}
          {/* Download project dossier PDF — only when a project is selected */}
          {projectFilter !== 'all' && (
            <Button variant="outline" className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
              onClick={() => window.open(`${API_BASE}/api/formulation/report/${projectFilter}?token=${encodeURIComponent(token)}`, '_blank')}>
              <FileText className="h-4 w-4"/>Download Project Report
            </Button>
          )}
          {canEdit && (
            <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2"/>New Formula</Button>
          )}
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {FORMULA_STATUSES.map(st => {
          const count = formulas.filter(f => f.status === st).length
          return (
            <Card key={st} className={`cursor-pointer border-2 ${statusFilter===st?'border-primary':'border-transparent'}`}
              onClick={() => setStatusFilter(s => s===st?'all':st)}>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">{st}</p>
                <p className="text-2xl font-bold mt-1">{count}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* ── Filters ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search formulas..." className="pl-9"/>
            </div>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-52"><SelectValue placeholder="All Projects"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map(p => <SelectItem key={p.project_id} value={p.project_id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44"><Filter className="h-4 w-4 mr-1"/><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {FORMULA_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchFormulas}><RefreshCw className="h-4 w-4 mr-1"/>Refresh</Button>
          </div>
        </CardHeader>

        {/* ── Table ── */}
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">{[1,2,3,4].map(i=><div key={i} className="h-10 bg-slate-100 rounded animate-pulse"/>)}</div>
          ) : formulas.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FlaskConical className="h-12 w-12 mx-auto mb-3 opacity-30"/>
              <p className="font-medium">No formulas found</p>
              <p className="text-sm">{canEdit ? 'Create your first formula using the button above' : 'No formulas assigned to your team yet'}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="w-36">Formula ID</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Protein Source</TableHead>
                  <TableHead>Sweetener</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sensory</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formulas.map(f => (
                  <TableRow key={f.formula_id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={compareIds.includes(f.formula_id)}
                        onCheckedChange={checked => setCompareIds(prev =>
                          checked ? [...prev, f.formula_id] : prev.filter(id => id !== f.formula_id)
                        )}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold" onClick={() => openDetail(f)}>{f.formula_id}</TableCell>
                    <TableCell className="text-sm max-w-[150px] truncate" onClick={() => openDetail(f)}>{f.project_name}</TableCell>
                    <TableCell onClick={() => openDetail(f)}><Badge variant="outline" className="font-mono text-xs">{f.version}</Badge></TableCell>
                    <TableCell className="text-xs" onClick={() => openDetail(f)}>{f.formula_type}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate" onClick={() => openDetail(f)}>{f.protein_source||'—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[100px] truncate" onClick={() => openDetail(f)}>{f.sweetener||'—'}</TableCell>
                    <TableCell onClick={() => openDetail(f)}>
                      <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${FORMULA_STATUS_COLORS[f.status]||'bg-slate-100'}`}>{f.status}</span>
                    </TableCell>
                    <TableCell className="text-xs" onClick={() => openDetail(f)}>{f.sensory_score||'—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap" onClick={() => openDetail(f)}>{relTime(f.updated_at)}</TableCell>
                    <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground"/></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {formulas.length > 0 && (
          <div className="px-6 py-2 border-t text-xs text-muted-foreground">
            {formulas.length} formula{formulas.length!==1?'s':''} shown
            {compareIds.length > 0 && <span className="ml-3 text-primary font-medium">{compareIds.length} selected for comparison</span>}
          </div>
        )}
      </Card>

      {/* ── Create Dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Formula</DialogTitle>
            <DialogDescription>Create a new formula version for a project</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="basic">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
            </TabsList>
            <TabsContent value="basic" className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label>Project <span className="text-red-500">*</span></Label>
                  <Select value={createForm.project_id} onValueChange={v => setCreateForm(f=>({...f,project_id:v}))}>
                    <SelectTrigger><SelectValue placeholder="Select project"/></SelectTrigger>
                    <SelectContent>{projects.map(p=><SelectItem key={p.project_id} value={p.project_id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Formula Type</Label>
                  <Select value={createForm.formula_type} onValueChange={v => setCreateForm(f=>({...f,formula_type:v}))}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>{FORMULA_TYPES.map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Protein Source</Label>
                  <Input value={createForm.protein_source} onChange={e=>setCreateForm(f=>({...f,protein_source:e.target.value}))} placeholder="e.g. Whey Isolate 25%"/>
                </div>
                <div className="space-y-1.5">
                  <Label>Sweetener</Label>
                  <Input value={createForm.sweetener} onChange={e=>setCreateForm(f=>({...f,sweetener:e.target.value}))} placeholder="e.g. Sucrose + Stevia"/>
                </div>
                <div className="space-y-1.5">
                  <Label>Protein %</Label>
                  <Input value={createForm.protein_pct} onChange={e=>setCreateForm(f=>({...f,protein_pct:e.target.value}))} placeholder="e.g. 26%"/>
                </div>
                <div className="space-y-1.5">
                  <Label>Cocoa %</Label>
                  <Input value={createForm.cocoa_pct} onChange={e=>setCreateForm(f=>({...f,cocoa_pct:e.target.value}))} placeholder="e.g. 15%"/>
                </div>
                <div className="space-y-1.5">
                  <Label>Sugar (g/100g)</Label>
                  <Input value={createForm.sugar_per_100g} onChange={e=>setCreateForm(f=>({...f,sugar_per_100g:e.target.value}))} placeholder="e.g. 10"/>
                </div>
                <div className="space-y-1.5">
                  <Label>Cost/kg (₹)</Label>
                  <Input value={createForm.cost_per_kg} onChange={e=>setCreateForm(f=>({...f,cost_per_kg:e.target.value}))} placeholder="e.g. 425"/>
                </div>
                <div className="space-y-1.5">
                  <Label>Stability at 40°C</Label>
                  <Input value={createForm.stability_40c} onChange={e=>setCreateForm(f=>({...f,stability_40c:e.target.value}))} placeholder="e.g. 92 days"/>
                </div>
                <div className="space-y-1.5">
                  <Label>Sensory Score</Label>
                  <Input value={createForm.sensory_score} onChange={e=>setCreateForm(f=>({...f,sensory_score:e.target.value}))} placeholder="e.g. 8.6/10"/>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Notes</Label>
                  <Textarea rows={3} value={createForm.notes} onChange={e=>setCreateForm(f=>({...f,notes:e.target.value}))} placeholder="Observations, rationale, special instructions..."/>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="ingredients" className="pt-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Ingredient List</Label>
                  <Button size="sm" variant="outline" onClick={addIngredient}><Plus className="h-3 w-3 mr-1"/>Add Row</Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ingredient Name</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ingredients.map((ing, i) => (
                      <TableRow key={i}>
                        <TableCell><Input value={ing.name} onChange={e=>updateIngredient(i,'name',e.target.value)} placeholder="e.g. Whey Protein Isolate"/></TableCell>
                        <TableCell><Input value={ing.qty} onChange={e=>updateIngredient(i,'qty',e.target.value)} placeholder="25" className="w-20"/></TableCell>
                        <TableCell>
                          <Select value={ing.unit} onValueChange={v=>updateIngredient(i,'unit',v)}>
                            <SelectTrigger className="w-20"><SelectValue/></SelectTrigger>
                            <SelectContent>{['g','kg','ml','L','%','ppm'].map(u=><SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell><Input value={ing.supplier} onChange={e=>updateIngredient(i,'supplier',e.target.value)} placeholder="Supplier name"/></TableCell>
                        <TableCell><Button size="sm" variant="ghost" onClick={()=>removeIngredient(i)}><Trash2 className="h-3 w-3 text-red-500"/></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <RefreshCw className="h-4 w-4 animate-spin mr-2"/>}Create Formula
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Detail / Edit Dialog ── */}
      {selected && (
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <DialogTitle className="text-xl font-mono">{selected.formula_id}</DialogTitle>
                  <DialogDescription className="mt-1">{selected.project_name} • {selected.version} • by {selected.created_by}</DialogDescription>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-1 rounded-md font-medium whitespace-nowrap ${FORMULA_STATUS_COLORS[selected.status]||'bg-slate-100'}`}>{selected.status}</span>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                    onClick={() => window.open(`${API_BASE}/api/formulation/report/${selected.project_id}?token=${encodeURIComponent(token)}`, '_blank')}>
                    <FileText className="h-3.5 w-3.5"/>Project Report
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="ingredients">Ingredients ({(editForm.ingredients||[]).length})</TabsTrigger>
                <TabsTrigger value="status">Status</TabsTrigger>
                <TabsTrigger value="comments">Comments ({comments.length})</TabsTrigger>
              </TabsList>

              {/* Details tab */}
              <TabsContent value="details" className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Formula Type</Label>
                    {canEdit
                      ? <Select value={editForm.formula_type||''} onValueChange={v=>setEditForm(f=>({...f,formula_type:v}))}>
                          <SelectTrigger><SelectValue/></SelectTrigger>
                          <SelectContent>{FORMULA_TYPES.map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                      : <p className="text-sm py-2">{editForm.formula_type}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Protein Source</Label>
                    {canEdit
                      ? <Input value={editForm.protein_source||''} onChange={e=>setEditForm(f=>({...f,protein_source:e.target.value}))} placeholder="e.g. Whey Isolate 25%"/>
                      : <p className="text-sm py-2">{editForm.protein_source||'—'}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Sweetener</Label>
                    {canEdit
                      ? <Input value={editForm.sweetener||''} onChange={e=>setEditForm(f=>({...f,sweetener:e.target.value}))}/>
                      : <p className="text-sm py-2">{editForm.sweetener||'—'}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Protein %</Label>
                    {canEdit
                      ? <Input value={editForm.protein_pct||''} onChange={e=>setEditForm(f=>({...f,protein_pct:e.target.value}))}/>
                      : <p className="text-sm py-2">{editForm.protein_pct||'—'}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cocoa %</Label>
                    {canEdit
                      ? <Input value={editForm.cocoa_pct||''} onChange={e=>setEditForm(f=>({...f,cocoa_pct:e.target.value}))}/>
                      : <p className="text-sm py-2">{editForm.cocoa_pct||'—'}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Sugar (g/100g)</Label>
                    {canEdit
                      ? <Input value={editForm.sugar_per_100g||''} onChange={e=>setEditForm(f=>({...f,sugar_per_100g:e.target.value}))}/>
                      : <p className="text-sm py-2">{editForm.sugar_per_100g||'—'}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cost/kg (₹)</Label>
                    {canEdit
                      ? <Input value={editForm.cost_per_kg||''} onChange={e=>setEditForm(f=>({...f,cost_per_kg:e.target.value}))}/>
                      : <p className="text-sm py-2">{editForm.cost_per_kg||'—'}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Stability at 40°C</Label>
                    {canEdit
                      ? <Input value={editForm.stability_40c||''} onChange={e=>setEditForm(f=>({...f,stability_40c:e.target.value}))}/>
                      : <p className="text-sm py-2">{editForm.stability_40c||'—'}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Sensory Score</Label>
                    {canEdit
                      ? <Input value={editForm.sensory_score||''} onChange={e=>setEditForm(f=>({...f,sensory_score:e.target.value}))} placeholder="e.g. 8.6/10"/>
                      : <p className="text-sm py-2">{editForm.sensory_score||'—'}</p>}
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>Notes</Label>
                    {canEdit
                      ? <Textarea rows={3} value={editForm.notes||''} onChange={e=>setEditForm(f=>({...f,notes:e.target.value}))}/>
                      : <p className="text-sm py-2 whitespace-pre-line">{editForm.notes||'—'}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-1">
                  {[
                    { label:'Created', value: selected.created_at ? new Date(selected.created_at).toLocaleString():'—' },
                    { label:'Updated', value: selected.updated_at ? new Date(selected.updated_at).toLocaleString():'—' },
                    { label:'Version', value: selected.version },
                  ].map(({label,value}) => (
                    <div key={label} className="bg-slate-50 rounded-lg p-3 border">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-sm font-medium mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Ingredients tab */}
              <TabsContent value="ingredients" className="pt-2">
                {canEdit ? (
                  <div className="space-y-3">
                    <div className="flex justify-end">
                      <Button size="sm" variant="outline" onClick={() => setEditForm(f=>({...f,ingredients:[...(f.ingredients||[]),{name:'',qty:'',unit:'g',supplier:''}]}))}>
                        <Plus className="h-3 w-3 mr-1"/>Add Ingredient
                      </Button>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead><TableHead>Qty</TableHead><TableHead>Unit</TableHead><TableHead>Supplier</TableHead><TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(editForm.ingredients||[]).length === 0
                          ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No ingredients added</TableCell></TableRow>
                          : (editForm.ingredients||[]).map((ing,i) => (
                            <TableRow key={i}>
                              <TableCell><Input value={ing.name||''} onChange={e=>setEditForm(f=>({...f,ingredients:f.ingredients.map((r,idx)=>idx===i?{...r,name:e.target.value}:r)}))} placeholder="Ingredient name"/></TableCell>
                              <TableCell><Input value={ing.qty||''} onChange={e=>setEditForm(f=>({...f,ingredients:f.ingredients.map((r,idx)=>idx===i?{...r,qty:e.target.value}:r)}))} className="w-20" placeholder="Qty"/></TableCell>
                              <TableCell>
                                <Select value={ing.unit||'g'} onValueChange={v=>setEditForm(f=>({...f,ingredients:f.ingredients.map((r,idx)=>idx===i?{...r,unit:v}:r)}))}>
                                  <SelectTrigger className="w-20"><SelectValue/></SelectTrigger>
                                  <SelectContent>{['g','kg','ml','L','%','ppm'].map(u=><SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell><Input value={ing.supplier||''} onChange={e=>setEditForm(f=>({...f,ingredients:f.ingredients.map((r,idx)=>idx===i?{...r,supplier:e.target.value}:r)}))} placeholder="Supplier"/></TableCell>
                              <TableCell><Button size="sm" variant="ghost" onClick={()=>setEditForm(f=>({...f,ingredients:f.ingredients.filter((_,idx)=>idx!==i)}))}><Trash2 className="h-3 w-3 text-red-500"/></Button></TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Qty</TableHead><TableHead>Unit</TableHead><TableHead>Supplier</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {(selected.ingredients||[]).length === 0
                        ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No ingredients listed</TableCell></TableRow>
                        : (selected.ingredients||[]).map((ing,i)=>(
                          <TableRow key={i}>
                            <TableCell className="font-medium">{ing.name}</TableCell>
                            <TableCell>{ing.qty||'—'}</TableCell>
                            <TableCell>{ing.unit||'—'}</TableCell>
                            <TableCell>{ing.supplier||'—'}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              {/* Status tab */}
              <TabsContent value="status" className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Formula Status</Label>
                  {canEdit
                    ? <Select value={editForm.status||''} onValueChange={v=>setEditForm(f=>({...f,status:v}))}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                          {FORMULA_STATUSES.map(s=>(
                            <SelectItem key={s} value={s}>
                              <span className={`text-xs px-1.5 py-0.5 rounded mr-2 ${FORMULA_STATUS_COLORS[s]||'bg-slate-100'}`}>{s}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    : <div className="py-2"><span className={`text-xs px-2 py-1 rounded-md font-medium ${FORMULA_STATUS_COLORS[editForm.status]||'bg-slate-100'}`}>{editForm.status}</span></div>}
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  {[
                    { label:'Protein %',       value: selected.protein_pct   },
                    { label:'Cocoa %',          value: selected.cocoa_pct     },
                    { label:'Sugar (g/100g)',   value: selected.sugar_per_100g},
                    { label:'Cost/kg (₹)',      value: selected.cost_per_kg   },
                    { label:'Stability (40°C)', value: selected.stability_40c },
                    { label:'Sensory Score',    value: selected.sensory_score },
                  ].map(({label,value}) => (
                    <div key={label} className="bg-slate-50 rounded-lg p-3 border">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-sm font-semibold mt-0.5">{value||'—'}</p>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Comments tab */}
              <TabsContent value="comments" className="pt-2">
                <div className="space-y-3">
                  <ScrollArea className="h-64 border rounded-lg p-3">
                    {comments.length === 0
                      ? <p className="text-sm text-muted-foreground text-center py-8">No comments yet</p>
                      : comments.map(c => (
                          <div key={c.id} className="mb-3 pb-3 border-b last:border-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{c.user_name}</span>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">{ROLES[c.user_role]?.label||c.user_role}</Badge>
                                <span className="text-xs text-muted-foreground">{relTime(c.created_at)}</span>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{c.comment}</p>
                          </div>
                        ))}
                  </ScrollArea>
                  <div className="flex gap-2">
                    <Textarea rows={2} value={commentText} onChange={e=>setCommentText(e.target.value)}
                      placeholder="Add a comment, observation, or note..." className="flex-1"/>
                    <Button onClick={handleComment} disabled={postingComment||!commentText.trim()} className="self-end">
                      {postingComment ? <RefreshCw className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="gap-2 pt-2">
              {canDelete && (
                <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="mr-auto">
                  {deleting ? <RefreshCw className="h-4 w-4 animate-spin mr-2"/> : <Trash2 className="h-4 w-4 mr-2"/>}Delete
                </Button>
              )}
              <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
              {canEdit && (
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <RefreshCw className="h-4 w-4 animate-spin mr-2"/>}Save Changes
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Compare Dialog ── */}
      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Formula Comparison</DialogTitle>
            <DialogDescription>{compareList.length} formulas selected</DialogDescription>
          </DialogHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-36">Parameter</TableHead>
                  {compareList.map(f => (
                    <TableHead key={f.formula_id}>
                      <div className="font-mono text-xs">{f.formula_id}</div>
                      <div className="font-normal text-xs text-muted-foreground">{f.version}</div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {COMPARE_FIELDS.map(({key,label}) => (
                  <TableRow key={key}>
                    <TableCell className="font-medium text-sm">{label}</TableCell>
                    {compareList.map(f => (
                      <TableCell key={f.formula_id} className={`text-sm ${key==='status'?'':''}`}>
                        {key === 'status'
                          ? <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${FORMULA_STATUS_COLORS[f[key]]||'bg-slate-100'}`}>{f[key]||'—'}</span>
                          : f[key] || '—'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* -------------------- LAB NOTEBOOK -------------------- */
function LabBookView({ user, token, can }) {
  const [exps, setExps] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [projects, setProjects] = useState([])
  const [form, setForm] = useState({ project_id:'', title:'', batch_no:'', temperature:'', duration:'', observations:'', result:'Pass' })
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editObs, setEditObs] = useState('')

  const canCreate = ['admin','fd','rd_head','adl'].includes(user?.role) || (can && can('Lab Notebook','create'))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [eData, pData] = await Promise.all([
        apiCall('/api/labbook', { token }),
        apiCall('/api/projects', { token }),
      ])
      setExps(Array.isArray(eData) ? eData : [])
      setProjects(Array.isArray(pData) ? pData : [])
      if (eData?.length && !selected) setSelected(eData[0])
    } catch(e) { toast.error('Failed to load experiments') }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.project_id || !form.title) return toast.error('Project and title required')
    setSaving(true)
    try {
      const res = await apiCall('/api/labbook', { method:'POST', body: form, token })
      toast.success(`Experiment ${res.exp_id} created`)
      setShowAdd(false)
      setForm({ project_id:'', title:'', batch_no:'', temperature:'', duration:'', observations:'', result:'Pass' })
      await load()
      setSelected(res)
    } catch(e) { toast.error(e.message || 'Failed to create') }
    finally { setSaving(false) }
  }

  const handleUpdateObs = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await apiCall(`/api/labbook/${selected.exp_id}`, { method:'PUT', body:{ observations: editObs }, token })
      toast.success('Observations saved')
      setEditMode(false)
      setSelected(s => ({ ...s, observations: editObs }))
      setExps(es => es.map(e => e.exp_id === selected.exp_id ? { ...e, observations: editObs } : e))
    } catch(e) { toast.error(e.message || 'Failed to save') }
    finally { setSaving(false) }
  }

  const RESULTS = ['Pass','Fail','Inconclusive','In Progress']

  return (
    <div className="space-y-4">
      {/* ── My Assigned Tasks (Lab Notebook) ── */}
      <MyTasksPanel user={user} token={token} taskTypes={['labbook','lab','Lab Testing']} onStatusChange={load} />

      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">E-Lab Notebook</h1><p className="text-muted-foreground text-sm">Digitized experiment records — {exps.length} total</p></div>
        {canCreate && <Button onClick={()=>setShowAdd(true)}><Plus className="h-4 w-4 mr-2"/>New Experiment</Button>}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Experiment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Project</Label>
              <Select value={form.project_id} onValueChange={v=>setForm(f=>({...f,project_id:v}))}>
                <SelectTrigger><SelectValue placeholder="Select project"/></SelectTrigger>
                <SelectContent>{projects.map(p=><SelectItem key={p.project_id} value={p.project_id}>{p.project_id} — {p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Title</Label><Input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Whey solubility trial"/></div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Batch No.</Label><Input value={form.batch_no} onChange={e=>setForm(f=>({...f,batch_no:e.target.value}))} placeholder="B-2026-001"/></div>
              <div><Label>Temperature</Label><Input value={form.temperature} onChange={e=>setForm(f=>({...f,temperature:e.target.value}))} placeholder="40°C"/></div>
              <div><Label>Duration</Label><Input value={form.duration} onChange={e=>setForm(f=>({...f,duration:e.target.value}))} placeholder="4 hrs"/></div>
            </div>
            <div><Label>Observations</Label><Textarea rows={3} value={form.observations} onChange={e=>setForm(f=>({...f,observations:e.target.value}))} placeholder="Record detailed observations here…"/></div>
            <div><Label>Result</Label>
              <Select value={form.result} onValueChange={v=>setForm(f=>({...f,result:v}))}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>{RESULTS.map(r=><SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowAdd(false)}>Cancel</Button>
            <Button disabled={saving} onClick={handleCreate}>{saving?'Creating…':'Create Experiment'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Experiments</CardTitle></CardHeader>
          <CardContent className="p-0">
            {loading ? <div className="p-6 text-center text-muted-foreground text-sm">Loading…</div> :
            <ScrollArea className="h-[500px]"><div className="p-2 space-y-1">
              {exps.length === 0 ? <div className="p-4 text-muted-foreground text-sm">No experiments yet</div> :
              exps.map(e=>(
                <div key={e.exp_id} onClick={()=>{ setSelected(e); setEditMode(false) }}
                  className={`p-3 rounded-lg cursor-pointer hover:bg-slate-100 ${selected?.exp_id===e.exp_id?'bg-primary/5 border border-primary/20':''}`}>
                  <div className="flex justify-between"><span className="text-xs text-muted-foreground font-mono">{e.exp_id}</span>
                    <Badge variant={e.result==='Pass'?'default':e.result==='Fail'?'destructive':'secondary'} className="text-[10px]">{e.result||'—'}</Badge>
                  </div>
                  <div className="font-medium text-sm mt-1 truncate">{e.title}</div>
                  <div className="text-xs text-muted-foreground">{e.project_id}</div>
                </div>
              ))}
            </div></ScrollArea>}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          {!selected ? <CardContent className="p-12 text-center text-muted-foreground">Select an experiment to view details</CardContent> : (
          <>
            <CardHeader className="flex flex-row justify-between items-start">
              <div><CardTitle>{selected.exp_id} — {selected.title}</CardTitle>
                <CardDescription>By {selected.created_by} ({selected.created_by_role}) • {selected.project_id}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant={selected.result==='Pass'?'default':selected.result==='Fail'?'destructive':'secondary'}>{selected.result||'Pending'}</Badge>
                {canCreate && <Button size="sm" variant="outline" onClick={()=>{ setEditMode(true); setEditObs(selected.observations||'') }}><Edit className="h-3 w-3 mr-1"/>Edit</Button>}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 border rounded-lg"><div className="text-xs text-muted-foreground">Batch #</div><div className="font-medium">{selected.batch_no||'—'}</div></div>
                <div className="p-3 border rounded-lg"><div className="text-xs text-muted-foreground">Temperature</div><div className="font-medium">{selected.temperature||'—'}</div></div>
                <div className="p-3 border rounded-lg"><div className="text-xs text-muted-foreground">Duration</div><div className="font-medium">{selected.duration||'—'}</div></div>
                <div className="p-3 border rounded-lg"><div className="text-xs text-muted-foreground">Status</div><div className="font-medium">{selected.status}</div></div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1"><Label>Observations</Label></div>
                {editMode ? (
                  <div className="space-y-2">
                    <Textarea rows={5} value={editObs} onChange={e=>setEditObs(e.target.value)}/>
                    <div className="flex gap-2"><Button size="sm" disabled={saving} onClick={handleUpdateObs}>{saving?'Saving…':'Save'}</Button><Button size="sm" variant="outline" onClick={()=>setEditMode(false)}>Cancel</Button></div>
                  </div>
                ) : <div className="p-3 bg-slate-50 rounded-lg text-sm whitespace-pre-wrap min-h-[80px]">{selected.observations||'No observations recorded yet.'}</div>}
              </div>
              <div className="text-xs text-muted-foreground">Created: {selected.created_at ? new Date(selected.created_at).toLocaleString() : '—'} • Updated: {selected.updated_at ? new Date(selected.updated_at).toLocaleString() : '—'}</div>
            </CardContent>
          </>)}
        </Card>
      </div>
    </div>
  )
}

/* -------------------- PLANT TRIALS -------------------- */
function PlantTrialsView({ user, token, can }) {
  const [trials, setTrials] = useState([])
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ project_id:'', plant_location:'', batch_size:'', stage:'Pilot', bom_code:'', mfc_code:'', product_code:'', sfg_code:'', notes:'', scheduled_date:'' })

  const canCreate = ['admin','production','rd_head','packaging'].includes(user?.role) || (can && can('Plant Trials','create'))
  const STAGES = ['Pilot','Commercial Run','Stability','Scale-up']
  const STATUSES = ['Scheduled','In Progress','Completed','Failed']

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [tData, pData] = await Promise.all([
        apiCall('/api/planttrials', { token }),
        apiCall('/api/projects', { token }),
      ])
      setTrials(Array.isArray(tData) ? tData : [])
      setProjects(Array.isArray(pData) ? pData : [])
    } catch(e) { toast.error('Failed to load trials') }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.project_id) return toast.error('Select a project')
    setSaving(true)
    try {
      await apiCall('/api/planttrials', { method:'POST', body: form, token })
      toast.success('Trial scheduled')
      setShowAdd(false)
      setForm({ project_id:'', plant_location:'', batch_size:'', stage:'Pilot', bom_code:'', mfc_code:'', product_code:'', sfg_code:'', notes:'', scheduled_date:'' })
      load()
    } catch(e) { toast.error(e.message || 'Failed to schedule') }
    finally { setSaving(false) }
  }

  const handleStatus = async (trial, status) => {
    try {
      await apiCall(`/api/planttrials/${trial.trial_id}`, { method:'PUT', body:{ status }, token })
      toast.success(`Status → ${status}`)
      load()
    } catch(e) { toast.error(e.message || 'Failed') }
  }

  const statusColor = s => s==='Completed'?'default':s==='In Progress'?'secondary':s==='Failed'?'destructive':'outline'

  return (
    <div className="space-y-4">
      {/* ── My Assigned Tasks (Plant Trials) ── */}
      <MyTasksPanel user={user} token={token} taskTypes={['plant','Plant','production']} onStatusChange={load} />

      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Plant Trials</h1><p className="text-muted-foreground text-sm">Production scale-up, stability, and commercial run reports</p></div>
        {canCreate && <Button onClick={()=>setShowAdd(true)}><Plus className="h-4 w-4 mr-2"/>Schedule Trial</Button>}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Schedule Plant Trial</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Project</Label>
              <Select value={form.project_id} onValueChange={v=>setForm(f=>({...f,project_id:v}))}>
                <SelectTrigger><SelectValue placeholder="Select project"/></SelectTrigger>
                <SelectContent>{projects.map(p=><SelectItem key={p.project_id} value={p.project_id}>{p.project_id} — {p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Plant Location</Label><Input value={form.plant_location} onChange={e=>setForm(f=>({...f,plant_location:e.target.value}))} placeholder="e.g. Ahmedabad Plant"/></div>
              <div><Label>Batch Size</Label><Input value={form.batch_size} onChange={e=>setForm(f=>({...f,batch_size:e.target.value}))} placeholder="e.g. 500 kg"/></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Stage</Label>
                <Select value={form.stage} onValueChange={v=>setForm(f=>({...f,stage:v}))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>{STAGES.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Scheduled Date</Label><Input type="date" value={form.scheduled_date} onChange={e=>setForm(f=>({...f,scheduled_date:e.target.value}))}/></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>BOM Code</Label><Input value={form.bom_code} onChange={e=>setForm(f=>({...f,bom_code:e.target.value}))} placeholder="BOM-001"/></div>
              <div><Label>MFC Code</Label><Input value={form.mfc_code} onChange={e=>setForm(f=>({...f,mfc_code:e.target.value}))} placeholder="MFC-001"/></div>
              <div><Label>Product Code</Label><Input value={form.product_code} onChange={e=>setForm(f=>({...f,product_code:e.target.value}))} placeholder="P-001"/></div>
              <div><Label>SFG Code</Label><Input value={form.sfg_code} onChange={e=>setForm(f=>({...f,sfg_code:e.target.value}))} placeholder="SFG-001"/></div>
            </div>
            <div><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowAdd(false)}>Cancel</Button>
            <Button disabled={saving} onClick={handleCreate}>{saving?'Scheduling…':'Schedule Trial'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loading ? <Card><CardContent className="p-8 text-center text-muted-foreground">Loading…</CardContent></Card> : (
      <Card><CardContent className="p-0"><Table>
        <TableHeader><TableRow><TableHead>Trial ID</TableHead><TableHead>Project</TableHead><TableHead>Plant</TableHead><TableHead>Batch Size</TableHead><TableHead>Stage</TableHead><TableHead>Status</TableHead><TableHead>Scheduled</TableHead>{canCreate && <TableHead></TableHead>}</TableRow></TableHeader>
        <TableBody>
          {trials.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No trials scheduled yet</TableCell></TableRow> :
          trials.map(t=>(
            <TableRow key={t.trial_id}>
              <TableCell className="font-mono text-xs">{t.trial_id}</TableCell>
              <TableCell className="font-medium">{t.project_name}</TableCell>
              <TableCell>{t.plant_location||'—'}</TableCell>
              <TableCell>{t.batch_size||'—'}</TableCell>
              <TableCell>{t.stage||'—'}</TableCell>
              <TableCell><Badge variant={statusColor(t.status)}>{t.status}</Badge></TableCell>
              <TableCell className="text-sm">{t.scheduled_date||'—'}</TableCell>
              {canCreate && <TableCell>
                <Select onValueChange={v=>handleStatus(t,v)}>
                  <SelectTrigger className="h-7 w-36 text-xs"><SelectValue placeholder="Change status"/></SelectTrigger>
                  <SelectContent>{STATUSES.map(s=><SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
                </Select>
              </TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table></CardContent></Card>
      )}
    </div>
  )
}

/* -------------------- REGULATORY -------------------- */
function RegulatoryView({ user, token, can }) {
  const [checks, setChecks] = useState([])
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ project_id:'', check_type:'Ingredient Compliance', ingredient_or_claim:'', assigned_to:'', assigned_role:'regulatory', due_date:'', notes:'' })

  const canCreate = ['admin','regulatory','rd_head'].includes(user?.role) || (can && can('Regulatory','create'))
  const CHECK_TYPES = ['Ingredient Compliance','Claim Substantiation','FSSAI Filing','Label Compliance','Clinical Study','Import License']
  const STATUSES = ['Pending','Under Review','Approved','Rework Required']
  const statusColor = s => s==='Approved'?'default':s==='Rework Required'?'destructive':s==='Under Review'?'secondary':'outline'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [cData, pData] = await Promise.all([
        apiCall('/api/regulatory', { token }),
        apiCall('/api/projects', { token }),
      ])
      setChecks(Array.isArray(cData) ? cData : [])
      setProjects(Array.isArray(pData) ? pData : [])
    } catch(e) { toast.error('Failed to load') }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.project_id || !form.check_type) return toast.error('Project and check type required')
    setSaving(true)
    try {
      await apiCall('/api/regulatory', { method:'POST', body: form, token })
      toast.success('Regulatory check created & assigned')
      setShowAdd(false)
      setForm({ project_id:'', check_type:'Ingredient Compliance', ingredient_or_claim:'', assigned_to:'', assigned_role:'regulatory', due_date:'', notes:'' })
      load()
    } catch(e) { toast.error(e.message || 'Failed') }
    finally { setSaving(false) }
  }

  const handleStatus = async (check, status) => {
    try {
      await apiCall(`/api/regulatory/${check.reg_id}`, { method:'PUT', body:{ status }, token })
      toast.success(`Status → ${status}`)
      load()
    } catch(e) { toast.error(e.message || 'Failed') }
  }

  const pending = checks.filter(c=>c.status==='Pending').length
  const underReview = checks.filter(c=>c.status==='Under Review').length
  const approved = checks.filter(c=>c.status==='Approved').length
  const rework = checks.filter(c=>c.status==='Rework Required').length

  return (
    <div className="space-y-4">
      {/* ── My Assigned Tasks (Regulatory) ── */}
      <MyTasksPanel user={user} token={token} taskTypes={['regulatory','Regulatory']} onStatusChange={load} />

      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Regulatory Compliance</h1><p className="text-muted-foreground text-sm">Ingredient validation, claims verification, statutory documents</p></div>
        {canCreate && <Button onClick={()=>setShowAdd(true)}><Plus className="h-4 w-4 mr-2"/>Add Check</Button>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{ l:'Pending', v:pending, c:'text-slate-600' },{ l:'Under Review', v:underReview, c:'text-orange-600' },{ l:'Approved', v:approved, c:'text-emerald-600' },{ l:'Rework Required', v:rework, c:'text-red-600' }].map(s=>(
          <Card key={s.l}><CardContent className="p-5"><div className="text-sm text-muted-foreground">{s.l}</div><div className={`text-3xl font-bold ${s.c}`}>{s.v}</div></CardContent></Card>
        ))}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Regulatory Check</DialogTitle><DialogDescription>The assigned role will receive a notification immediately.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label>Project</Label>
              <Select value={form.project_id} onValueChange={v=>setForm(f=>({...f,project_id:v}))}>
                <SelectTrigger><SelectValue placeholder="Select project"/></SelectTrigger>
                <SelectContent>{projects.map(p=><SelectItem key={p.project_id} value={p.project_id}>{p.project_id} — {p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Check Type</Label>
              <Select value={form.check_type} onValueChange={v=>setForm(f=>({...f,check_type:v}))}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>{CHECK_TYPES.map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Ingredient / Claim</Label><Input value={form.ingredient_or_claim} onChange={e=>setForm(f=>({...f,ingredient_or_claim:e.target.value}))} placeholder="e.g. Whey Isolate (imported)"/></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Assigned To</Label><Input value={form.assigned_to} onChange={e=>setForm(f=>({...f,assigned_to:e.target.value}))} placeholder="Person's name"/></div>
              <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e=>setForm(f=>({...f,due_date:e.target.value}))}/></div>
            </div>
            <div><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowAdd(false)}>Cancel</Button>
            <Button disabled={saving} onClick={handleCreate}>{saving?'Creating…':'Create & Notify'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loading ? <Card><CardContent className="p-8 text-center text-muted-foreground">Loading…</CardContent></Card> : (
      <Card><CardHeader><CardTitle>All Regulatory Checks</CardTitle></CardHeader><CardContent className="p-0"><Table>
        <TableHeader><TableRow><TableHead>Reg ID</TableHead><TableHead>Project</TableHead><TableHead>Check Type</TableHead><TableHead>Item</TableHead><TableHead>Assigned</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {checks.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No regulatory checks yet</TableCell></TableRow> :
          checks.map(c=>(
            <TableRow key={c.reg_id}>
              <TableCell className="font-mono text-xs">{c.reg_id}</TableCell>
              <TableCell className="font-medium text-sm">{c.project_name}</TableCell>
              <TableCell className="text-sm">{c.check_type}</TableCell>
              <TableCell className="text-sm">{c.ingredient_or_claim||'—'}</TableCell>
              <TableCell className="text-sm">{c.assigned_to||c.assigned_role||'—'}</TableCell>
              <TableCell><Badge variant="outline" className="text-xs">{c.due_date||'—'}</Badge></TableCell>
              <TableCell><Badge variant={statusColor(c.status)}>{c.status}</Badge></TableCell>
              <TableCell>
                {(['admin','regulatory','rd_head'].includes(user?.role) || user?.role === c.assigned_role) && (
                  <Select onValueChange={v=>handleStatus(c,v)}>
                    <SelectTrigger className="h-7 w-32 text-xs"><SelectValue placeholder="Update"/></SelectTrigger>
                    <SelectContent>{STATUSES.map(s=><SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table></CardContent></Card>
      )}
    </div>
  )
}

/* -------------------- SENSORY -------------------- */
function SensoryView({ user, token, can }) {
  const [evals, setEvals] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ project_id:'', formula_id:'', panel_size:'', eval_date:'', overall_score:'', aroma:'', taste:'', mouthfeel:'', aftertaste:'', adl_protein_pct:'', adl_fat_pct:'', adl_moisture:'', adl_ash:'', adl_apc:'', adl_ecoli:'Absent', notes:'' })

  const canCreate = ['admin','pmsa','adl','rd_head'].includes(user?.role) || (can && can('Sensory','create'))
  const STATUSES = ['Pending','Pass','Fail']
  const statusColor = s => s==='Pass'?'default':s==='Fail'?'destructive':'secondary'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [eData, pData] = await Promise.all([apiCall('/api/sensory', { token }), apiCall('/api/projects', { token })])
      setEvals(Array.isArray(eData) ? eData : [])
      setProjects(Array.isArray(pData) ? pData : [])
      if (eData?.length && !selected) setSelected(eData[0])
    } catch(e) { toast.error('Failed to load') }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.project_id) return toast.error('Select a project')
    setSaving(true)
    try {
      const res = await apiCall('/api/sensory', { method:'POST', body:{ ...form, panel_size: parseInt(form.panel_size)||0 }, token })
      toast.success(`Evaluation ${res.eval_id} submitted`)
      setShowAdd(false)
      setForm({ project_id:'', formula_id:'', panel_size:'', eval_date:'', overall_score:'', aroma:'', taste:'', mouthfeel:'', aftertaste:'', adl_protein_pct:'', adl_fat_pct:'', adl_moisture:'', adl_ash:'', adl_apc:'', adl_ecoli:'Absent', notes:'' })
      await load(); setSelected(res)
    } catch(e) { toast.error(e.message || 'Failed') }
    finally { setSaving(false) }
  }

  const handleStatus = async (ev, status) => {
    try {
      await apiCall(`/api/sensory/${ev.eval_id}`, { method:'PUT', body:{ status }, token })
      toast.success(`Status → ${status}`)
      load()
    } catch(e) { toast.error(e.message || 'Failed') }
  }

  const pct = v => { const n = parseFloat(v); return isNaN(n) ? 0 : Math.min(n, 100) }

  return (
    <div className="space-y-4">
      {/* ── My Assigned Tasks (Sensory) ── */}
      <MyTasksPanel user={user} token={token} taskTypes={['sensory','Sensory']} onStatusChange={load} />

      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Sensory & Analytical Evaluation</h1><p className="text-muted-foreground text-sm">PM & SA + ADL evaluation results</p></div>
        {canCreate && <Button onClick={()=>setShowAdd(true)}><Plus className="h-4 w-4 mr-2"/>Submit Evaluation</Button>}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Sensory & Analytical Evaluation</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto pr-1">
            <div className="col-span-2"><Label>Project</Label>
              <Select value={form.project_id} onValueChange={v=>setForm(f=>({...f,project_id:v}))}>
                <SelectTrigger><SelectValue placeholder="Select project"/></SelectTrigger>
                <SelectContent>{projects.map(p=><SelectItem key={p.project_id} value={p.project_id}>{p.project_id} — {p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Formula ID</Label><Input value={form.formula_id} onChange={e=>setForm(f=>({...f,formula_id:e.target.value}))} placeholder="F-NP-…"/></div>
            <div><Label>Panel Size</Label><Input type="number" value={form.panel_size} onChange={e=>setForm(f=>({...f,panel_size:e.target.value}))} placeholder="e.g. 24"/></div>
            <div><Label>Eval Date</Label><Input type="date" value={form.eval_date} onChange={e=>setForm(f=>({...f,eval_date:e.target.value}))}/></div>
            <div><Label>Overall Score (%)</Label><Input value={form.overall_score} onChange={e=>setForm(f=>({...f,overall_score:e.target.value}))} placeholder="e.g. 86"/></div>
            {[['aroma','Aroma (%)'],['taste','Taste (%)'],['mouthfeel','Mouthfeel (%)'],['aftertaste','Aftertaste (%)']].map(([k,l])=>(
              <div key={k}><Label>{l}</Label><Input value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} placeholder="e.g. 82"/></div>
            ))}
            <div className="col-span-2 mt-2 font-semibold text-sm text-muted-foreground border-t pt-2">ADL Analytical Results</div>
            {[['adl_protein_pct','Protein %'],['adl_fat_pct','Fat %'],['adl_moisture','Moisture %'],['adl_ash','Ash %'],['adl_apc','Aerobic Plate Count'],['adl_ecoli','E. coli']].map(([k,l])=>(
              <div key={k}><Label>{l}</Label><Input value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} placeholder="e.g. 25.8%"/></div>
            ))}
            <div className="col-span-2"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowAdd(false)}>Cancel</Button>
            <Button disabled={saving} onClick={handleCreate}>{saving?'Submitting…':'Submit Evaluation'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loading ? <Card><CardContent className="p-8 text-center text-muted-foreground">Loading…</CardContent></Card> : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Evaluations</CardTitle></CardHeader>
          <CardContent className="p-0"><ScrollArea className="h-[500px]"><div className="p-2 space-y-1">
            {evals.length === 0 ? <div className="p-4 text-muted-foreground text-sm">No evaluations yet</div> :
            evals.map(e=>(
              <div key={e.eval_id} onClick={()=>setSelected(e)}
                className={`p-3 rounded-lg cursor-pointer hover:bg-slate-100 ${selected?.eval_id===e.eval_id?'bg-primary/5 border border-primary/20':''}`}>
                <div className="flex justify-between"><span className="text-xs font-mono text-muted-foreground">{e.eval_id}</span>
                  <Badge variant={statusColor(e.status)} className="text-[10px]">{e.status}</Badge>
                </div>
                <div className="text-sm font-medium truncate">{e.project_name}</div>
                <div className="text-xs text-muted-foreground">{e.eval_date||'—'} • Panel: {e.panel_size||0}</div>
              </div>
            ))}
          </div></ScrollArea></CardContent>
        </Card>

        <Card className="lg:col-span-2">
          {!selected ? <CardContent className="p-12 text-center text-muted-foreground">Select an evaluation</CardContent> : (
          <>
            <CardHeader className="flex flex-row justify-between items-start">
              <div><CardTitle>{selected.eval_id}</CardTitle><CardDescription>{selected.project_name} • {selected.formula_id||'No formula'} • Panel: {selected.panel_size}</CardDescription></div>
              <div className="flex gap-2">
                <Badge variant={statusColor(selected.status)}>{selected.status}</Badge>
                {canCreate && <Select onValueChange={v=>handleStatus(selected,v)}>
                  <SelectTrigger className="h-7 w-28 text-xs"><SelectValue placeholder="Update"/></SelectTrigger>
                  <SelectContent>{STATUSES.map(s=><SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
                </Select>}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="font-medium text-sm mb-2">Sensory Panel Results</div>
                <div className="space-y-2">
                  {[['Overall Acceptance',selected.overall_score],['Aroma',selected.aroma],['Taste',selected.taste],['Mouthfeel',selected.mouthfeel],['Aftertaste',selected.aftertaste]].map(([l,v])=>(
                    <div key={l}><div className="flex justify-between text-sm mb-1"><span>{l}</span><span className="font-medium">{v||'—'}%</span></div><Progress value={pct(v)}/></div>
                  ))}
                </div>
              </div>
              <div>
                <div className="font-medium text-sm mb-2">ADL Analytical (Chemical & Microbial)</div>
                <Table>
                  <TableHeader><TableRow><TableHead>Parameter</TableHead><TableHead>Result</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {[['Protein %',selected.adl_protein_pct],['Fat %',selected.adl_fat_pct],['Moisture',selected.adl_moisture],['Ash',selected.adl_ash],['Aerobic Plate Count',selected.adl_apc],['E. coli',selected.adl_ecoli]].map(([p,v])=>(
                      <TableRow key={p}><TableCell>{p}</TableCell><TableCell className="font-medium">{v||'—'}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {selected.notes && <div className="p-3 bg-slate-50 rounded text-sm">{selected.notes}</div>}
            </CardContent>
          </>)}
        </Card>
      </div>
      )}
    </div>
  )
}

/* -------------------- COSTING -------------------- */
function CostingView({ user, token, can }) {
  const [records, setRecords] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [costRows, setCostRows] = useState([{ component:'', pct:'', cost_inr:'' }])
  const [pkgRows, setPkgRows] = useState([{ item:'', cost_per_unit:'', feasibility:'Feasible' }])
  const [form, setForm] = useState({ project_id:'', formula_id:'', total_cost_per_kg:'', notes:'' })

  const canCreate = ['admin','packaging','rd_head','mgmt'].includes(user?.role) || (can && can('Costing','create'))
  const STATUSES = ['Draft','Under Review','Approved']
  const statusColor = s => s==='Approved'?'default':s==='Under Review'?'secondary':'outline'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rData, pData] = await Promise.all([apiCall('/api/costing', { token }), apiCall('/api/projects', { token })])
      setRecords(Array.isArray(rData) ? rData : [])
      setProjects(Array.isArray(pData) ? pData : [])
      if (rData?.length && !selected) setSelected(rData[0])
    } catch(e) { toast.error('Failed to load') }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.project_id) return toast.error('Select a project')
    setSaving(true)
    try {
      const res = await apiCall('/api/costing', { method:'POST', body:{ ...form, cost_breakdown: costRows.filter(r=>r.component), packaging_items: pkgRows.filter(r=>r.item) }, token })
      toast.success(`Costing record ${res.cost_id} created`)
      setShowAdd(false)
      setForm({ project_id:'', formula_id:'', total_cost_per_kg:'', notes:'' })
      setCostRows([{ component:'', pct:'', cost_inr:'' }])
      setPkgRows([{ item:'', cost_per_unit:'', feasibility:'Feasible' }])
      await load(); setSelected(res)
    } catch(e) { toast.error(e.message || 'Failed') }
    finally { setSaving(false) }
  }

  const handleStatus = async (rec, status) => {
    try {
      await apiCall(`/api/costing/${rec.cost_id}`, { method:'PUT', body:{ status }, token })
      toast.success(`Status → ${status}`)
      load()
    } catch(e) { toast.error(e.message || 'Failed') }
  }

  return (
    <div className="space-y-4">
      {/* ── My Assigned Tasks (Costing) ── */}
      <MyTasksPanel user={user} token={token} taskTypes={['costing','Costing']} onStatusChange={load} />

      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Costing & Packaging Feasibility</h1><p className="text-muted-foreground text-sm">Packaging team costing analysis</p></div>
        {canCreate && <Button onClick={()=>setShowAdd(true)}><Plus className="h-4 w-4 mr-2"/>New Costing</Button>}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Costing Record</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            <div><Label>Project</Label>
              <Select value={form.project_id} onValueChange={v=>setForm(f=>({...f,project_id:v}))}>
                <SelectTrigger><SelectValue placeholder="Select project"/></SelectTrigger>
                <SelectContent>{projects.map(p=><SelectItem key={p.project_id} value={p.project_id}>{p.project_id} — {p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Formula ID</Label><Input value={form.formula_id} onChange={e=>setForm(f=>({...f,formula_id:e.target.value}))} placeholder="F-NP-…"/></div>
              <div><Label>Total Cost / kg (₹)</Label><Input value={form.total_cost_per_kg} onChange={e=>setForm(f=>({...f,total_cost_per_kg:e.target.value}))} placeholder="e.g. 425"/></div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1"><Label>Cost Breakdown</Label><Button size="sm" variant="ghost" onClick={()=>setCostRows(r=>[...r,{component:'',pct:'',cost_inr:''}])}><Plus className="h-3 w-3 mr-1"/>Row</Button></div>
              {costRows.map((r,i)=>(
                <div key={i} className="grid grid-cols-3 gap-1 mb-1">
                  <Input placeholder="Component" value={r.component} onChange={e=>setCostRows(rs=>rs.map((rr,ii)=>ii===i?{...rr,component:e.target.value}:rr))}/>
                  <Input placeholder="%" value={r.pct} onChange={e=>setCostRows(rs=>rs.map((rr,ii)=>ii===i?{...rr,pct:e.target.value}:rr))}/>
                  <Input placeholder="₹" value={r.cost_inr} onChange={e=>setCostRows(rs=>rs.map((rr,ii)=>ii===i?{...rr,cost_inr:e.target.value}:rr))}/>
                </div>
              ))}
            </div>
            <div>
              <div className="flex justify-between items-center mb-1"><Label>Packaging Feasibility</Label><Button size="sm" variant="ghost" onClick={()=>setPkgRows(r=>[...r,{item:'',cost_per_unit:'',feasibility:'Feasible'}])}><Plus className="h-3 w-3 mr-1"/>Row</Button></div>
              {pkgRows.map((r,i)=>(
                <div key={i} className="grid grid-cols-3 gap-1 mb-1">
                  <Input placeholder="Item" value={r.item} onChange={e=>setPkgRows(rs=>rs.map((rr,ii)=>ii===i?{...rr,item:e.target.value}:rr))}/>
                  <Input placeholder="Cost/unit" value={r.cost_per_unit} onChange={e=>setPkgRows(rs=>rs.map((rr,ii)=>ii===i?{...rr,cost_per_unit:e.target.value}:rr))}/>
                  <Select value={r.feasibility} onValueChange={v=>setPkgRows(rs=>rs.map((rr,ii)=>ii===i?{...rr,feasibility:v}:rr))}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent><SelectItem value="Feasible">Feasible</SelectItem><SelectItem value="Under Review">Under Review</SelectItem><SelectItem value="Not Feasible">Not Feasible</SelectItem></SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowAdd(false)}>Cancel</Button>
            <Button disabled={saving} onClick={handleCreate}>{saving?'Creating…':'Create Record'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loading ? <Card><CardContent className="p-8 text-center text-muted-foreground">Loading…</CardContent></Card> : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Records</CardTitle></CardHeader>
          <CardContent className="p-0"><ScrollArea className="h-[500px]"><div className="p-2 space-y-1">
            {records.length === 0 ? <div className="p-4 text-muted-foreground text-sm">No costing records yet</div> :
            records.map(r=>(
              <div key={r.cost_id} onClick={()=>setSelected(r)}
                className={`p-3 rounded-lg cursor-pointer hover:bg-slate-100 ${selected?.cost_id===r.cost_id?'bg-primary/5 border border-primary/20':''}`}>
                <div className="flex justify-between"><span className="text-xs font-mono text-muted-foreground">{r.cost_id}</span><Badge variant={statusColor(r.status)} className="text-[10px]">{r.status}</Badge></div>
                <div className="text-sm font-medium truncate">{r.project_name}</div>
                <div className="text-xs text-muted-foreground">Total: ₹{r.total_cost_per_kg||'—'}/kg</div>
              </div>
            ))}
          </div></ScrollArea></CardContent>
        </Card>
        <Card className="lg:col-span-2">
          {!selected ? <CardContent className="p-12 text-center text-muted-foreground">Select a record to view</CardContent> : (
          <>
            <CardHeader className="flex flex-row justify-between items-start">
              <div><CardTitle>{selected.cost_id}</CardTitle><CardDescription>{selected.project_name} {selected.formula_id ? `• ${selected.formula_id}` : ''} • Total: ₹{selected.total_cost_per_kg||'—'}/kg</CardDescription></div>
              <div className="flex gap-2">
                <Badge variant={statusColor(selected.status)}>{selected.status}</Badge>
                {canCreate && <Select onValueChange={v=>handleStatus(selected,v)}>
                  <SelectTrigger className="h-7 w-28 text-xs"><SelectValue placeholder="Update"/></SelectTrigger>
                  <SelectContent>{STATUSES.map(s=><SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
                </Select>}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {selected.cost_breakdown?.length > 0 && (
                <div>
                  <div className="font-medium text-sm mb-2">Cost Breakdown</div>
                  <Table><TableHeader><TableRow><TableHead>Component</TableHead><TableHead>%</TableHead><TableHead className="text-right">Cost (₹)</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {selected.cost_breakdown.map((r,i)=><TableRow key={i}><TableCell>{r.component}</TableCell><TableCell>{r.pct}%</TableCell><TableCell className="text-right font-medium">₹{r.cost_inr}</TableCell></TableRow>)}
                      <TableRow className="font-bold bg-slate-50"><TableCell>Total</TableCell><TableCell></TableCell><TableCell className="text-right">₹{selected.total_cost_per_kg}/kg</TableCell></TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
              {selected.packaging_items?.length > 0 && (
                <div>
                  <div className="font-medium text-sm mb-2">Packaging Feasibility</div>
                  <div className="space-y-2">
                    {selected.packaging_items.map((p,i)=>(
                      <div key={i} className="flex justify-between items-center p-3 border rounded-lg">
                        <div><div className="font-medium">{p.item}</div><div className="text-sm text-muted-foreground">₹{p.cost_per_unit} / unit</div></div>
                        <Badge variant={p.feasibility==='Feasible'?'default':p.feasibility==='Not Feasible'?'destructive':'secondary'}>{p.feasibility}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selected.notes && <div className="p-3 bg-slate-50 rounded text-sm">{selected.notes}</div>}
            </CardContent>
          </>)}
        </Card>
      </div>
      )}
    </div>
  )
}

/* -------------------- CLAIM -------------------- */
function ClaimView({ user, token, can }) {
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ project_id:'', claim_text:'', evidence:'', assigned_to:'', assigned_role:'sa', notes:'' })

  const canCreate = ['admin','sa','rd_head','regulatory'].includes(user?.role) || (can && can('Claim','create'))
  const STATUSES = ['Pending','In Review','Verified','Rejected']
  const statusColor = s => s==='Verified'?'default':s==='Rejected'?'destructive':s==='In Review'?'secondary':'outline'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [cData, pData] = await Promise.all([apiCall('/api/claims', { token }), apiCall('/api/projects', { token })])
      setClaims(Array.isArray(cData) ? cData : [])
      setProjects(Array.isArray(pData) ? pData : [])
    } catch(e) { toast.error('Failed to load') }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.project_id || !form.claim_text) return toast.error('Project and claim text required')
    setSaving(true)
    try {
      await apiCall('/api/claims', { method:'POST', body: form, token })
      toast.success('Claim created & assigned for substantiation')
      setShowAdd(false)
      setForm({ project_id:'', claim_text:'', evidence:'', assigned_to:'', assigned_role:'sa', notes:'' })
      load()
    } catch(e) { toast.error(e.message || 'Failed') }
    finally { setSaving(false) }
  }

  const handleStatus = async (claim, status) => {
    try {
      await apiCall(`/api/claims/${claim.claim_id}`, { method:'PUT', body:{ status }, token })
      toast.success(`Status → ${status}`)
      load()
    } catch(e) { toast.error(e.message || 'Failed') }
  }

  const pending = claims.filter(c=>c.status==='Pending').length
  const inReview = claims.filter(c=>c.status==='In Review').length
  const verified = claims.filter(c=>c.status==='Verified').length

  return (
    <div className="space-y-4">
      {/* ── My Assigned Tasks (Claims) ── */}
      <MyTasksPanel user={user} token={token} taskTypes={['claim','Claim']} onStatusChange={load} />

      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Claim Substantiation</h1><p className="text-muted-foreground text-sm">SA Team — evidence and validation of product claims</p></div>
        {canCreate && <Button onClick={()=>setShowAdd(true)}><Plus className="h-4 w-4 mr-2"/>Add Claim</Button>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[{ l:'Pending', v:pending, c:'text-slate-600' },{ l:'In Review', v:inReview, c:'text-orange-600' },{ l:'Verified', v:verified, c:'text-emerald-600' }].map(s=>(
          <Card key={s.l}><CardContent className="p-5"><div className="text-sm text-muted-foreground">{s.l}</div><div className={`text-3xl font-bold ${s.c}`}>{s.v}</div></CardContent></Card>
        ))}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Claim Substantiation</DialogTitle><DialogDescription>The SA team will be notified to provide evidence.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label>Project</Label>
              <Select value={form.project_id} onValueChange={v=>setForm(f=>({...f,project_id:v}))}>
                <SelectTrigger><SelectValue placeholder="Select project"/></SelectTrigger>
                <SelectContent>{projects.map(p=><SelectItem key={p.project_id} value={p.project_id}>{p.project_id} — {p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Claim Text</Label><Textarea rows={2} value={form.claim_text} onChange={e=>setForm(f=>({...f,claim_text:e.target.value}))} placeholder="e.g. Supports memory & concentration in children aged 6–15"/></div>
            <div><Label>Evidence / Supporting Data</Label><Textarea rows={2} value={form.evidence} onChange={e=>setForm(f=>({...f,evidence:e.target.value}))} placeholder="e.g. 2 clinical studies, vitamin panel analysis…"/></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Assigned To</Label><Input value={form.assigned_to} onChange={e=>setForm(f=>({...f,assigned_to:e.target.value}))} placeholder="Person's name"/></div>
              <div><Label>Assigned Role</Label>
                <Select value={form.assigned_role} onValueChange={v=>setForm(f=>({...f,assigned_role:v}))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent><SelectItem value="sa">SA Team</SelectItem><SelectItem value="regulatory">Regulatory</SelectItem><SelectItem value="rd_head">R&D Head</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Notes</Label><Textarea rows={1} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowAdd(false)}>Cancel</Button>
            <Button disabled={saving} onClick={handleCreate}>{saving?'Creating…':'Create & Notify'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loading ? <Card><CardContent className="p-8 text-center text-muted-foreground">Loading…</CardContent></Card> : (
      <Card><CardContent className="p-0"><Table>
        <TableHeader><TableRow><TableHead>Claim ID</TableHead><TableHead>Project</TableHead><TableHead>Claim</TableHead><TableHead>Evidence</TableHead><TableHead>Assigned</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {claims.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No claims yet</TableCell></TableRow> :
          claims.map(c=>(
            <TableRow key={c.claim_id}>
              <TableCell className="font-mono text-xs">{c.claim_id}</TableCell>
              <TableCell className="text-sm font-medium">{c.project_name}</TableCell>
              <TableCell className="text-sm max-w-[200px] truncate">{c.claim_text}</TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{c.evidence||'—'}</TableCell>
              <TableCell className="text-sm">{c.assigned_to||c.assigned_role||'—'}</TableCell>
              <TableCell><Badge variant={statusColor(c.status)}>{c.status}</Badge></TableCell>
              <TableCell>
                {(['admin','sa','rd_head','regulatory'].includes(user?.role) || user?.role === c.assigned_role) && (
                  <Select onValueChange={v=>handleStatus(c,v)}>
                    <SelectTrigger className="h-7 w-28 text-xs"><SelectValue placeholder="Update"/></SelectTrigger>
                    <SelectContent>{STATUSES.map(s=><SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table></CardContent></Card>
      )}
    </div>
  )
}

/* -------------------- ARTWORK MANAGEMENT -------------------- */
const ART_STATUS_COLORS = {
  'Brief Pending':      'bg-slate-100 text-slate-700',
  'Design In Progress': 'bg-blue-100 text-blue-700',
  'Under Review':       'bg-amber-100 text-amber-700',
  'Approved':           'bg-green-600 text-white',
  'Rework':             'bg-orange-100 text-orange-700',
  'Rejected':           'bg-red-100 text-red-700',
}
const ART_STATUSES = ['Brief Pending','Design In Progress','Under Review','Approved','Rework','Rejected']
const ART_TYPES    = ['Label','Carton','Pouch','Shipper','Digital Banner','POS Material']

function ArtworkView({ user, token, can }) {
  const [artworks, setArtworks] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading]   = useState(true)
  const [showAdd, setShowAdd]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [selected, setSelected] = useState(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [statusFilter, setStatusFilter] = useState('all')
  const [form, setForm] = useState({ project_id:'', artwork_type:'Label', sku:'', brief_notes:'', design_link:'', assigned_to:'' })

  // marketing + packaging can create; packaging can update status/design; admin full
  const canCreate = ['admin','marketing','packaging','rd_head'].includes(user?.role) || (can && can('Artwork','create'))
  const canUpdate = ['admin','packaging','marketing'].includes(user?.role) || (can && can('Artwork','edit'))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : ''
      const [aData, pData] = await Promise.all([
        apiCall(`/api/artwork${params}`, { token }),
        apiCall('/api/projects', { token }),
      ])
      setArtworks(Array.isArray(aData) ? aData : [])
      setProjects(Array.isArray(pData) ? pData : [])
    } catch(e) { toast.error('Failed to load artwork') }
    finally { setLoading(false) }
  }, [token, statusFilter])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.project_id) return toast.error('Select a project')
    setSaving(true)
    try {
      const res = await apiCall('/api/artwork', { method:'POST', body: form, token })
      toast.success(`Artwork brief ${res.artwork_id} created — Packaging team notified`)
      setShowAdd(false)
      setForm({ project_id:'', artwork_type:'Label', sku:'', brief_notes:'', design_link:'', assigned_to:'' })
      load()
    } catch(e) { toast.error(e.message || 'Failed') }
    finally { setSaving(false) }
  }

  const handleStatusChange = async (art, status) => {
    try {
      await apiCall(`/api/artwork/${art.artwork_id}`, { method:'PUT', body:{ status }, token })
      toast.success(`Status → ${status}`)
      load()
    } catch(e) { toast.error(e.message || 'Failed') }
  }

  const openEdit = (art) => {
    setSelected(art)
    setEditForm({ artwork_type: art.artwork_type, sku: art.sku||'', brief_notes: art.brief_notes||'', design_link: art.design_link||'', assigned_to: art.assigned_to||'', comment: art.comment||'', status: art.status, version: art.version })
    setEditOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiCall(`/api/artwork/${selected.artwork_id}`, { method:'PUT', body: editForm, token })
      toast.success('Artwork updated')
      setEditOpen(false)
      load()
    } catch(e) { toast.error(e.message || 'Failed') }
    finally { setSaving(false) }
  }

  // Counts by status
  const pending = artworks.filter(a => a.status === 'Brief Pending').length
  const inProg  = artworks.filter(a => a.status === 'Design In Progress').length
  const review  = artworks.filter(a => a.status === 'Under Review').length
  const approved = artworks.filter(a => a.status === 'Approved').length

  return (
    <div className="space-y-4">
      {/* ── My Assigned Tasks (Artwork) ── */}
      <MyTasksPanel user={user} token={token} taskTypes={['artwork','Artwork']} onStatusChange={load} />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Artwork Management</h1>
          <p className="text-muted-foreground text-sm">
            {user?.role === 'marketing' ? 'Submit artwork briefs for your brands' :
             user?.role === 'packaging' ? 'Manage designs, upload files, update approvals' :
             'All artwork versions and approvals'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1"/>Refresh</Button>
          {canCreate && <Button onClick={()=>setShowAdd(true)}><Plus className="h-4 w-4 mr-2"/>New Brief</Button>}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l:'Brief Pending', v:pending, c:'text-slate-600' },
          { l:'In Progress',   v:inProg,  c:'text-blue-600' },
          { l:'Under Review',  v:review,  c:'text-amber-600' },
          { l:'Approved',      v:approved,c:'text-emerald-600' },
        ].map(s=>(
          <Card key={s.l} className={`cursor-pointer border-2 ${statusFilter===s.l?'border-primary':'border-transparent'}`}
            onClick={()=>setStatusFilter(f=>f===s.l?'all':s.l)}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{s.l}</div>
              <div className={`text-3xl font-bold mt-1 ${s.c}`}>{s.v}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Artwork Brief</DialogTitle>
            <DialogDescription>Marketing submits brief → Packaging picks up for design</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Project <span className="text-red-500">*</span></Label>
              <Select value={form.project_id} onValueChange={v=>setForm(f=>({...f,project_id:v}))}>
                <SelectTrigger><SelectValue placeholder="Select project"/></SelectTrigger>
                <SelectContent>{projects.map(p=><SelectItem key={p.project_id} value={p.project_id}>{p.project_id} — {p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Artwork Type</Label>
                <Select value={form.artwork_type} onValueChange={v=>setForm(f=>({...f,artwork_type:v}))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>{ART_TYPES.map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>SKU / Pack Size</Label>
                <Input value={form.sku} onChange={e=>setForm(f=>({...f,sku:e.target.value}))} placeholder="e.g. 400g Tin"/>
              </div>
            </div>
            <div><Label>Assigned To (Designer / Vendor)</Label>
              <Input value={form.assigned_to} onChange={e=>setForm(f=>({...f,assigned_to:e.target.value}))} placeholder="e.g. Creativeland Asia"/>
            </div>
            <div><Label>Design Link / File Path</Label>
              <Input value={form.design_link} onChange={e=>setForm(f=>({...f,design_link:e.target.value}))} placeholder="https://drive.google.com/… or \\server\artwork\"/>
            </div>
            <div><Label>Brief Notes</Label>
              <Textarea rows={3} value={form.brief_notes} onChange={e=>setForm(f=>({...f,brief_notes:e.target.value}))} placeholder="Key messages, mandatory elements, brand guidelines to follow…"/>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowAdd(false)}>Cancel</Button>
            <Button disabled={saving} onClick={handleCreate}>{saving?'Creating…':'Submit Brief'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {selected && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selected.artwork_id} — {selected.project_name}</DialogTitle>
              <DialogDescription>{selected.brand} • {selected.artwork_type}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Type</Label>
                  <Select value={editForm.artwork_type||''} onValueChange={v=>setEditForm(f=>({...f,artwork_type:v}))}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>{ART_TYPES.map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Version</Label>
                  <Input value={editForm.version||''} onChange={e=>setEditForm(f=>({...f,version:e.target.value}))} placeholder="v1.0"/>
                </div>
              </div>
              <div><Label>SKU / Pack Size</Label>
                <Input value={editForm.sku||''} onChange={e=>setEditForm(f=>({...f,sku:e.target.value}))}/>
              </div>
              <div><Label>Design Link / File Path</Label>
                <Input value={editForm.design_link||''} onChange={e=>setEditForm(f=>({...f,design_link:e.target.value}))} placeholder="https://…"/>
              </div>
              <div><Label>Assigned To</Label>
                <Input value={editForm.assigned_to||''} onChange={e=>setEditForm(f=>({...f,assigned_to:e.target.value}))}/>
              </div>
              <div><Label>Brief Notes</Label>
                <Textarea rows={2} value={editForm.brief_notes||''} onChange={e=>setEditForm(f=>({...f,brief_notes:e.target.value}))}/>
              </div>
              <div><Label>Review Comment</Label>
                <Textarea rows={2} value={editForm.comment||''} onChange={e=>setEditForm(f=>({...f,comment:e.target.value}))} placeholder="Reviewer feedback, change requests…"/>
              </div>
              <div><Label>Status</Label>
                <Select value={editForm.status||''} onValueChange={v=>setEditForm(f=>({...f,status:v}))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>{ART_STATUSES.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={()=>setEditOpen(false)}>Cancel</Button>
              <Button disabled={saving} onClick={handleSave}>{saving?'Saving…':'Save Changes'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Table */}
      {loading ? <Card><CardContent className="p-8 text-center text-muted-foreground">Loading…</CardContent></Card> : (
        <Card><CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Artwork ID</TableHead><TableHead>Project</TableHead><TableHead>Brand</TableHead>
                <TableHead>Type</TableHead><TableHead>SKU</TableHead><TableHead>Version</TableHead>
                <TableHead>Assigned To</TableHead><TableHead>Status</TableHead><TableHead>Design Link</TableHead>
                {canUpdate && <TableHead></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {artworks.length === 0
                ? <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-12">
                    <Palette className="h-10 w-10 mx-auto mb-2 opacity-20"/>
                    <p>No artwork briefs yet</p>
                    {canCreate && <p className="text-xs mt-1">Create a brief using the button above</p>}
                  </TableCell></TableRow>
                : artworks.map(a => (
                  <TableRow key={a.artwork_id} className="hover:bg-muted/40">
                    <TableCell className="font-mono text-xs">{a.artwork_id}</TableCell>
                    <TableCell className="font-medium text-sm max-w-[160px] truncate">{a.project_name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{a.brand}</Badge></TableCell>
                    <TableCell className="text-sm">{a.artwork_type}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.sku||'—'}</TableCell>
                    <TableCell><Badge variant="secondary" className="font-mono text-xs">{a.version}</Badge></TableCell>
                    <TableCell className="text-sm">{a.assigned_to||'—'}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-md font-medium whitespace-nowrap ${ART_STATUS_COLORS[a.status]||'bg-slate-100'}`}>
                        {a.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {a.design_link
                        ? <a href={a.design_link} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                            <Eye className="h-3 w-3"/>View
                          </a>
                        : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    {canUpdate && (
                      <TableCell className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" title="Edit" onClick={()=>openEdit(a)}><Edit className="h-4 w-4"/></Button>
                        <Select onValueChange={v=>handleStatusChange(a,v)}>
                          <SelectTrigger className="h-7 w-28 text-xs"><SelectValue placeholder="Status"/></SelectTrigger>
                          <SelectContent>{ART_STATUSES.map(s=><SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
          {artworks.length > 0 && (
            <div className="px-4 py-2 border-t text-xs text-muted-foreground">
              {artworks.length} artwork brief{artworks.length !== 1 ? 's' : ''} shown
            </div>
          )}
        </CardContent></Card>
      )}
    </div>
  )
}

/* -------------------- MASTER DATA (SAP) -------------------- */
function MasterDataView({ user, token }) {
  const [tab, setTab]         = useState('pm')
  const [data, setData]       = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')

  const canAdd = ['admin','production','packaging','pm'].includes(user?.role)

  // Map tab → config_type key in DB
  const TYPE_MAP = { pm:'sap_pm', bom:'sap_bom', sfg:'sap_sfg', pkg:'sap_pkg' }

  const loadTab = useCallback(async (t) => {
    setLoading(true)
    try {
      const res = await apiCall(`/api/master-config?config_type=${TYPE_MAP[t]}`, { token })
      setData(d => ({ ...d, [t]: Array.isArray(res) ? res : [] }))
    } catch { setData(d => ({ ...d, [t]: [] })) }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { loadTab(tab) }, [tab, loadTab])

  const TABS = [
    { key:'pm',  label:'PM Codes',      desc:'Raw material & packaging material codes' },
    { key:'bom', label:'BOM Codes',     desc:'Bill of Material codes per formula' },
    { key:'sfg', label:'SFG Codes',     desc:'Semi-Finished Goods codes' },
    { key:'pkg', label:'Packaging BOM', desc:'Packaging material bill of materials' },
  ]

  const COL_LABELS = {
    pm:  ['PM Code','Description','Category','UOM','Vendor'],
    bom: ['BOM Code','Description','Project','Version'],
    sfg: ['SFG Code','Description','UOM','Storage'],
    pkg: ['PKG Code','Description','Type','Material','Vendor'],
  }

  const getRow = (item, t) => {
    const m = item.meta || {}
    switch(t) {
      case 'pm':  return [item.key, item.label, m.category||'—', m.uom||'—', m.vendor||'—']
      case 'bom': return [item.key, item.label, m.project||'—', m.version||'—']
      case 'sfg': return [item.key, item.label, m.uom||'—', m.storage||'—']
      case 'pkg': return [item.key, item.label, m.type||'—', m.material||'—', m.vendor||'—']
      default:    return [item.key, item.label]
    }
  }

  const rows = (data[tab] || []).filter(item =>
    !search || item.key.toLowerCase().includes(search.toLowerCase()) || item.label.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Master Data (SAP)</h1>
          <p className="text-muted-foreground text-sm">
            {user?.role === 'pm' ? 'PM codes & BOM for your projects' :
             user?.role === 'production' ? 'BOM, SFG, and production codes' :
             user?.role === 'packaging' ? 'Packaging BOM and material codes' :
             'Synchronized SAP master codes — PM, BOM, SFG, Packaging'}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
            <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search codes…" className="pl-9 w-52"/>
          </div>
          <Button variant="outline" onClick={()=>loadTab(tab)}><RefreshCw className="h-4 w-4 mr-1"/>Sync</Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={t=>{ setTab(t); setSearch('') }}>
        <TabsList>
          {TABS.map(t=><TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>)}
        </TabsList>

        {TABS.map(tabDef => (
          <TabsContent key={tabDef.key} value={tabDef.key}>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-base">{tabDef.label}</CardTitle>
                    <CardDescription>{tabDef.desc}</CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{rows.length} record{rows.length !== 1 ? 's' : ''}</span>
                    <Badge variant="outline" className="text-xs font-mono">SAP Synced</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading
                  ? <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
                  : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {COL_LABELS[tabDef.key].map(h => <TableHead key={h}>{h}</TableHead>)}
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.length === 0
                          ? <TableRow><TableCell colSpan={COL_LABELS[tabDef.key].length + 1} className="text-center text-muted-foreground py-8">
                              No {tabDef.label} found — click Sync or add via Master Configuration
                            </TableCell></TableRow>
                          : rows.map(item => {
                              const cells = getRow(item, tabDef.key)
                              return (
                                <TableRow key={item.id} className="hover:bg-muted/40">
                                  <TableCell className="font-mono text-xs font-semibold">{cells[0]}</TableCell>
                                  {cells.slice(1).map((c, i) => (
                                    <TableCell key={i} className="text-sm">{c}</TableCell>
                                  ))}
                                  <TableCell className="text-xs text-muted-foreground">
                                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Today'}
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                      </TableBody>
                    </Table>
                  )}
              </CardContent>
              {canAdd && (
                <div className="px-4 py-3 border-t bg-slate-50 flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">Codes synced from SAP. To add codes go to <strong>Master Configuration</strong> in admin.</p>
                  <Badge variant="secondary" className="text-xs">Last sync: Today</Badge>
                </div>
              )}
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

/* -------------------- REPORTS -------------------- */
function ReportsView({ token }) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiCall('/api/reports/summary', { token })
      .then(d => setSummary(d))
      .catch(() => setSummary(null))
      .finally(() => setLoading(false))
  }, [token])

  const StatBox = ({ label, value, color = 'text-foreground' }) => (
    <div className="bg-slate-50 rounded-lg p-4 border text-center">
      <div className={`text-3xl font-bold ${color}`}>{value ?? '—'}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  )

  const BarRow = ({ label, value, max, color = 'bg-primary' }) => {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="w-40 shrink-0 text-muted-foreground truncate">{label}</span>
        <div className="flex-1 bg-slate-100 rounded-full h-2">
          <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="w-8 text-right font-semibold tabular-nums">{value}</span>
      </div>
    )
  }

  if (loading) return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold">Reports & Analytics</h1></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <Card key={i}><CardContent className="h-20 animate-pulse bg-slate-100 rounded"/></Card>)}
      </div>
    </div>
  )

  const maxBrand = Math.max(...(summary?.by_brand || []).map(b => b.count), 1)
  const maxStatus = Math.max(...Object.values(summary?.by_status || {}), 1)

  const statusColors = {
    'Draft': 'bg-slate-400', 'PPD Review': 'bg-blue-400', 'Formulation': 'bg-emerald-400',
    'Plant Trial': 'bg-orange-400', 'Regulatory Review': 'bg-red-400',
    'CEO Approval': 'bg-purple-400', 'Completed': 'bg-green-600', 'Archived': 'bg-gray-400',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Reports & Analytics</h1><p className="text-muted-foreground text-sm">Live platform metrics — refreshed on load</p></div>
        <Button variant="outline" onClick={() => { setLoading(true); apiCall('/api/reports/summary', { token }).then(setSummary).finally(() => setLoading(false)) }}>
          <RefreshCw className="h-4 w-4 mr-2"/>Refresh
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox label="Total Projects" value={summary?.total_projects} color="text-foreground" />
        <StatBox label="Active Projects" value={summary?.active_projects} color="text-emerald-600" />
        <StatBox label="Completed" value={summary?.completed_projects} color="text-blue-600" />
        <StatBox label="Activity (30d)" value={summary?.recent_activity_30d} color="text-purple-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projects by Status */}
        <Card>
          <CardHeader><CardTitle>Projects by Status</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(summary?.by_status || {}).sort((a,b) => b[1]-a[1]).map(([st, cnt]) => (
              <BarRow key={st} label={st} value={cnt} max={maxStatus} color={statusColors[st] || 'bg-slate-400'} />
            ))}
            {!Object.keys(summary?.by_status || {}).length && <p className="text-sm text-muted-foreground py-4 text-center">No data yet</p>}
          </CardContent>
        </Card>

        {/* Projects by Brand */}
        <Card>
          <CardHeader><CardTitle>Projects by Brand</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(summary?.by_brand || []).map(b => (
              <BarRow key={b.brand} label={b.brand || 'Unknown'} value={b.count} max={maxBrand} color="bg-primary" />
            ))}
            {!(summary?.by_brand || []).length && <p className="text-sm text-muted-foreground py-4 text-center">No data yet</p>}
          </CardContent>
        </Card>

        {/* Formulas by Status */}
        <Card>
          <CardHeader><CardTitle>Formulation Pipeline</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(summary?.formulas_by_status || {}).map(([s, v]) => (
                <div key={s} className="p-3 border rounded-lg text-center">
                  <div className="text-xl font-bold">{v}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s}</div>
                </div>
              ))}
              {!Object.keys(summary?.formulas_by_status || {}).length && <p className="text-sm text-muted-foreground col-span-3 py-4 text-center">No formulas yet</p>}
            </div>
          </CardContent>
        </Card>

        {/* Module summaries */}
        <Card>
          <CardHeader><CardTitle>Module Status Summary</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Regulatory Checks', data: summary?.regulatory_by_status, colors: { Approved: 'text-emerald-600', Pending: 'text-slate-600', 'Under Review': 'text-orange-600', 'Rework Required': 'text-red-600' } },
              { label: 'Plant Trials', data: summary?.trials_by_status, colors: { Completed: 'text-emerald-600', 'In Progress': 'text-blue-600', Scheduled: 'text-slate-600', Failed: 'text-red-600' } },
              { label: 'Sensory Evaluations', data: summary?.sensory_by_status, colors: { Pass: 'text-emerald-600', Fail: 'text-red-600', Pending: 'text-slate-600' } },
            ].map(({ label, data, colors }) => (
              <div key={label}>
                <div className="text-sm font-semibold mb-1">{label}</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(data || {}).map(([s, v]) => (
                    <span key={s} className={`text-sm font-medium ${colors[s] || 'text-slate-600'}`}>
                      {s}: <span className="font-bold">{v}</span>
                    </span>
                  ))}
                  {!Object.keys(data || {}).length && <span className="text-xs text-muted-foreground">No data</span>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Export buttons */}
      <Card>
        <CardHeader><CardTitle>Export Reports</CardTitle><CardDescription>Download platform data for offline analysis</CardDescription></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { t: 'Projects CSV', d: 'All project records', action: () => window.open(`${API_BASE}/api/projects`, '_blank') },
              { t: 'Audit Log CSV', d: 'Complete audit trail', action: () => toast.info('Export from Audit Logs page') },
              { t: 'Pipeline Summary', d: 'Current stage distribution', action: () => toast.info('Use browser Print for PDF export') },
            ].map(r => (
              <div key={r.t} className="flex items-center justify-between p-4 border rounded-lg">
                <div><div className="font-medium text-sm">{r.t}</div><div className="text-xs text-muted-foreground">{r.d}</div></div>
                <Button size="sm" variant="outline" onClick={r.action}><Download className="h-3 w-3 mr-1"/>Export</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/* -------------------- ARCHIVE -------------------- */
function ArchiveView({ token }) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiCall(`/api/projects?status=Archived${q ? `&q=${encodeURIComponent(q)}` : ''}`, { token })
      setProjects(Array.isArray(data) ? data : [])
    } catch(e) { toast.error('Failed to load archive') }
    finally { setLoading(false) }
  }, [token, q])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Archive</h1><p className="text-muted-foreground text-sm">Completed & archived projects ({projects.length} records)</p></div>
      </div>
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1"><Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search archived projects by name or ID…" className="pl-9 h-11"/></div>
            <Button variant="outline" className="h-11" onClick={load}><RefreshCw className="h-4 w-4 mr-2"/>Refresh</Button>
          </div>
        </CardContent>
      </Card>
      {loading ? <Card><CardContent className="p-8 text-center text-muted-foreground">Loading…</CardContent></Card> : (
      <Card><CardContent className="p-0"><Table>
        <TableHeader><TableRow><TableHead>Project ID</TableHead><TableHead>Name</TableHead><TableHead>Brand</TableHead><TableHead>Owner</TableHead><TableHead>Updated</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>
          {projects.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No archived projects found</TableCell></TableRow> :
          projects.map(p=>(
            <TableRow key={p.project_id}>
              <TableCell className="font-mono text-xs">{p.project_id}</TableCell>
              <TableCell className="font-medium">{p.name}</TableCell>
              <TableCell>{p.brand}</TableCell>
              <TableCell>{p.owner}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{p.updated_at ? new Date(p.updated_at).toLocaleDateString() : '—'}</TableCell>
              <TableCell><Badge variant="secondary">{p.status}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table></CardContent></Card>
      )}
    </div>
  )
}

/* -------------------- ADMIN — USERS -------------------- */
function UsersAdmin({ token }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [form, setForm] = useState({ name:'', email:'', role:'fd', department:'R&D', password:'Welcome@123' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiCall('/api/users', { token })
      setUsers(Array.isArray(data) ? data : [])
    } catch(e) { toast.error('Failed to load users') }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    if (!form.name || !form.email) return toast.error('Name and email required')
    setSaving(true)
    try {
      await apiCall('/api/users', { method:'POST', body: form, token })
      toast.success('User created')
      setShowAdd(false)
      setForm({ name:'', email:'', role:'fd', department:'R&D', password:'Welcome@123' })
      load()
    } catch(e) { toast.error(e.message || 'Failed to create user') }
    finally { setSaving(false) }
  }

  const handleUpdate = async () => {
    setSaving(true)
    try {
      await apiCall(`/api/users/${editUser.id}`, { method:'PUT', body:{ name:editUser.name, role:editUser.role, department:editUser.department, status:editUser.status }, token })
      toast.success('User updated')
      setEditUser(null)
      load()
    } catch(e) { toast.error(e.message || 'Failed to update') }
    finally { setSaving(false) }
  }

  const handleDelete = async (u) => {
    if (!confirm(`Delete user ${u.name}?`)) return
    try {
      await apiCall(`/api/users/${u.id}`, { method:'DELETE', token })
      toast.success('User deleted')
      load()
    } catch(e) { toast.error(e.message || 'Failed to delete') }
  }

  const toggleStatus = async (u) => {
    try {
      await apiCall(`/api/users/${u.id}`, { method:'PUT', body:{ status: u.status==='Active'?'Inactive':'Active' }, token })
      toast.success(`User ${u.status==='Active'?'deactivated':'activated'}`)
      load()
    } catch(e) { toast.error('Failed to update status') }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Users</h1><p className="text-muted-foreground text-sm">Manage employees, roles, and access ({users.length} users)</p></div>
        <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-2"/>Add User</Button>
      </div>

      {/* Add User Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New User</DialogTitle><DialogDescription>Create an account. Default password: Welcome@123</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label>Full Name</Label><Input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Dr. Anjali Rao"/></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="email@company.com"/></div>
            <div><Label>Role</Label>
              <Select value={form.role} onValueChange={v=>setForm(f=>({...f,role:v}))}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>{Object.entries(ROLES).map(([k,v])=><SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Department</Label><Input value={form.department} onChange={e=>setForm(f=>({...f,department:e.target.value}))} placeholder="e.g. R&D"/></div>
            <div><Label>Initial Password</Label><Input value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}/></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowAdd(false)}>Cancel</Button>
            <Button disabled={saving} onClick={handleAdd}>{saving?'Creating…':'Create User'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      {editUser && (
        <Dialog open onOpenChange={()=>setEditUser(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit User — {editUser.name}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Full Name</Label><Input value={editUser.name} onChange={e=>setEditUser(u=>({...u,name:e.target.value}))}/></div>
              <div><Label>Role</Label>
                <Select value={editUser.role} onValueChange={v=>setEditUser(u=>({...u,role:v}))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>{Object.entries(ROLES).map(([k,v])=><SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Department</Label><Input value={editUser.department||''} onChange={e=>setEditUser(u=>({...u,department:e.target.value}))}/></div>
              <div><Label>Status</Label>
                <Select value={editUser.status} onValueChange={v=>setEditUser(u=>({...u,status:v}))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={()=>setEditUser(null)}>Cancel</Button>
              <Button disabled={saving} onClick={handleUpdate}>{saving?'Saving…':'Save Changes'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Card><CardContent className="p-0">
        {loading ? <div className="p-8 text-center text-muted-foreground">Loading users…</div> : (
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Department</TableHead><TableHead>Status</TableHead><TableHead>Last Login</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {users.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No users found</TableCell></TableRow> : users.map(u=>(
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                <TableCell><Badge variant="outline">{ROLES[u.role]?.label || u.role}</Badge></TableCell>
                <TableCell>{u.department}</TableCell>
                <TableCell><Badge variant={u.status==='Active'?'default':'secondary'}>{u.status}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}</TableCell>
                <TableCell className="flex gap-1">
                  <Button size="sm" variant="ghost" title="Edit" onClick={()=>setEditUser({...u})}><Edit className="h-4 w-4"/></Button>
                  <Button size="sm" variant="ghost" title={u.status==='Active'?'Deactivate':'Activate'} onClick={()=>toggleStatus(u)}><UserCog className="h-4 w-4"/></Button>
                  <Button size="sm" variant="ghost" title="Delete" className="text-destructive" onClick={()=>handleDelete(u)}><Trash2 className="h-4 w-4"/></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        )}
      </CardContent></Card>
    </div>
  )
}

/* -------------------- ADMIN — ROLES -------------------- */
const PERM_MODULES = ['Projects','PPD','Formulation','Lab Notebook','Plant Trials','Regulatory','Sensory','Costing','Claim','Artwork','Master Data','Reports','Archive','Users','Audit']
const PERM_ACTIONS = ['view','create','edit','submit','approve','delete']

function RolesAdmin({ token }) {
  const [matrix, setMatrix]     = useState({})   // { "fd::Formulation": {view:T,create:F,...} }
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [dirty, setDirty]       = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)

  // Load all permissions from DB on mount
  useEffect(() => {
    if (!token) return
    setLoading(true)
    apiCall('/api/role-permissions', { token })
      .then(rows => {
        const m = {}
        rows.forEach(r => { m[`${r.role}::${r.module}`] = r.permissions })
        setMatrix(m)
      })
      .catch(() => toast.error('Failed to load permissions'))
      .finally(() => setLoading(false))
  }, [token])

  // Toggle a single action for a role×module cell
  const toggle = (role, module, action) => {
    const key = `${role}::${module}`
    setMatrix(prev => ({
      ...prev,
      [key]: { ...(prev[key] || {}), [action]: !(prev[key]?.[action]) }
    }))
    setDirty(true)
  }

  // Get current value for a cell
  const val = (role, module, action) => matrix[`${role}::${module}`]?.[action] ?? false

  // Save entire matrix to backend in one bulk call
  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = Object.entries(matrix).map(([key, perms]) => {
        const [role, module] = key.split('::')
        return { role, module, permissions: perms }
      })
      await apiCall('/api/role-permissions/bulk', { method: 'POST', token, body: payload })
      setDirty(false)
      setSavedMsg(true)
      setTimeout(() => setSavedMsg(false), 2500)
      toast.success('Permissions saved successfully')
    } catch (err) {
      toast.error('Save failed: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Grant / revoke all actions for a role in one module
  const toggleRow = (role, module) => {
    const key = `${role}::${module}`
    const allOn = PERM_ACTIONS.every(a => matrix[key]?.[a])
    setMatrix(prev => ({
      ...prev,
      [key]: Object.fromEntries(PERM_ACTIONS.map(a => [a, !allOn]))
    }))
    setDirty(true)
  }

  const roleEntries = Object.entries(ROLES)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Roles & Permissions</h1>
          <p className="text-muted-foreground text-sm">
            Configure module &amp; action-level access per role. Changes are saved to the database.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && <span className="text-xs text-amber-600 font-medium">● Unsaved changes</span>}
          {savedMsg && <span className="text-xs text-emerald-600 font-medium">✓ Saved</span>}
          <Button size="sm" disabled={saving || !dirty} onClick={handleSave}>
            {saving ? <><RefreshCw className="h-3 w-3 animate-spin mr-1"/>Saving…</> : <><CheckCircle2 className="h-3 w-3 mr-1"/>Save Changes</>}
          </Button>
        </div>
      </div>

      {loading ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">Loading permissions…</CardContent></Card>
      ) : (
        roleEntries.map(([roleKey, roleInfo]) => (
          <Card key={roleKey}>
            <CardHeader className="py-3 px-5">
              <div className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${roleInfo.color}`} />
                <CardTitle className="text-base">{roleInfo.label}</CardTitle>
                <Badge variant="outline" className="font-mono text-xs ml-1">{roleKey}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground w-40">Module</th>
                    {PERM_ACTIONS.map(a => (
                      <th key={a} className="text-center px-2 py-2 font-medium text-muted-foreground capitalize w-20">{a}</th>
                    ))}
                    <th className="text-center px-2 py-2 font-medium text-muted-foreground w-20">All</th>
                  </tr>
                </thead>
                <tbody>
                  {PERM_MODULES.map((module, i) => {
                    const allOn = PERM_ACTIONS.every(a => val(roleKey, module, a))
                    const someOn = PERM_ACTIONS.some(a => val(roleKey, module, a))
                    return (
                      <tr key={module} className={`border-b last:border-0 ${i % 2 === 0 ? '' : 'bg-slate-50/50'} hover:bg-blue-50/30 transition-colors`}>
                        <td className="px-4 py-2 font-medium">{module}</td>
                        {PERM_ACTIONS.map(action => (
                          <td key={action} className="text-center px-2 py-2">
                            <Checkbox
                              checked={val(roleKey, module, action)}
                              onCheckedChange={() => toggle(roleKey, module, action)}
                              className="mx-auto"
                            />
                          </td>
                        ))}
                        {/* "All" toggle for the row */}
                        <td className="text-center px-2 py-2">
                          <Checkbox
                            checked={allOn}
                            className={`mx-auto ${someOn && !allOn ? 'opacity-50' : ''}`}
                            onCheckedChange={() => toggleRow(roleKey, module)}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}

/* -------------------- ADMIN — MASTERS -------------------- */
function MastersAdmin({ token }) {
  const [configs, setConfigs] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeType, setActiveType] = useState('brand')
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ key:'', label:'', meta:{} })

  const load = useCallback(async (type) => {
    setLoading(true)
    try {
      const data = await apiCall(`/api/master-config?config_type=${type||activeType}`, { token })
      setConfigs(Array.isArray(data) ? data : [])
    } catch(e) { toast.error('Failed to load config') }
    finally { setLoading(false) }
  }, [token, activeType])

  useEffect(() => { load(activeType) }, [activeType, token])

  const handleAdd = async () => {
    if (!form.key || !form.label) return toast.error('Key and label required')
    setSaving(true)
    try {
      await apiCall('/api/master-config', { method:'POST', body:{ config_type: activeType, key: form.key, label: form.label, meta: form.meta }, token })
      toast.success('Added')
      setShowAdd(false)
      setForm({ key:'', label:'', meta:{} })
      load(activeType)
    } catch(e) { toast.error(e.message || 'Failed') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    try {
      await apiCall(`/api/master-config/${id}`, { method:'DELETE', token })
      toast.success('Removed')
      load(activeType)
    } catch(e) { toast.error('Failed') }
  }

  const TYPE_TABS = [{ key:'brand', label:'Brands' },{ key:'project_type', label:'Project Types' },{ key:'raw_material', label:'Raw Materials' },{ key:'department', label:'Departments' }]

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold">Master Configuration</h1><p className="text-muted-foreground text-sm">Manage brands, project types, raw materials, and departments</p></div>

      <Tabs value={activeType} onValueChange={v=>{ setActiveType(v); setShowAdd(false) }}>
        <TabsList>{TYPE_TABS.map(t=><TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>)}</TabsList>

        {TYPE_TABS.map(tab=>(
          <TabsContent key={tab.key} value={tab.key}>
            <Card>
              <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle>{tab.label}</CardTitle>
                <Button size="sm" onClick={()=>setShowAdd(true)}><Plus className="h-3 w-3 mr-1"/>Add</Button>
              </CardHeader>
              <CardContent>
                {loading ? <div className="text-center text-muted-foreground py-4">Loading…</div> : (
                  <>
                    {showAdd && (
                      <div className="flex gap-2 mb-4 p-3 border rounded-lg bg-slate-50">
                        <Input placeholder="Key (e.g. brand_x)" value={form.key} onChange={e=>setForm(f=>({...f,key:e.target.value}))} className="flex-1"/>
                        <Input placeholder="Display Label" value={form.label} onChange={e=>setForm(f=>({...f,label:e.target.value}))} className="flex-1"/>
                        {tab.key === 'raw_material' && <Input placeholder="Vendor (meta)" onChange={e=>setForm(f=>({...f,meta:{...f.meta,vendor:e.target.value}}))} className="flex-1"/>}
                        <Button size="sm" disabled={saving} onClick={handleAdd}>{saving?'…':'Save'}</Button>
                        <Button size="sm" variant="outline" onClick={()=>setShowAdd(false)}>Cancel</Button>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {configs.length === 0 ? <span className="text-muted-foreground text-sm">No items yet</span> :
                      configs.map(c=>(
                        <Badge key={c.id} variant="outline" className="text-sm py-2 px-4">
                          {c.label}
                          {c.meta?.vendor && <span className="ml-1 text-xs text-muted-foreground">({c.meta.vendor})</span>}
                          <button className="ml-2 opacity-50 hover:opacity-100" onClick={()=>handleDelete(c.id)}><Trash2 className="h-3 w-3"/></button>
                        </Badge>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

/* -------------------- AUDIT -------------------- */
function AuditView({ token }) {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const PAGE = 50

  const load = useCallback(async (p = 0) => {
    setLoading(true)
    try {
      const data = await apiCall(`/api/audit?limit=${PAGE}&skip=${p * PAGE}`, { token })
      setLogs(data.logs || [])
      setTotal(data.total || 0)
    } catch(e) { toast.error('Failed to load audit logs') }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { load(page) }, [load, page])

  const exportCSV = () => {
    if (!logs.length) return
    const header = 'Timestamp,User,Email,Action,Entity,Roles\n'
    const rows = logs.map(l => `"${l.timestamp}","${l.user_name}","${l.user_email}","${l.action_label||l.action}","${l.entity}","${l.involved_roles}"`).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `audit-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
  }

  const ACTION_COLORS = { CREATE:'text-emerald-700 bg-emerald-50', UPDATE:'text-blue-700 bg-blue-50', DELETE:'text-red-700 bg-red-50', LOGIN:'text-slate-600 bg-slate-100' }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Audit Logs</h1><p className="text-muted-foreground text-sm">Complete activity trail — {total} total entries</p></div>
        <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-2"/>Export CSV</Button>
      </div>

      {loading ? <Card><CardContent className="p-8 text-center text-muted-foreground">Loading…</CardContent></Card> : (
      <Card><CardContent className="p-0"><Table>
        <TableHeader><TableRow><TableHead>Timestamp</TableHead><TableHead>User</TableHead><TableHead>Action</TableHead><TableHead>Detail</TableHead><TableHead>Entity</TableHead></TableRow></TableHeader>
        <TableBody>
          {logs.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No logs yet</TableCell></TableRow> :
          logs.map(l=>(
            <TableRow key={l.id}>
              <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">{l.timestamp ? new Date(l.timestamp).toLocaleString() : '—'}</TableCell>
              <TableCell><div className="font-medium text-sm">{l.user_name}</div><div className="text-xs text-muted-foreground">{l.user_email}</div></TableCell>
              <TableCell><span className={`text-xs font-semibold px-2 py-0.5 rounded ${ACTION_COLORS[l.action]||'text-slate-600 bg-slate-100'}`}>{l.action}</span></TableCell>
              <TableCell className="text-sm max-w-[300px] truncate">{l.action_label||'—'}</TableCell>
              <TableCell className="font-mono text-xs">{l.entity||'—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table></CardContent></Card>
      )}

      {total > PAGE && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page===0} onClick={()=>setPage(p=>p-1)}>Previous</Button>
          <span className="text-sm text-muted-foreground self-center">Page {page+1} of {Math.ceil(total/PAGE)}</span>
          <Button variant="outline" size="sm" disabled={(page+1)*PAGE>=total} onClick={()=>setPage(p=>p+1)}>Next</Button>
        </div>
      )}
    </div>
  )
}
