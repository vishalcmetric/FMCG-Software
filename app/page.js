'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
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
  UserCog, Package, Beaker, ClipboardList, FileCheck2, RefreshCw, Send, MessageSquare, Trash2, Home, Paperclip
} from 'lucide-react'

/* -------------------- ROLES & MENU CONFIG -------------------- */
const ROLES = {
  admin:          { label: 'System Administrator',    color: 'bg-purple-600',  desc: 'Full system access, user & config management' },
  source:         { label: 'Source Team',             color: 'bg-blue-600',    desc: 'Creates PPDs, initiates new product requests' },
  pm:             { label: 'Project Management',      color: 'bg-cyan-600',    desc: 'Reviews PPDs, assigns teams, tracks project lifecycle' },
  fd:             { label: 'R&D / F&D Team',          color: 'bg-emerald-600', desc: 'Formulation development, lab book, sensory trials' },
  rd_head:        { label: 'R&D Head',                color: 'bg-emerald-800', desc: 'Approves formulations, oversees R&D pipeline — Stage 3 reviewer' },
  marketing_head: { label: 'Marketing Head',          color: 'bg-pink-700',    desc: 'Marketing strategy, PPD review — Stage 3 reviewer' },
  sales_head:     { label: 'Sales Head',              color: 'bg-rose-600',    desc: 'Sales feasibility, market readiness — Stage 3 reviewer' },
  gdso_head:      { label: 'GDSO Head',               color: 'bg-violet-700',  desc: 'Global Demand & Supply Operations — Stage 3 reviewer' },
  regulatory:     { label: 'Regulatory Head',         color: 'bg-red-600',     desc: 'Regulatory compliance, FSSAI, ingredient checks — Stage 3 reviewer' },
  cfo:            { label: 'CFO',                     color: 'bg-slate-700',   desc: 'Financial feasibility review — Stage 3 reviewer' },
  packaging:      { label: 'Packaging Team',          color: 'bg-amber-600',   desc: 'Costing feasibility, artwork, SFG/PKG BOM' },
  sa:             { label: 'Scientific Affairs',      color: 'bg-sky-600',     desc: 'Claim substantiation, clinical evidence, regulatory docs' },
  ceo:            { label: 'CEO',                     color: 'bg-black',       desc: 'Final approval authority — Stage 4 (terminal)' },
  production:     { label: 'Production Team',color: 'bg-orange-600',  desc: 'Pilot trials, BOM, MFC, stability batch reports' },
}

// WBS-aligned menu — what each role needs access to per documented workflow
const MENU = [
  { key: 'dashboard',    label: 'Dashboard',             icon: LayoutDashboard, roles: 'all' },
  // PPD: Source creates, PM assigns, Functional reviews, Mgmt approves, CEO final
  { key: 'ppd',         label: 'PPD Management',        icon: FileText,        roles: ['admin','source','pm','fd','rd_head','marketing_head','sales_head','gdso_head','regulatory','cfo','marketing','packaging','sa','adl','pmsa','ceo'] },
  // Formulation: F&D team + R&D Head (after PPD CEO-approved)
  { key: 'formulation', label: 'Formulation Dev.',      icon: FlaskConical,    roles: ['admin','fd','rd_head','adl'] },
  // Lab Book: F&D team, ADL lab, R&D Head
  { key: 'labbook',     label: 'E-Lab Notebook',        icon: Notebook,        roles: ['admin','fd','rd_head','adl'] },
  // Plant Trials: Production team, Packaging, R&D Head
  { key: 'plant',       label: 'Plant Trials',          icon: Factory,         roles: ['admin','production','rd_head','packaging','fd'] },
  // Pilot Trial: report upload + review + closure (new module)
  { key: 'pilot_trial', label: 'Pilot Trial',           icon: ClipboardList,   roles: ['admin','rd_head','pm'] },
  // Regulatory: Regulatory team reviews FD docs, R&D Head oversees
  { key: 'regulatory',  label: 'Regulatory',            icon: ShieldCheck,     roles: ['admin','regulatory','rd_head','sa'] },
  // Sensory: PM&SA team, ADL lab, R&D Head
  { key: 'sensory',     label: 'Sensory & Analytical',  icon: TestTube2,       roles: ['admin','pmsa','adl','rd_head','fd'] },
  // Costing: Packaging, R&D Head, Management (view)
  { key: 'costing',     label: 'Costing & Feasibility', icon: Calculator,      roles: ['admin','packaging','rd_head','mgmt'] },
  // Claims: Scientific Affairs, R&D Head, Regulatory
  { key: 'claim',       label: 'Claim Substantiation',  icon: BadgeCheck,      roles: ['admin','sa','rd_head','regulatory'] },
  // Artwork: Packaging manages, Marketing reviews
  { key: 'artwork',     label: 'Artwork (Karomi)',       icon: Palette,         roles: ['admin','packaging','marketing','production','rd_head'] },
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
// API_BASE: used only for window.open() PDF downloads, static file links, and health check.
// All JSON API calls via apiCall() use relative paths (/api/...) so they flow through
// the Next.js proxy (app/api/[[...path]]/route.js) which forwards to the FastAPI backend.
// This fixes "Failed to fetch" when the app is accessed from any machine/network.
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
  // Use relative path so requests go through Next.js proxy → FastAPI backend.
  // path is already like "/api/formulation" so this resolves on the same host.
  const res = await fetch(path, opts)
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
  // Start as null on both server and client to avoid SSR hydration mismatch.
  // After mount (client-only), restore from localStorage if a session was saved.
  const [user, setUser]   = useState(null)
  const [token, setToken] = useState(null)
  const [view, setView]   = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [hydrated, setHydrated] = useState(false)

  // Restore session from localStorage after first client render
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('fmcg_token')
      const savedUser  = localStorage.getItem('fmcg_user')
      if (savedToken && savedUser) {
        setToken(savedToken)
        setUser(JSON.parse(savedUser))
      }
    } catch {}
    setHydrated(true)
  }, [])

  const handleLogin = (userData, accessToken) => {
    setUser(userData)
    setToken(accessToken)
    try { localStorage.setItem('fmcg_user', JSON.stringify(userData)); localStorage.setItem('fmcg_token', accessToken) } catch {}
  }

  const handleLogout = () => {
    setUser(null)
    setToken(null)
    setView('dashboard')
    try { localStorage.removeItem('fmcg_user'); localStorage.removeItem('fmcg_token') } catch {}
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

  // Don't render anything until localStorage has been read (avoids hydration flash)
  if (!hydrated) return null
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
            <h1 className="text-2xl font-bold">Pharma FMCG Software</h1>
            <p className="text-sm opacity-80">FMCG Product Development Platform</p>
          </div>
        </div>
      </div>
      <div className="relative z-10 space-y-6">
        <h2 className="text-4xl font-bold leading-tight">Digitizing the future of <span className="text-orange-400">FMCG innovation</span></h2>
        <p className="text-lg opacity-80 max-w-md">End-to-end product lifecycle management.</p>
        <div className="grid grid-cols-3 gap-4 pt-6">
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
  // Increment every time the view switches TO dashboard — forces re-mount + fresh fetch
  const [dashboardKey, setDashboardKey] = useState(0)
  const prevViewRef = useRef(view)
  useEffect(() => {
    if (view === 'dashboard' && prevViewRef.current !== 'dashboard') {
      setDashboardKey(k => k + 1)
    }
    prevViewRef.current = view
  }, [view])

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
          <ViewRouter view={view} setView={setView} user={user} token={token} userPerms={userPerms} can={can} dashboardKey={dashboardKey} />
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
  const [clearing, setClearing]   = useState(false)

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

  const clearAll = async () => {
    if (!confirm('Delete all notifications? This cannot be undone.')) return
    setClearing(true)
    try {
      await apiCall('/api/notifications/clear-all', { method: 'DELETE', token })
      setNotifs([])
      setUnread(0)
    } catch (_) {}
    finally { setClearing(false) }
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
              <div className="flex items-center gap-3">
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
                {notifs.length > 0 && (
                  <button
                    onClick={clearAll}
                    disabled={clearing}
                    className="text-xs text-red-500 hover:underline flex items-center gap-1"
                  >
                    {clearing && <RefreshCw className="h-3 w-3 animate-spin" />}
                    Clear all
                  </button>
                )}
              </div>
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
function ViewRouter({ view, setView, user, token, userPerms, can, dashboardKey }) {
  const p = "p-6 space-y-6"

  // Map view key → module name so we can check permission for the active view
  const MENU_TO_MODULE_LOCAL = {
    ppd:'PPD', formulation:'Formulation',
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
    case 'dashboard':    return <div className={p}><Dashboard key={dashboardKey} user={user} setView={setView} token={token} /></div>
    case 'ppd':          return guard('PPD',         <div className={p}><PPDView user={user} token={token} can={can} /></div>)
    case 'formulation':  return guard('Formulation', <div className={p}><FormulationView user={user} token={token} can={can} /></div>)
    case 'labbook':      return guard('Lab Notebook',<div className={p}><LabBookView user={user} token={token} can={can} /></div>)
    case 'plant':        return guard('Plant Trials',<div className={p}><PlantTrialsView user={user} token={token} can={can} /></div>)
    case 'pilot_trial':  return guard('Pilot Trial', <div className={p}><PilotTrialView user={user} token={token} /></div>)
    case 'regulatory':   return guard('Regulatory',  <div className={p}><RegulatoryView user={user} token={token} can={can} /></div>)
    case 'sensory':      return guard('Sensory',     <div className={p}><SensoryView user={user} token={token} can={can} /></div>)
    case 'costing':      return guard('Costing',     <div className={p}><CostingView user={user} token={token} can={can} /></div>)
    case 'claim':        return guard('Claim',       <div className={p}><ClaimView user={user} token={token} can={can} /></div>)
    case 'artwork':      return guard('Artwork',     <div className={p}><ArtworkView user={user} token={token} can={can} /></div>)
    case 'master':       return guard('Master Data', <div className={p}><MasterDataView user={user} token={token} can={can} /></div>)
    case 'reports':      return guard('Reports',     <div className={p}><ReportsView user={user} token={token} /></div>)
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
// Simplified: only Pending, Rework, Approved — all roles have same options
const _REVIEWER_OPT = [{ v:'approved', l:'Approve', cls:'text-emerald-700 border-emerald-300 hover:bg-emerald-50' }, { v:'rework', l:'Request Rework', cls:'text-amber-700 border-amber-300 hover:bg-amber-50' }]
const _TASK_OWNER_OPT = [{ v:'pending', l:'Mark Pending', cls:'text-slate-700 border-slate-300 hover:bg-slate-50' }, { v:'approved', l:'Mark Done', cls:'text-emerald-700 border-emerald-300 hover:bg-emerald-50' }]

const ROLE_TASK_STATUSES = {
  source:         _TASK_OWNER_OPT,
  pm:             _REVIEWER_OPT,
  fd:             _REVIEWER_OPT,
  rd_head:        _REVIEWER_OPT,
  marketing_head: _REVIEWER_OPT,
  sales_head:     _REVIEWER_OPT,
  gdso_head:      _REVIEWER_OPT,
  regulatory:     _REVIEWER_OPT,
  cfo:            _REVIEWER_OPT,
  marketing:      _REVIEWER_OPT,
  packaging:      _TASK_OWNER_OPT,
  adl:            _TASK_OWNER_OPT,
  pmsa:           _TASK_OWNER_OPT,
  sa:             _REVIEWER_OPT,
  ceo:            _REVIEWER_OPT,
  production:     _TASK_OWNER_OPT,
  admin:          [..._REVIEWER_OPT, ...[ { v:'pending', l:'Reset to Pending', cls:'text-slate-700 border-slate-300 hover:bg-slate-50' }]],
}

const TASK_STATUS_BADGE = {
  pending:  'bg-slate-100 text-slate-700',
  approved: 'bg-emerald-100 text-emerald-800',
  rework:   'bg-amber-100 text-amber-800',
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
      const all = await apiCall('/api/ppd/tasks/mine', { token })
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
      await apiCall(`/api/ppd/tasks/${t.task_id}/status`, {
        method: 'PATCH', token, body: { status: newStatus }
      })
      toast.success(`Task updated to "${newStatus}"`)
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
            const isActionable = t.status !== 'approved'
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

  const stats      = data?.stats           || FALLBACK_DASHBOARD(user.role).stats
  const tasks      = data?.pending_tasks   || FALLBACK_DASHBOARD(user.role).pending_tasks
  const activity   = data?.recent_activity || FALLBACK_DASHBOARD(user.role).recent_activity
  const recentPpds = data?.recent_ppds     || []

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
          {/* Source and admin can create a new PPD */}
          {['admin','source'].includes(user.role) && (
            <Button onClick={() => setView('ppd')} className="gap-2"><Plus className="h-4 w-4"/>New PPD</Button>
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

      {/* ── Tasks ── */}
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>My Pending Tasks</CardTitle>
              <CardDescription>
                Items assigned to <span className="font-semibold text-foreground">{ROLES[user.role]?.label || user.role}</span> — use the status dropdown to take action
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setView('ppd')}>View all</Button>
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
                      approval: 'ppd', review: 'ppd', report: 'ppd',
                      ppd_review: 'ppd', ppd_mgmt_approval: 'ppd',
                    }
                    const dest = (t.task_type && typeMap[t.task_type.toLowerCase()]) ||
                      (t.task?.toLowerCase().includes('formula') ? 'formulation' :
                       t.task?.toLowerCase().includes('regulat') ? 'regulatory' :
                       t.task?.toLowerCase().includes('sensory') ? 'sensory' :
                       t.task?.toLowerCase().includes('plant') ? 'plant' :
                       t.task?.toLowerCase().includes('ppd') ? 'ppd' : 'ppd')
                    const isActionable = t.task_id && token
                    return (
                      <TableRow key={t.task_id || t.id || `${t.project}-${t.task}`}>
                        <TableCell className="font-medium max-w-[130px] truncate" title={t.project}>{t.project}</TableCell>
                        <TableCell className="max-w-[200px]">
                          <span className="text-sm">{t.task}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={t.priority==='Critical'?'destructive':t.priority==='High'?'default':'secondary'} className="text-xs">{t.priority}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">{t.due}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => { setView(dest); toast.info(`Opening ${t.project}`) }}>
                            <Eye className="h-3 w-3 mr-1"/>Open
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Recent PPDs Section ── */}
      {recentPpds.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Recent PPDs
              </CardTitle>
              <CardDescription>Latest Product Development Plans visible to you</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setView('ppd')}>View all</Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PPD ID</TableHead>
                  <TableHead>Title / Product</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPpds.map(p => {
                  const relT = (iso) => {
                    if (!iso) return '—'
                    const diff = Date.now() - new Date(iso).getTime()
                    const m = Math.floor(diff/60000)
                    if (m < 1) return 'just now'
                    if (m < 60) return `${m}m ago`
                    const h = Math.floor(m/60)
                    if (h < 24) return `${h}h ago`
                    return `${Math.floor(h/24)}d ago`
                  }
                  return (
                    <TableRow key={p.ppd_id} className="cursor-pointer hover:bg-muted/50" onClick={() => setView('ppd')}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{p.ppd_id}</TableCell>
                      <TableCell>
                        <div className="font-medium text-sm max-w-[200px] truncate">{p.ppd_title || p.project_name}</div>
                        <div className="text-xs text-muted-foreground">{p.project_name}</div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{p.brand}</Badge></TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-md font-medium whitespace-nowrap ${PPD_STATUS_COLORS[p.status] || 'bg-slate-100'}`}>
                          {PPD_STATUS_LABELS[p.status] || p.status}
                        </span>
                      </TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs font-mono">{p.ppd_version}</Badge></TableCell>
                      <TableCell className="text-sm">{p.created_by}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{relT(p.updated_at)}</TableCell>
                      <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

    </div>
  )
}

/* -------------------- FALLBACK DASHBOARD DATA (when API offline) -------------------- */
function FALLBACK_DASHBOARD(role) {
  // Always return empty data — real counts come from the API only.
  // This prevents stale/fake numbers from showing on the dashboard.
  return {
    stats: [
      { label: 'Active PPDs',       value: 0, change: '', icon: 'FileText',    color: 'from-emerald-500 to-emerald-700' },
      { label: 'Pending Approvals', value: 0, change: '', icon: 'FileCheck2',  color: 'from-orange-500 to-orange-700' },
      { label: 'Under Review',      value: 0, change: '', icon: 'FlaskConical', color: 'from-blue-500 to-blue-700' },
      { label: 'Approved PPDs',     value: 0, change: '', icon: 'CheckCircle2', color: 'from-purple-500 to-purple-700' },
    ],
    pending_tasks: [],
    recent_activity: [],
    pipeline: [],
  }
}

const BRANDS       = ['Complan','Sugar Free','Nycil','Glucon-D','Everyuth','Nutralite','Sugarlite']
const PRIORITIES   = ['Low','Medium','High','Critical']
const ALL_ROLE_KEYS = ['source','pm','fd','rd_head','marketing_head','sales_head','gdso_head','regulatory','cfo','marketing','packaging','adl','pmsa','sa','ceo','production']

function _ProjectsViewRemoved({ setView, user, token, can }) {
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
  'Pending':          'bg-slate-200 text-slate-800',
  'Rework':           'bg-amber-100 text-amber-800',
  'ReviewerApproved': 'bg-blue-100 text-blue-800',
  'MgmtReview':       'bg-violet-100 text-violet-800',
  'MgmtApproved':     'bg-indigo-100 text-indigo-800',
  'FinalReview':      'bg-orange-100 text-orange-800',
  'Approved':         'bg-emerald-100 text-emerald-800',
  'Completed':        'bg-green-600 text-white',
}
const PPD_STATUS_LABELS = {
  'Pending':          'Pending',
  'Rework':           'Rework',
  'ReviewerApproved': 'Reviewer Approved',
  'MgmtReview':       'Management Review',
  'MgmtApproved':     'Management Approved',
  'FinalReview':      'Final Review (CEO)',
  'Approved':         'Approved ✓',
  'Completed':        'Completed 🎉',
}
const PPD_STATUSES = Object.keys(PPD_STATUS_COLORS)

/** Top-level PPD list (role-filtered from API) */
function PPDView({ user, token, can }) {
  const [ppds, setPpds]               = useState([])
  const [loading, setLoading]         = useState(true)
  const [q, setQ]                     = useState('')
  const [statusFilter, setStatus]     = useState('all')
  const [closingPpd, setClosingPpd]   = useState(null)

  // Create PPD dialog
  const [createOpen, setCreateOpen]   = useState(false)
  const [creating, setCreating]       = useState(false)
  const [createForm, setCreateForm]   = useState({
    project_name:'', brand:'Complan', ppd_title:'', product_category:'',
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

  useEffect(() => { fetchPPDs() }, [fetchPPDs])

  const handleCreate = async () => {
    if (!createForm.project_name?.trim()) return toast.error('Product name is required')
    if (!createForm.brand?.trim()) return toast.error('Brand is required')
    if (!createForm.ppd_title?.trim()) return toast.error('PPD Title is required')
    setCreating(true)
    try {
      const ppd = await apiCall('/api/ppd', { method: 'POST', token, body: createForm })
      toast.success(`PPD created: ${ppd.ppd_id}`)
      setCreateOpen(false)
      setCreateForm({ project_name:'', brand:'Complan', ppd_title:'', product_category:'', target_consumer:'', market_segment:'', expected_launch:'', objective:'', key_benefits:'' })
      fetchPPDs()
    } catch (err) { toast.error(err.message) }
    finally { setCreating(false) }
  }

  const openCreate = () => setCreateOpen(true)

  // ── Close Project (pm / admin — only when Approved) ──
  const handleCloseProject = async (e, ppdId) => {
    e.stopPropagation()
    if (!confirm(`Close project ${ppdId}? This will mark it as Completed.`)) return
    setClosingPpd(ppdId)
    try {
      const fd = new FormData()
      fd.append('ppd_id', ppdId)
      const res = await fetch('/api/pilot-reports/close-project', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.detail || 'Failed') }
      toast.success('Project closed — marked as Completed')
      fetchPPDs()
    } catch (err) { toast.error(err.message) }
    finally { setClosingPpd(null) }
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
              <p className="text-sm">{isAdmin ? 'Create a PPD using the button above' : 'No PPDs are assigned to your team yet'}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-36">PPD ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Product Name</TableHead>
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
                      <div className="font-medium text-sm max-w-[180px] truncate">{p.ppd_title || '—'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm max-w-[200px] truncate">{p.project_name}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{p.brand}</Badge></TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-md font-medium whitespace-nowrap ${PPD_STATUS_COLORS[p.status] || 'bg-slate-100'}`}>
                        {PPD_STATUS_LABELS[p.status] || p.status}
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
                    <TableCell onClick={e => e.stopPropagation()}>
                      {(user?.role === 'pm' || user?.role === 'admin') && p.status === 'Approved' && (
                        <Button size="sm" variant="outline"
                          className="text-xs border-emerald-400 text-emerald-700 hover:bg-emerald-50 h-7 px-2 whitespace-nowrap"
                          disabled={closingPpd === p.ppd_id}
                          onClick={e => handleCloseProject(e, p.ppd_id)}>
                          {closingPpd === p.ppd_id ? <RefreshCw className="h-3 w-3 animate-spin"/> : <CheckCircle2 className="h-3 w-3 mr-1"/>}
                          Close Project
                        </Button>
                      )}
                      {p.status !== 'Approved' && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </TableCell>
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
            <DialogDescription>Product Development Plan — enter product name and brand to start.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-2">
              <Label>Product Name <span className="text-red-500">*</span></Label>
              <Input value={createForm.project_name} onChange={e => setCreateForm(f => ({...f, project_name: e.target.value}))} placeholder="e.g. Complan Pro Chocolate Boost" />
            </div>
            <div className="space-y-2">
              <Label>Brand <span className="text-red-500">*</span></Label>
              <Select value={createForm.brand} onValueChange={v => setCreateForm(f => ({...f, brand: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>PPD Title <span className="text-red-500">*</span></Label>
              <Input value={createForm.ppd_title} onChange={e => setCreateForm(f => ({...f, ppd_title: e.target.value}))} placeholder="e.g. Initial Formulation Brief, Reformulation v2, Cost Optimisation..." />
              <p className="text-xs text-muted-foreground">Give this PPD a short title to distinguish it from other PPDs on the same project.</p>
            </div>
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
  const [comments, setComments]         = useState([])
  const [newComment, setNewComment]     = useState('')
  const [actionTag, setActionTag]       = useState('comment')
  const [postingComment, setPostingComment] = useState(false)
  const [attachFile, setAttachFile]     = useState(null)   // File object
  const [uploading, setUploading]       = useState(false)
  const [attachResult, setAttachResult] = useState(null)   // {url, filename} after upload
  const [reviewers, setReviewers]       = useState(initialPpd.reviewers || [])

  // Rework popup state
  const [reworkOpen, setReworkOpen]     = useState(false)
  const [reworkComment, setReworkComment] = useState('')
  const [reworking, setReworking]       = useState(false)
  // Rework-done popup state
  const [reworkDoneOpen, setReworkDoneOpen]   = useState(false)
  const [reworkDoneComment, setReworkDoneComment] = useState('')
  const [reworkDoneSaving, setReworkDoneSaving] = useState(false)
  // Submit for approval popup state
  const [submitApprovalOpen, setSubmitApprovalOpen] = useState(false)
  const [submittingApproval, setSubmittingApproval] = useState(false)
  // Final approve loading state (management)
  const [finalApproving, setFinalApproving] = useState(false)
  // Mgmt review loading state
  const [mgmtApproving, setMgmtApproving] = useState(false)

  const isAdmin    = user?.role === 'admin'
  const isSource   = user?.role === 'source'
  const isPM       = user?.role === 'pm'
  const myRole     = user?.role || 'fd'

  // Stage role sets
  const INITIAL_REVIEWER_ROLES_FE = new Set(['fd','pm'])
  const MGMT_REVIEWER_ROLES_FE    = new Set(['rd_head','marketing_head','sales_head','gdso_head','regulatory','cfo'])
  const FINAL_APPROVER_ROLES_FE   = new Set(['ceo'])

  // Role flags
  const isInitialReviewer = isAdmin || INITIAL_REVIEWER_ROLES_FE.has(myRole)
  const isMgmtReviewer    = isAdmin || MGMT_REVIEWER_ROLES_FE.has(myRole)
  const isFinalApprover   = isAdmin || FINAL_APPROVER_ROLES_FE.has(myRole)

  // Task owner roles — do the work, confirm rework
  const TASK_OWNER_ROLES_FE = new Set(['source','packaging','adl','pmsa','production'])
  const isTaskOwner = TASK_OWNER_ROLES_FE.has(myRole)

  // Can edit PPD content in Pending/Rework/ReviewerApproved
  const canEditPPD = isAdmin || (isSource && ['Pending','Rework','ReviewerApproved'].includes(ppd.status)) || isPM

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
    setEditForm(f => ({ ...f, status: updated.status }))
    return updated
  }

  const handleReworkRequest = async () => {
    if (!reworkComment.trim()) return toast.error('Please explain what needs to be fixed')
    setReworking(true)
    try {
      await apiCall(`/api/ppd/${ppd.ppd_id}/rework`, {
        method: 'POST', token,
        body: { comment: reworkComment.trim() }
      })
      setReworkOpen(false)
      setReworkComment('')
      await refreshPpd()
      fetchComments()
      toast.warning('Rework requested — involved team notified')
    } catch (err) { toast.error(err.message) }
    finally { setReworking(false) }
  }

  const handleReworkDone = async () => {
    if (!reworkDoneComment.trim()) return toast.error('Please describe the changes made')
    setReworkDoneSaving(true)
    try {
      await apiCall(`/api/ppd/${ppd.ppd_id}/rework-done`, {
        method: 'POST', token,
        body: { reply_comment: reworkDoneComment }
      })
      setReworkDoneOpen(false)
      setReworkDoneComment('')
      await refreshPpd()
      fetchComments()
      toast.success('Submitted for review — reviewer notified')
    } catch (err) { toast.error(err.message) }
    finally { setReworkDoneSaving(false) }
  }

  const handleSubmitForApproval = async () => {
    setSubmittingApproval(true)
    try {
      await apiCall(`/api/ppd/${ppd.ppd_id}/submit-for-approval`, { method: 'POST', token })
      setSubmitApprovalOpen(false)
      await refreshPpd()
      toast.success('PPD submitted to Management Committee for approval')
    } catch (err) { toast.error(err.message) }
    finally { setSubmittingApproval(false) }
  }

  const handleMgmtApprove = async () => {
    setMgmtApproving(true)
    try {
      await apiCall(`/api/ppd/${ppd.ppd_id}/mgmt-review`, {
        method: 'PATCH', token,
        body: { status: 'Approved', comment: '' }
      })
      await refreshPpd()
      toast.success('Management review approved!')
    } catch (err) { toast.error(err.message) }
    finally { setMgmtApproving(false) }
  }

  const handleFinalApprove = async () => {
    setFinalApproving(true)
    try {
      await apiCall(`/api/ppd/${ppd.ppd_id}/final-review`, {
        method: 'PATCH', token,
        body: { status: 'Approved', comment: '' }
      })
      await refreshPpd()
      toast.success('Final approval submitted!')
    } catch (err) { toast.error(err.message) }
    finally { setFinalApproving(false) }
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

  const handleUpload = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`/api/ppd/${ppd.ppd_id}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Upload failed') }
      const data = await res.json()
      setAttachResult({ url: data.url, filename: data.filename })
      toast.success(`Uploaded: ${data.filename}`)
    } catch (err) { toast.error(err.message) }
    finally { setUploading(false) }
  }

  const handlePostComment = async () => {
    if (!newComment.trim()) return toast.error('Comment text is required')
    setPostingComment(true)
    try {
      if (actionTag === 'rework') {
        // "Rework" tag → call the /rework endpoint which sets PPD status = Rework
        // Append any uploaded attachment link into the comment text
        let commentText = newComment.trim()
        if (attachResult) {
          commentText += `\n\nAttachment:\n📎 ${attachResult.filename}: ${window.location.origin}${attachResult.url}`
        }
        await apiCall(`/api/ppd/${ppd.ppd_id}/rework`, {
          method: 'POST', token,
          body: { comment: commentText }
        })
        toast.warning('Rework requested — status set to Rework, team notified')
      } else {
        await apiCall(`/api/ppd/${ppd.ppd_id}/comments`, {
          method: 'POST', token,
          body: {
            comment: newComment,
            action_tag: actionTag,
            attachment_url: attachResult?.url || null,
            attachment_name: attachResult?.filename || null,
          }
        })
        toast.success('Comment posted')
      }
      setNewComment(''); setActionTag('comment'); setAttachFile(null); setAttachResult(null)
      fetchComments()
      await refreshPpd()
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

  // Multi-stage workflow tracking
  const approvedCount    = reviewers.filter(r => r.status === 'Approved').length
  const reworkCount      = reviewers.filter(r => r.status === 'Rework').length
  const isPending        = ppd.status === 'Pending'
  const isApproved       = ppd.status === 'Approved'
  const isCompleted      = ppd.status === 'Completed'
  const isRework         = ppd.status === 'Rework'
  const isReviewerApproved = ppd.status === 'ReviewerApproved'
  const isMgmtReview     = ppd.status === 'MgmtReview'
  const isMgmtApproved   = ppd.status === 'MgmtApproved'
  const isFinalReview    = ppd.status === 'FinalReview'
  const isFullyDone      = isApproved || isCompleted

  const mgmtApprovals  = ppd.mgmt_approvals  || []
  const finalApprovals = ppd.final_approvals || []
  const mgmtApprovedCount  = mgmtApprovals.filter(r => r.status === 'Approved').length
  const finalApprovedCount = finalApprovals.filter(r => r.status === 'Approved').length

  // My reviewer entry depending on my stage
  const myMgmtEntry   = mgmtApprovals.find(r => r.role === myRole)
  const myFinalEntry  = finalApprovals.find(r => r.role === myRole)

  const wfSteps = isCompleted ? [
    { s: '1. PPD Created',                                                                                     d: `${ppd.created_by} (${ROLES[ppd.created_by_role]?.label || ppd.created_by_role}) created this PPD`, st: 'done' },
    { s: '2. Initial Review (R&D/F&D + PM)',                                                                   d: `✓ All initial reviewers approved`,                                                                   st: 'done' },
    { s: '3. Source Team Submits for Approval',                                                                d: '✓ Source Team submitted PPD to Management Committee',                                               st: 'done' },
    { s: '4. Management Committee Review (R&D Head, Marketing Head, Sales Head, GDSO Head, Regulatory Head, CFO)', d: `✓ All management reviewers approved`,                                                          st: 'done' },
    { s: '5. Final Approval (CEO)',                                                                             d: '✓ CEO approved',                                                                                     st: 'done' },
    { s: '6. Fully Approved & Completed',                                                                      d: '✓ PPD completed — project execution done',                                                           st: 'done' },
  ] : [
    {
      s: '1. PPD Created',
      d: `${ppd.created_by} (${ROLES[ppd.created_by_role]?.label || ppd.created_by_role}) created this PPD`,
      st: 'done',
    },
    {
      s: '2. Initial Review (R&D/F&D + PM)',
      d: isRework && ppd.rework_from_stage === 'initial'
        ? `⚠ Rework requested — task owner to fix and resubmit`
        : (isReviewerApproved || isMgmtReview || isMgmtApproved || isFinalReview || isApproved)
        ? `✓ All ${reviewers.length} initial reviewers approved`
        : `${approvedCount}/${reviewers.length} reviewers approved`,
      st: (isReviewerApproved || isMgmtReview || isMgmtApproved || isFinalReview || isApproved) ? 'done'
        : (isPending || (isRework && ppd.rework_from_stage === 'initial')) ? 'active' : 'pending',
    },
    {
      s: '3. Source Team Submits for Approval',
      d: (isMgmtReview || isMgmtApproved || isFinalReview || isApproved)
        ? '✓ Source Team submitted PPD to Management Committee'
        : isReviewerApproved
        ? '👆 Source Team must click "Submit for Approval" to escalate to Management'
        : 'After initial review, Source Team submits to Management',
      st: (isMgmtReview || isMgmtApproved || isFinalReview || isApproved) ? 'done' : isReviewerApproved ? 'active' : 'pending',
    },
    {
      s: '4. Management Committee Review (R&D Head, Marketing Head, Sales Head, GDSO Head, Regulatory Head, CFO)',
      d: isRework && ppd.rework_from_stage === 'mgmt'
        ? `⚠ Rework requested — task owner to fix and resubmit`
        : (isMgmtApproved || isFinalReview || isApproved)
        ? `✓ All ${mgmtApprovals.length} management reviewers approved`
        : isMgmtReview
        ? `${mgmtApprovedCount}/${mgmtApprovals.length} management approvals — reviewing`
        : 'Management Committee notified only after Source Team submits',
      st: (isMgmtApproved || isFinalReview || isApproved) ? 'done'
        : (isMgmtReview || (isRework && ppd.rework_from_stage === 'mgmt')) ? 'active' : 'pending',
    },
    {
      s: '5. Final Approval (CEO)',
      d: isRework && ppd.rework_from_stage === 'final'
        ? `⚠ Rework requested — task owner to fix and resubmit`
        : isApproved
        ? `✓ CEO approved`
        : (isFinalReview || isMgmtApproved)
        ? `CEO reviewing — awaiting final approval`
        : 'CEO is notified only after all 6 management committee members approve',
      st: isApproved ? 'done'
        : (isFinalReview || isMgmtApproved || (isRework && ppd.rework_from_stage === 'final')) ? 'active' : 'pending',
    },
    {
      s: '6. Fully Approved',
      d: isApproved ? '✓ PPD fully Approved — moving to execution phase' : 'Final approval by CEO',
      st: isApproved ? 'done' : 'pending',
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
              <h1 className="text-xl font-bold">{ppd.ppd_title || ppd.project_name}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${PPD_STATUS_COLORS[ppd.status] || 'bg-slate-100'}`}>{PPD_STATUS_LABELS[ppd.status] || ppd.status}</span>
              <Badge variant="secondary" className="font-mono text-xs">{ppd.ppd_version}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {ppd.ppd_id} • {ppd.project_name} • {ppd.brand} • Created by {ppd.created_by}
              {' '}• <span className="font-medium text-foreground">ID: {ppd.project_id}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          {/* Status banners */}
          {isApproved && (
            <Badge className="bg-emerald-600 text-white px-3 py-1 text-xs gap-1.5 shadow-sm">
              <CheckCircle2 className="h-4 w-4" /> Approved
            </Badge>
          )}
          {isReviewerApproved && (
            <Badge className="bg-blue-600 text-white px-3 py-1 text-xs gap-1.5 shadow-sm">
              <CheckCircle2 className="h-4 w-4" /> Reviewer Approved
            </Badge>
          )}
          {isMgmtReview && (
            <Badge className="bg-violet-600 text-white px-3 py-1 text-xs gap-1.5 shadow-sm">
              <Clock className="h-4 w-4" /> Management Review
            </Badge>
          )}
          {isMgmtApproved && (
            <Badge className="bg-indigo-600 text-white px-3 py-1 text-xs gap-1.5 shadow-sm">
              <CheckCircle2 className="h-4 w-4" /> Management Approved
            </Badge>
          )}
          {isFinalReview && (
            <Badge className="bg-orange-600 text-white px-3 py-1 text-xs gap-1.5 shadow-sm">
              <Clock className="h-4 w-4" /> Final Review (CEO)
            </Badge>
          )}

          {/* Stage 2: Source Team — Submit for Approval (only when ReviewerApproved) */}
          {(isAdmin || isSource) && isReviewerApproved && (
            <Button size="sm" className="gap-1 bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => setSubmitApprovalOpen(true)} disabled={submittingApproval}>
              {submittingApproval ? <RefreshCw className="h-4 w-4 animate-spin mr-1"/> : <Send className="h-4 w-4 mr-1"/>}
              Submit for Approval
            </Button>
          )}

          {/* Stage 1: fd/pm — Approve in Pending or Rework@initial */}
          {isInitialReviewer && !isMgmtReviewer && !isFinalApprover && (isPending || (isRework && ppd.rework_from_stage === 'initial')) && (
            <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={async () => {
              setSaving(true)
              try {
                await apiCall(`/api/ppd/${ppd.ppd_id}/reviewers`, {
                  method: 'PATCH', token,
                  body: { reviewers: reviewers.map(r => r.role === myRole ? { ...r, status: 'Approved' } : r) }
                })
                await refreshPpd()
                toast.success('Approved! Waiting for other reviewers.')
              } catch (err) { toast.error(err.message) }
              finally { setSaving(false) }
            }} disabled={saving}>
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-1"/> : <CheckCircle2 className="h-4 w-4 mr-1"/>}
              Approve
            </Button>
          )}
          {/* Stage 1: fd/pm — Request Rework */}
          {isInitialReviewer && !isMgmtReviewer && !isFinalApprover && (isPending || (isRework && ppd.rework_from_stage === 'initial')) && (
            <Button size="sm" variant="outline" className="gap-1 border-amber-400 text-amber-700 hover:bg-amber-50"
              onClick={() => setReworkOpen(true)} disabled={saving}>
              <AlertCircle className="h-4 w-4 mr-1"/>Request Rework
            </Button>
          )}

          {/* Stage 3: Management Committee — Approve */}
          {isMgmtReviewer && !isFinalApprover && (isMgmtReview || (isRework && ppd.rework_from_stage === 'mgmt')) && (
            <Button size="sm" className="gap-1 bg-emerald-700 hover:bg-emerald-800 text-white"
              onClick={handleMgmtApprove} disabled={mgmtApproving}>
              {mgmtApproving ? <RefreshCw className="h-4 w-4 animate-spin mr-1"/> : <CheckCircle2 className="h-4 w-4 mr-1"/>}
              Approve
            </Button>
          )}
          {/* Stage 3: Management Committee — Request Rework */}
          {isMgmtReviewer && !isFinalApprover && (isMgmtReview || (isRework && ppd.rework_from_stage === 'mgmt')) && (
            <Button size="sm" variant="outline" className="gap-1 border-amber-400 text-amber-700 hover:bg-amber-50"
              onClick={() => setReworkOpen(true)} disabled={mgmtApproving}>
              <AlertCircle className="h-4 w-4 mr-1"/>Request Rework
            </Button>
          )}

          {/* Stage 4: CFO/CEO — Final Approve */}
          {isFinalApprover && (isFinalReview || isMgmtApproved) && (
            <Button size="sm" className="gap-1 bg-emerald-800 hover:bg-emerald-900 text-white"
              onClick={handleFinalApprove} disabled={finalApproving}>
              {finalApproving ? <RefreshCw className="h-4 w-4 animate-spin mr-1"/> : <CheckCircle2 className="h-4 w-4 mr-1"/>}
              Final Approve
            </Button>
          )}
          {/* Stage 4: CFO/CEO — Request Rework */}
          {isFinalApprover && (isFinalReview || isMgmtApproved) && (
            <Button size="sm" variant="outline" className="gap-1 border-amber-400 text-amber-700 hover:bg-amber-50"
              onClick={() => setReworkOpen(true)} disabled={finalApproving}>
              <AlertCircle className="h-4 w-4 mr-1"/>Request Rework
            </Button>
          )}


          {/* Task owner: Mark Rework Done — only when status is Rework */}
          {isTaskOwner && isRework && (
            <Button size="sm" className="gap-1 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setReworkDoneOpen(true)}>
              <Send className="h-4 w-4 mr-1"/>Submit Rework Done
            </Button>
          )}
          {/* Editable roles: Save */}
          {canEditPPD && (
            <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-1"/> : <Edit className="h-4 w-4 mr-1"/>}
              Save
            </Button>
          )}
          {/* Admin: delete */}
          {isAdmin && (
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
              {deleting ? <RefreshCw className="h-4 w-4 animate-spin mr-1"/> : <Trash2 className="h-4 w-4 mr-1"/>}
              Delete
            </Button>
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

      {/* ── Rework Request Dialog ── */}
      <Dialog open={reworkOpen} onOpenChange={v => { setReworkOpen(v); if (!v) setReworkComment('') }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <AlertCircle className="h-5 w-5" /> Request Rework
            </DialogTitle>
            <DialogDescription>
              Explain what needs to be fixed. This comment will be visible only to the relevant team members.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Textarea
              rows={4}
              value={reworkComment}
              onChange={e => setReworkComment(e.target.value)}
              placeholder="Describe what needs to be corrected or improved…"
              className="border-amber-300 focus:border-amber-500"
            />
            <p className="text-xs text-muted-foreground">
              🔔 Notification will go only to the task owners involved in this PPD (e.g. Source Team, R&amp;D/F&amp;D).
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReworkOpen(false); setReworkComment('') }}>Cancel</Button>
            <Button onClick={handleReworkRequest} disabled={reworking || !reworkComment.trim()}
              className="bg-amber-600 hover:bg-amber-700 text-white">
              {reworking ? <RefreshCw className="h-4 w-4 animate-spin mr-2"/> : <AlertCircle className="h-4 w-4 mr-2"/>}
              Send Rework Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Rework Done Dialog ── */}
      <Dialog open={reworkDoneOpen} onOpenChange={setReworkDoneOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-700">
              <CheckCircle2 className="h-5 w-5" /> Confirm Rework Completed
            </DialogTitle>
            <DialogDescription>
              Describe the changes you made. The reviewer will be notified to re-review and approve.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Textarea
              rows={4}
              value={reworkDoneComment}
              onChange={e => setReworkDoneComment(e.target.value)}
              placeholder="Describe what was changed / fixed…"
              className="border-blue-300 focus:border-blue-500"
            />
            <p className="text-xs text-muted-foreground">
              🔔 The reviewer will be notified to review your changes and approve.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReworkDoneOpen(false); setReworkDoneComment('') }}>Cancel</Button>
            <Button onClick={handleReworkDone} disabled={reworkDoneSaving || !reworkDoneComment.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white">
              {reworkDoneSaving ? <RefreshCw className="h-4 w-4 animate-spin mr-2"/> : <Send className="h-4 w-4 mr-2"/>}
              Submit for Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Submit for Approval Confirmation Dialog ── */}
      <Dialog open={submitApprovalOpen} onOpenChange={setSubmitApprovalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-700">
              <Send className="h-5 w-5" /> Submit for Management Approval
            </DialogTitle>
            <DialogDescription>
              This will notify the Management Committee and make the PPD visible to them for final review.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <p className="text-sm"><strong>PPD:</strong> {ppd.ppd_id} — {ppd.project_name}</p>
            <p className="text-sm text-emerald-700 font-medium">✓ Initial reviewers (R&amp;D/F&amp;D + PM) have all approved</p>
            <p className="text-xs text-muted-foreground bg-purple-50 border border-purple-200 rounded p-2 mt-2">
              🔔 The following 6 members will be assigned review tasks and notified:
              R&amp;D Head, Marketing Head, Sales Head, GDSO Head, Regulatory Head, CFO.
              After all 6 approve, the CEO will be assigned for final approval.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitApprovalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitForApproval} disabled={submittingApproval}
              className="bg-purple-600 hover:bg-purple-700 text-white">
              {submittingApproval ? <RefreshCw className="h-4 w-4 animate-spin mr-2"/> : <Send className="h-4 w-4 mr-2"/>}
              Submit to Management
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="details">
        <TabsList className={`grid w-full max-w-3xl ${isAdmin ? 'grid-cols-5' : 'grid-cols-4'}`}>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="reviewers">Reviewers
            {isRework && <span className="ml-1 text-[10px] bg-amber-500 text-white rounded px-1">Rework</span>}
          </TabsTrigger>
          <TabsTrigger value="comments">Comments ({comments.length})</TabsTrigger>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
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
                {myReviewerEntry && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Your review:</span>
                    <Badge variant={myReviewerEntry.status === 'Approved' ? 'default' : myReviewerEntry.status === 'Rework' ? 'destructive' : 'secondary'}>
                      {myReviewerEntry.status}
                    </Badge>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>PPD ID</Label>
                <p className="text-sm font-mono py-2 text-muted-foreground">{ppd.ppd_id}</p>
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
        <TabsContent value="reviewers" className="space-y-4">

          {/* Stage 1: Initial Reviewers (fd + pm) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono">Stage 1</span>
                Initial Review — R&amp;D/F&amp;D + PM
              </CardTitle>
              <CardDescription>
                {(isReviewerApproved || isMgmtReview || isMgmtApproved || isFinalReview || isApproved)
                  ? `✓ ${approvedCount}/${reviewers.length} approved — initial review complete`
                  : isRework && ppd.rework_from_stage === 'initial'
                  ? '⚠ Rework requested — task owner to fix and resubmit'
                  : `${approvedCount}/${reviewers.length} approved`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {reviewers.length === 0
                ? <p className="text-sm text-muted-foreground text-center py-4">No reviewers assigned yet.</p>
                : reviewers.map((r, i) => {
                    const isApprovedRow = r.status === 'Approved'
                    const isReworkRow   = r.status === 'Rework'
                    const isMyRow       = r.role === myRole && isInitialReviewer
                    return (
                      <div key={i} className={`flex items-center justify-between p-3 border rounded-lg gap-4
                        ${isApprovedRow ? 'border-emerald-200 bg-emerald-50'
                          : isReworkRow ? 'border-amber-200 bg-amber-50'
                          : isMyRow ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-300'
                          : 'border-slate-200 bg-white'}`}>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{r.team_label}</span>
                            {isMyRow && !isApprovedRow && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600 text-white font-medium">Your Review</span>}
                          </div>
                          {r.comment && <div className="text-xs text-muted-foreground mt-1 italic">"{r.comment}"</div>}
                          {r.updated_at && <div className="text-xs text-muted-foreground">{relTime(r.updated_at)}</div>}
                        </div>
                        <Badge variant={isApprovedRow ? 'default' : isReworkRow ? 'destructive' : 'outline'} className={isApprovedRow ? 'bg-emerald-600' : ''}>{r.status}</Badge>
                      </div>
                    )
                  })
              }
              {isReviewerApproved && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  All initial reviewers approved. &nbsp;
                  {(isAdmin || isSource) ? <strong>Click "Submit for Approval" to send to Management.</strong> : <span>Waiting for Source Team to submit.</span>}
                </div>
              )}
              {isRework && ppd.rework_from_stage === 'initial' && (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Rework requested. See Comments tab for instructions.
                  {isTaskOwner && <strong className="ml-1">Use "Submit Rework Done" above when ready.</strong>}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stage 3: Management Committee (shown once submitted) */}
          {(isMgmtReview || isMgmtApproved || isFinalReview || isApproved || (isRework && ppd.rework_from_stage === 'mgmt')) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded bg-violet-200 text-violet-800 font-mono">Stage 3</span>
                  Management Committee Review
                </CardTitle>
                <CardDescription>
                  {(isMgmtApproved || isFinalReview || isApproved)
                    ? `✓ ${mgmtApprovedCount}/${mgmtApprovals.length} approved — management review complete`
                    : isRework && ppd.rework_from_stage === 'mgmt'
                    ? '⚠ Rework requested — task owner to fix and resubmit'
                    : `${mgmtApprovedCount}/${mgmtApprovals.length} approved — all four must approve`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {mgmtApprovals.length === 0
                  ? <p className="text-sm text-muted-foreground text-center py-4">Management review not started yet.</p>
                  : mgmtApprovals.map((r, i) => {
                      const isApprovedRow = r.status === 'Approved'
                      const isReworkRow   = r.status === 'Rework'
                      const isMyRow       = r.role === myRole && isMgmtReviewer && !isAdmin
                      return (
                        <div key={i} className={`flex items-center justify-between p-3 border rounded-lg gap-4
                          ${isApprovedRow ? 'border-emerald-200 bg-emerald-50'
                            : isReworkRow ? 'border-amber-200 bg-amber-50'
                            : isMyRow ? 'border-violet-300 bg-violet-50 ring-1 ring-violet-300'
                            : 'border-slate-200 bg-white'}`}>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{r.team_label}</span>
                              {isMyRow && !isApprovedRow && <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-600 text-white font-medium">Your Review</span>}
                            </div>
                            {r.comment && <div className="text-xs text-muted-foreground mt-1 italic">"{r.comment}"</div>}
                            {r.updated_at && <div className="text-xs text-muted-foreground">{relTime(r.updated_at)}</div>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant={isApprovedRow ? 'default' : isReworkRow ? 'destructive' : 'outline'} className={isApprovedRow ? 'bg-emerald-600' : ''}>{r.status}</Badge>
                            {/* Admin can approve each pending mgmt slot individually */}
                            {isAdmin && !isApprovedRow && isMgmtReview && (
                              <Button size="sm" variant="outline"
                                className="h-6 text-[10px] px-2 border-emerald-400 text-emerald-700 hover:bg-emerald-50"
                                disabled={mgmtApproving}
                                onClick={async () => {
                                  setMgmtApproving(true)
                                  try {
                                    await apiCall(`/api/ppd/${ppd.ppd_id}/mgmt-review`, {
                                      method: 'PATCH', token,
                                      body: { status: 'Approved', comment: 'Admin override', role: r.role }
                                    })
                                    await refreshPpd()
                                    toast.success(`Approved as ${r.team_label}`)
                                  } catch (err) { toast.error(err.message) }
                                  finally { setMgmtApproving(false) }
                                }}>
                                {mgmtApproving ? <RefreshCw className="h-2.5 w-2.5 animate-spin"/> : <CheckCircle2 className="h-2.5 w-2.5"/>}
                                Approve
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })
                }
                {isRework && ppd.rework_from_stage === 'mgmt' && (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    Rework requested by Management Committee. See Comments tab.
                    {isTaskOwner && <strong className="ml-1">Use "Submit Rework Done" above when ready.</strong>}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Stage 4: Final Approvers — CFO + CEO (shown once mgmt approved) */}
          {(isMgmtApproved || isFinalReview || isApproved || (isRework && ppd.rework_from_stage === 'final')) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded bg-orange-200 text-orange-800 font-mono">Stage 4</span>
                  Final Approval — CEO
                </CardTitle>
                <CardDescription>
                  {isApproved
                    ? `✓ CEO approved — PPD fully approved`
                    : isRework && ppd.rework_from_stage === 'final'
                    ? '⚠ Rework requested — task owner to fix and resubmit'
                    : `CEO review pending`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {finalApprovals.length === 0
                  ? <p className="text-sm text-muted-foreground text-center py-4">Final review not started yet.</p>
                  : finalApprovals.map((r, i) => {
                      const isApprovedRow = r.status === 'Approved'
                      const isReworkRow   = r.status === 'Rework'
                      const isMyRow       = r.role === myRole && isFinalApprover
                      return (
                        <div key={i} className={`flex items-center justify-between p-3 border rounded-lg gap-4
                          ${isApprovedRow ? 'border-emerald-200 bg-emerald-50'
                            : isReworkRow ? 'border-amber-200 bg-amber-50'
                            : isMyRow ? 'border-orange-300 bg-orange-50 ring-1 ring-orange-300'
                            : 'border-slate-200 bg-white'}`}>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{r.team_label}</span>
                              {isMyRow && !isApprovedRow && <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-600 text-white font-medium">Your Review</span>}
                            </div>
                            {r.comment && <div className="text-xs text-muted-foreground mt-1 italic">"{r.comment}"</div>}
                            {r.updated_at && <div className="text-xs text-muted-foreground">{relTime(r.updated_at)}</div>}
                          </div>
                          <Badge variant={isApprovedRow ? 'default' : isReworkRow ? 'destructive' : 'outline'} className={isApprovedRow ? 'bg-emerald-600' : ''}>{r.status}</Badge>
                        </div>
                      )
                    })
                }
                {isApproved && (
                  <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    PPD fully <strong>Approved</strong> by CEO.
                  </div>
                )}
                {isRework && ppd.rework_from_stage === 'final' && (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    Rework requested by CFO/CEO. See Comments tab.
                    {isTaskOwner && <strong className="ml-1">Use "Submit Rework Done" above when ready.</strong>}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        </TabsContent>

        {/* ── COMMENTS TAB ── */}
        <TabsContent value="comments">
          <Card>
            <CardHeader>
              <CardTitle>Comments &amp; Rework History</CardTitle>
              <CardDescription>
                Comments visible to you. Rework comments are restricted to involved parties only.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No comments yet.</p>
              ) : (
                comments.map((c, i) => {
                  const tagColors = {
                    rework:      'bg-amber-100 text-amber-800 border-amber-200',
                    rework_done: 'bg-blue-100 text-blue-800 border-blue-200',
                    approve:     'bg-emerald-100 text-emerald-800 border-emerald-200',
                    comment:     'bg-slate-100 text-slate-700 border-slate-200',
                  }
                  const tagBorderColor = c.action_tag === 'rework' ? 'border-l-amber-400'
                    : c.action_tag === 'rework_done' ? 'border-l-blue-400'
                    : c.action_tag === 'approve' ? 'border-l-emerald-400'
                    : 'border-l-transparent'
                  return (
                    <div key={i} className={`flex gap-3 p-3 border rounded-lg border-l-4 ${tagBorderColor}`}>
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
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${tagColors[c.action_tag] || tagColors.comment}`}>
                                {c.action_tag === 'rework' ? '🔁 Rework Required'
                                  : c.action_tag === 'rework_done' ? '✅ Rework Done'
                                  : c.action_tag === 'approve' ? '✅ Approved'
                                  : c.action_tag}
                              </span>
                            )}
                            {c.visible_to_roles && (
                              <span className="text-[10px] px-1 py-0.5 rounded bg-slate-200 text-slate-600 border">🔒 restricted</span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">{relTime(c.created_at)}</span>
                        </div>
                        <p className="text-sm mt-1 whitespace-pre-line">
                          {c.comment.split(/(\bhttps?:\/\/\S+)/g).map((part, i) =>
                            /^https?:\/\//.test(part)
                              ? <a key={i} href={part} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">{part}</a>
                              : part
                          )}
                        </p>
                        {c.attachment_url && (
                          <a
                            href={`${API_BASE}${c.attachment_url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 mt-1.5 text-xs text-blue-600 hover:underline border border-blue-200 bg-blue-50 rounded px-2 py-0.5"
                          >
                            <Paperclip className="h-3 w-3" />
                            {c.attachment_name || 'Attachment'}
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })
              )}

              {/* New comment box */}
              <div className="border rounded-lg p-3 space-y-3">
                <Textarea
                  placeholder="Add a comment or feedback…"
                  rows={3}
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                />

                {/* File attachment */}
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground hover:text-foreground border rounded px-2 py-1.5 hover:bg-muted transition-colors">
                    <Paperclip className="h-3.5 w-3.5" />
                    {uploading ? 'Uploading...' : 'Attach file'}
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip"
                      disabled={uploading}
                      onChange={e => {
                        const f = e.target.files?.[0]
                        if (f) { setAttachFile(f); setAttachResult(null); handleUpload(f) }
                      }}
                    />
                  </label>
                  {attachResult && (
                    <div className="flex items-center gap-1 text-xs bg-green-50 border border-green-200 text-green-700 rounded px-2 py-1">
                      <Paperclip className="h-3 w-3" />
                      <span className="max-w-[160px] truncate">{attachResult.filename}</span>
                      <button onClick={() => { setAttachFile(null); setAttachResult(null) }} className="ml-1 text-green-500 hover:text-red-500">✕</button>
                    </div>
                  )}
                  {uploading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                  <span className="text-xs text-muted-foreground ml-auto">PDF, Word, Excel, images, ZIP — max 10 MB</span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <Select value={actionTag} onValueChange={setActionTag}>
                      <SelectTrigger className={`w-40 h-8 text-xs ${actionTag === 'rework' ? 'border-amber-400 text-amber-700' : ''}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="comment">💬 Comment</SelectItem>
                        <SelectItem value="rework">🔁 Rework</SelectItem>
                      </SelectContent>
                    </Select>
                  <Button size="sm" onClick={handlePostComment} disabled={postingComment || uploading || !newComment.trim()}>
                    {postingComment ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <MessageSquare className="h-4 w-4 mr-2"/>}
                    Post Comment
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
                              <Badge variant={rev.status==='Approved'?'default':rev.status==='Rework'?'destructive':'secondary'} className="text-xs">
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
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'PPD Title', value: ppd.ppd_title || '—' },
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
  const [ppds, setPpds]                   = useState([])
  const [loading, setLoading]             = useState(true)
  const [ppdFilter, setPpdFilter]         = useState('all')
  const [statusFilter, setStatusFilter]   = useState('all')
  const [q, setQ]                         = useState('')

  // Create dialog
  const [createOpen, setCreateOpen]   = useState(false)
  const [creating, setCreating]       = useState(false)
  const [createForm, setCreateForm]   = useState({
    ppd_id:'', trial_no:'', batch_no:'', batch_size:'', unit_qty:'',
    mfg_date:'', trial_taken_by:'', evaluated_by:'',
    method_of_preparation:'', observation:'', conclusion:'',
  })
  const [ingredients, setIngredients] = useState([{ sr_no:'1', name:'', ins_cas_inci:'', vendor:'', use_function:'', cost_per_kg:'', qty_pct:'', qty_per_unit:'', cost_per_unit:'' }])

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
      if (ppdFilter !== 'all') params.set('ppd_id', ppdFilter)
      if (statusFilter  !== 'all') params.set('status', statusFilter)
      if (q) params.set('q', q)
      const data = await apiCall(`/api/formulation?${params}`, { token })
      setFormulas(data)
    } catch (err) { toast.error('Failed to load formulas: ' + err.message) }
    finally { setLoading(false) }
  }, [ppdFilter, statusFilter, q, token])

  const fetchPpdList = useCallback(async () => {
    try {
      const data = await apiCall('/api/ppd', { token })
      setPpds(Array.isArray(data) ? data : [])
    } catch {}
  }, [token])

  useEffect(() => { fetchFormulas(); fetchPpdList() }, [fetchFormulas, fetchPpdList])

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
      status: f.status,
      trial_no: f.trial_no||'', batch_no: f.batch_no||'',
      batch_size: f.batch_size||'', unit_qty: f.unit_qty||'',
      mfg_date: f.mfg_date||'', trial_taken_by: f.trial_taken_by||'',
      evaluated_by: f.evaluated_by||'',
      method_of_preparation: f.method_of_preparation||'',
      observation: f.observation||'', conclusion: f.conclusion||'',
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
    if (!createForm.ppd_id) return toast.error('Select a PPD')
    setCreating(true)
    try {
      await apiCall('/api/formulation', {
        method:'POST', token,
        body: { ...createForm, ingredients: ingredients.filter(i => i.name.trim()) }
      })
      toast.success('Formula created')
      setCreateOpen(false)
      setCreateForm({ ppd_id:'', trial_no:'', batch_no:'', batch_size:'', unit_qty:'',
        mfg_date:'', trial_taken_by:'', evaluated_by:'', method_of_preparation:'', observation:'', conclusion:'' })
      setIngredients([{ sr_no:'1', name:'', ins_cas_inci:'', vendor:'', use_function:'', cost_per_kg:'', qty_pct:'', qty_per_unit:'', cost_per_unit:'' }])
      fetchFormulas()
    } catch (err) { toast.error(err.message) }
    finally { setCreating(false) }
  }

  // ── send for approval (fd → rd_head) ──
  const [sendingApproval, setSendingApproval] = useState(false)
  const handleSendApproval = async () => {
    setSendingApproval(true)
    try {
      const result = await apiCall(`/api/formulation/${selected.formula_id}/send-for-approval`, {
        method: 'POST', token
      })
      toast.success('Sent to R&D Head for approval — they have been notified')
      // Update selected so the button state reflects the new status immediately
      setSelected(s => ({
        ...s,
        status: result.status || s.status,
        approval_status: result.approval_status || 'pending_approval',
      }))
      fetchFormulas()
    } catch (err) { toast.error(err.message) }
    finally { setSendingApproval(false) }
  }

  // ── rd_head review (approve / reject) ──
  const [reviewComment, setReviewComment] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const handleReview = async (decision) => {
    setReviewing(true)
    try {
      const result = await apiCall(`/api/formulation/${selected.formula_id}/review`, {
        method: 'POST', token,
        body: { decision, comment: reviewComment.trim() || undefined }
      })
      toast.success(decision === 'approved' ? 'Formula approved — marked as Recommended' : 'Formula rejected — returned to Draft')
      setSelected(s => ({
        ...s,
        status: result.status,
        approval_status: result.approval_status,
        approved_by: result.approved_by,
        approval_comment: reviewComment.trim(),
      }))
      setEditForm(f => ({ ...f, status: result.status }))
      setReviewComment('')
      fetchFormulas()
    } catch (err) { toast.error(err.message) }
    finally { setReviewing(false) }
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
    { key:'trial_no',              label:'Trial No.' },
    { key:'batch_no',              label:'Batch No.' },
    { key:'batch_size',            label:'Batch Size (gm)' },
    { key:'unit_qty',              label:'Unit Qty. (gm)' },
    { key:'mfg_date',              label:'Mfg Date' },
    { key:'trial_taken_by',        label:'Trial Taken By' },
    { key:'evaluated_by',          label:'Evaluated By' },
    { key:'method_of_preparation', label:'Method of Preparation' },
    { key:'observation',           label:'Observation' },
    { key:'conclusion',            label:'Conclusion' },
    { key:'status',                label:'Status' },
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
  const addIngredient  = () => setIngredients(prev => [...prev, { sr_no: String(prev.length+1), name:'', ins_cas_inci:'', vendor:'', use_function:'', cost_per_kg:'', qty_pct:'', qty_per_unit:'', cost_per_unit:'' }])
  const removeIngredient = (i) => setIngredients(prev => prev.filter((_,idx) => idx !== i))
  const updateIngredient = (i, field, val) => setIngredients(prev => prev.map((row,idx) => idx===i ? {...row,[field]:val} : row))

  return (
    <div className="space-y-4">

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
          {/* Download PPD dossier PDF — only when a PPD is selected */}
          {ppdFilter !== 'all' && (
            <Button variant="outline" className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
              onClick={() => window.open(`${API_BASE}/api/formulation/report/${ppdFilter}?token=${encodeURIComponent(token)}`, '_blank')}>
              <FileText className="h-4 w-4"/>Download PPD Report
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
            <Select value={ppdFilter} onValueChange={setPpdFilter}>
              <SelectTrigger className="w-52"><SelectValue placeholder="All PPDs"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All PPDs</SelectItem>
                {ppds.map(p => <SelectItem key={p.ppd_id} value={p.ppd_id}>{p.project_name}</SelectItem>)}
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
                  <TableHead className="w-32">PPD ID</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Trial No.</TableHead>
                  <TableHead>Approval</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formulas.map(f => (
                  <TableRow key={f.formula_id} className="cursor-pointer hover:bg-muted/50"
                    onClick={e => { if (e.target.closest('button,input,select,label,[role=checkbox]')) return; openDetail(f) }}>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={compareIds.includes(f.formula_id)}
                        onCheckedChange={checked => setCompareIds(prev =>
                          checked ? [...prev, f.formula_id] : prev.filter(id => id !== f.formula_id)
                        )}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{f.ppd_id||'—'}</TableCell>
                    <TableCell className="text-sm font-medium truncate max-w-[200px]">{f.project_name||'—'}</TableCell>
                    <TableCell className="text-xs font-medium">{f.trial_no||'—'}</TableCell>
                    <TableCell>
                      {f.approval_status === 'pending_approval' && (
                        <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-amber-100 text-amber-700">Pending Review</span>
                      )}
                      {f.approval_status === 'approved' && (
                        <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-green-100 text-green-700">Approved</span>
                      )}
                      {f.approval_status === 'rejected' && (
                        <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-red-100 text-red-700">Rejected</span>
                      )}
                      {!f.approval_status && <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
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
                  <Label>PPD <span className="text-red-500">*</span></Label>
                  <Select value={createForm.ppd_id} onValueChange={v => setCreateForm(f=>({...f,ppd_id:v}))}>
                    <SelectTrigger><SelectValue placeholder="Select PPD"/></SelectTrigger>
                    <SelectContent>{ppds.map(p=><SelectItem key={p.ppd_id} value={p.ppd_id}>{p.ppd_id} — {p.project_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Trial No.</Label>
                  <Input value={createForm.trial_no} onChange={e=>setCreateForm(f=>({...f,trial_no:e.target.value}))} placeholder="e.g. T-001"/>
                </div>
                <div className="space-y-1.5">
                  <Label>Batch No.</Label>
                  <Input value={createForm.batch_no} onChange={e=>setCreateForm(f=>({...f,batch_no:e.target.value}))} placeholder="e.g. B-2026-01"/>
                </div>
                <div className="space-y-1.5">
                  <Label>Batch Size (gm)</Label>
                  <Input value={createForm.batch_size} onChange={e=>setCreateForm(f=>({...f,batch_size:e.target.value}))} placeholder="e.g. 5000"/>
                </div>
                <div className="space-y-1.5">
                  <Label>Unit Qty. (gm)</Label>
                  <Input value={createForm.unit_qty} onChange={e=>setCreateForm(f=>({...f,unit_qty:e.target.value}))} placeholder="e.g. 500"/>
                </div>
                <div className="space-y-1.5">
                  <Label>Mfg Date</Label>
                  <Input type="date" value={createForm.mfg_date} onChange={e=>setCreateForm(f=>({...f,mfg_date:e.target.value}))}/>
                </div>
                <div className="space-y-1.5">
                  <Label>Trial Taken By</Label>
                  <Input value={createForm.trial_taken_by} onChange={e=>setCreateForm(f=>({...f,trial_taken_by:e.target.value}))} placeholder="Name(s)"/>
                </div>
                <div className="space-y-1.5">
                  <Label>Evaluated By</Label>
                  <Input value={createForm.evaluated_by} onChange={e=>setCreateForm(f=>({...f,evaluated_by:e.target.value}))} placeholder="Name(s)"/>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Method of Preparation</Label>
                  <Textarea rows={2} value={createForm.method_of_preparation} onChange={e=>setCreateForm(f=>({...f,method_of_preparation:e.target.value}))} placeholder="Describe preparation method..."/>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Observation / Reason of Modification</Label>
                  <Textarea rows={2} value={createForm.observation} onChange={e=>setCreateForm(f=>({...f,observation:e.target.value}))} placeholder="Observations, reasons for modification..."/>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Conclusion</Label>
                  <Textarea rows={2} value={createForm.conclusion} onChange={e=>setCreateForm(f=>({...f,conclusion:e.target.value}))} placeholder="Trial conclusion..."/>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="ingredients" className="pt-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Product Parameters (Ingredients)</Label>
                  <Button size="sm" variant="outline" onClick={addIngredient}><Plus className="h-3 w-3 mr-1"/>Add Row</Button>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">Sr. No.</TableHead>
                        <TableHead>Name of Ingredients</TableHead>
                        <TableHead>INS / CAS / INCI No.</TableHead>
                        <TableHead>Vendor / Supplier Name</TableHead>
                        <TableHead>Use / Function</TableHead>
                        <TableHead>Cost Per Kg</TableHead>
                        <TableHead>Qty (%)</TableHead>
                        <TableHead>Qty per Unit / BOM</TableHead>
                        <TableHead>Cost per Unit (₹)</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ingredients.map((ing, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-center text-sm font-medium text-muted-foreground">{i+1}</TableCell>
                          <TableCell><Input value={ing.name} onChange={e=>updateIngredient(i,'name',e.target.value)} placeholder="Ingredient name" className="min-w-[130px]"/></TableCell>
                          <TableCell><Input value={ing.ins_cas_inci} onChange={e=>updateIngredient(i,'ins_cas_inci',e.target.value)} placeholder="e.g. INS 471" className="min-w-[110px]"/></TableCell>
                          <TableCell><Input value={ing.vendor} onChange={e=>updateIngredient(i,'vendor',e.target.value)} placeholder="Vendor name" className="min-w-[120px]"/></TableCell>
                          <TableCell><Input value={ing.use_function} onChange={e=>updateIngredient(i,'use_function',e.target.value)} placeholder="e.g. Emulsifier" className="min-w-[110px]"/></TableCell>
                          <TableCell><Input value={ing.cost_per_kg} onChange={e=>updateIngredient(i,'cost_per_kg',e.target.value)} placeholder="₹" className="w-20"/></TableCell>
                          <TableCell><Input value={ing.qty_pct} onChange={e=>updateIngredient(i,'qty_pct',e.target.value)} placeholder="%" className="w-16"/></TableCell>
                          <TableCell><Input value={ing.qty_per_unit} onChange={e=>updateIngredient(i,'qty_per_unit',e.target.value)} placeholder="gm" className="w-20"/></TableCell>
                          <TableCell><Input value={ing.cost_per_unit} onChange={e=>updateIngredient(i,'cost_per_unit',e.target.value)} placeholder="₹" className="w-20"/></TableCell>
                          <TableCell><Button size="sm" variant="ghost" onClick={()=>removeIngredient(i)}><Trash2 className="h-3 w-3 text-red-500"/></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
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
                    onClick={() => window.open(`${API_BASE}/api/formulation/report/${selected.ppd_id || selected.project_id}?token=${encodeURIComponent(token)}`, '_blank')}>
                    <FileText className="h-3.5 w-3.5"/>PPD Report
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
                    <Label>Trial No.</Label>
                    {canEdit ? <Input value={editForm.trial_no||''} onChange={e=>setEditForm(f=>({...f,trial_no:e.target.value}))} placeholder="e.g. T-001"/>
                      : <p className="text-sm py-2">{editForm.trial_no||'—'}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Batch No.</Label>
                    {canEdit ? <Input value={editForm.batch_no||''} onChange={e=>setEditForm(f=>({...f,batch_no:e.target.value}))} placeholder="e.g. B-2026-01"/>
                      : <p className="text-sm py-2">{editForm.batch_no||'—'}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Batch Size (gm)</Label>
                    {canEdit ? <Input value={editForm.batch_size||''} onChange={e=>setEditForm(f=>({...f,batch_size:e.target.value}))} placeholder="e.g. 5000"/>
                      : <p className="text-sm py-2">{editForm.batch_size||'—'}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Unit Qty. (gm)</Label>
                    {canEdit ? <Input value={editForm.unit_qty||''} onChange={e=>setEditForm(f=>({...f,unit_qty:e.target.value}))} placeholder="e.g. 500"/>
                      : <p className="text-sm py-2">{editForm.unit_qty||'—'}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Mfg Date</Label>
                    {canEdit ? <Input type="date" value={editForm.mfg_date||''} onChange={e=>setEditForm(f=>({...f,mfg_date:e.target.value}))}/>
                      : <p className="text-sm py-2">{editForm.mfg_date||'—'}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Trial Taken By</Label>
                    {canEdit ? <Input value={editForm.trial_taken_by||''} onChange={e=>setEditForm(f=>({...f,trial_taken_by:e.target.value}))} placeholder="Name(s)"/>
                      : <p className="text-sm py-2">{editForm.trial_taken_by||'—'}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Evaluated By</Label>
                    {canEdit ? <Input value={editForm.evaluated_by||''} onChange={e=>setEditForm(f=>({...f,evaluated_by:e.target.value}))} placeholder="Name(s)"/>
                      : <p className="text-sm py-2">{editForm.evaluated_by||'—'}</p>}
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>Method of Preparation</Label>
                    {canEdit ? <Textarea rows={2} value={editForm.method_of_preparation||''} onChange={e=>setEditForm(f=>({...f,method_of_preparation:e.target.value}))} placeholder="Describe preparation method..."/>
                      : <p className="text-sm py-2 whitespace-pre-line">{editForm.method_of_preparation||'—'}</p>}
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>Observation / Reason of Modification</Label>
                    {canEdit ? <Textarea rows={2} value={editForm.observation||''} onChange={e=>setEditForm(f=>({...f,observation:e.target.value}))} placeholder="Observations, reasons for modification..."/>
                      : <p className="text-sm py-2 whitespace-pre-line">{editForm.observation||'—'}</p>}
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>Conclusion</Label>
                    {canEdit ? <Textarea rows={2} value={editForm.conclusion||''} onChange={e=>setEditForm(f=>({...f,conclusion:e.target.value}))} placeholder="Trial conclusion..."/>
                      : <p className="text-sm py-2 whitespace-pre-line">{editForm.conclusion||'—'}</p>}
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
                      <Button size="sm" variant="outline" onClick={() => setEditForm(f=>({...f,ingredients:[...(f.ingredients||[]),{sr_no:String((f.ingredients||[]).length+1),name:'',ins_cas_inci:'',vendor:'',use_function:'',cost_per_kg:'',qty_pct:'',qty_per_unit:'',cost_per_unit:''}]}))}>
                        <Plus className="h-3 w-3 mr-1"/>Add Row
                      </Button>
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10">Sr.</TableHead>
                            <TableHead>Name of Ingredients</TableHead>
                            <TableHead>INS / CAS / INCI No.</TableHead>
                            <TableHead>Vendor / Supplier</TableHead>
                            <TableHead>Use / Function</TableHead>
                            <TableHead>Cost Per Kg</TableHead>
                            <TableHead>Qty (%)</TableHead>
                            <TableHead>Qty per Unit / BOM</TableHead>
                            <TableHead>Cost per Unit (₹)</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(editForm.ingredients||[]).length === 0
                            ? <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No ingredients added</TableCell></TableRow>
                            : (editForm.ingredients||[]).map((ing,i) => (
                              <TableRow key={i}>
                                <TableCell className="text-center text-sm text-muted-foreground">{i+1}</TableCell>
                                <TableCell><Input value={ing.name||''} onChange={e=>setEditForm(f=>({...f,ingredients:f.ingredients.map((r,idx)=>idx===i?{...r,name:e.target.value}:r)}))} placeholder="Ingredient name" className="min-w-[130px]"/></TableCell>
                                <TableCell><Input value={ing.ins_cas_inci||''} onChange={e=>setEditForm(f=>({...f,ingredients:f.ingredients.map((r,idx)=>idx===i?{...r,ins_cas_inci:e.target.value}:r)}))} placeholder="e.g. INS 471" className="min-w-[100px]"/></TableCell>
                                <TableCell><Input value={ing.vendor||''} onChange={e=>setEditForm(f=>({...f,ingredients:f.ingredients.map((r,idx)=>idx===i?{...r,vendor:e.target.value}:r)}))} placeholder="Vendor" className="min-w-[110px]"/></TableCell>
                                <TableCell><Input value={ing.use_function||''} onChange={e=>setEditForm(f=>({...f,ingredients:f.ingredients.map((r,idx)=>idx===i?{...r,use_function:e.target.value}:r)}))} placeholder="Function" className="min-w-[100px]"/></TableCell>
                                <TableCell><Input value={ing.cost_per_kg||''} onChange={e=>setEditForm(f=>({...f,ingredients:f.ingredients.map((r,idx)=>idx===i?{...r,cost_per_kg:e.target.value}:r)}))} className="w-20" placeholder="₹"/></TableCell>
                                <TableCell><Input value={ing.qty_pct||''} onChange={e=>setEditForm(f=>({...f,ingredients:f.ingredients.map((r,idx)=>idx===i?{...r,qty_pct:e.target.value}:r)}))} className="w-16" placeholder="%"/></TableCell>
                                <TableCell><Input value={ing.qty_per_unit||''} onChange={e=>setEditForm(f=>({...f,ingredients:f.ingredients.map((r,idx)=>idx===i?{...r,qty_per_unit:e.target.value}:r)}))} className="w-20" placeholder="gm"/></TableCell>
                                <TableCell><Input value={ing.cost_per_unit||''} onChange={e=>setEditForm(f=>({...f,ingredients:f.ingredients.map((r,idx)=>idx===i?{...r,cost_per_unit:e.target.value}:r)}))} className="w-20" placeholder="₹"/></TableCell>
                                <TableCell><Button size="sm" variant="ghost" onClick={()=>setEditForm(f=>({...f,ingredients:f.ingredients.filter((_,idx)=>idx!==i)}))}><Trash2 className="h-3 w-3 text-red-500"/></Button></TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead className="w-10">Sr.</TableHead>
                        <TableHead>Name of Ingredients</TableHead>
                        <TableHead>INS / CAS / INCI No.</TableHead>
                        <TableHead>Vendor / Supplier</TableHead>
                        <TableHead>Use / Function</TableHead>
                        <TableHead>Cost Per Kg</TableHead>
                        <TableHead>Qty (%)</TableHead>
                        <TableHead>Qty per Unit / BOM</TableHead>
                        <TableHead>Cost per Unit (₹)</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {(selected.ingredients||[]).length === 0
                          ? <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No ingredients listed</TableCell></TableRow>
                          : (selected.ingredients||[]).map((ing,i)=>(
                            <TableRow key={i}>
                              <TableCell className="text-center text-sm text-muted-foreground">{i+1}</TableCell>
                              <TableCell className="font-medium">{ing.name||'—'}</TableCell>
                              <TableCell>{ing.ins_cas_inci||'—'}</TableCell>
                              <TableCell>{ing.vendor||'—'}</TableCell>
                              <TableCell>{ing.use_function||'—'}</TableCell>
                              <TableCell>{ing.cost_per_kg||'—'}</TableCell>
                              <TableCell>{ing.qty_pct||'—'}</TableCell>
                              <TableCell>{ing.qty_per_unit||'—'}</TableCell>
                              <TableCell>{ing.cost_per_unit||'—'}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              {/* Status tab */}
              <TabsContent value="status" className="space-y-4 pt-2">
                {/* Formula status selector (canEdit) */}
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

                {/* Approval status banner */}
                {selected.approval_status && (
                  <div className={`rounded-lg border p-3 flex flex-col gap-1 ${
                    selected.approval_status === 'pending_approval' ? 'bg-amber-50 border-amber-200' :
                    selected.approval_status === 'approved'         ? 'bg-green-50 border-green-200' :
                                                                      'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold uppercase tracking-wide ${
                        selected.approval_status === 'pending_approval' ? 'text-amber-700' :
                        selected.approval_status === 'approved'         ? 'text-green-700' :
                                                                          'text-red-700'
                      }`}>
                        {selected.approval_status === 'pending_approval' && '⏳ Pending R&D Head Review'}
                        {selected.approval_status === 'approved'         && '✓ Approved by R&D Head'}
                        {selected.approval_status === 'rejected'         && '✗ Rejected by R&D Head'}
                      </span>
                    </div>
                    {selected.approved_by && (
                      <p className="text-xs text-muted-foreground">By: {selected.approved_by}{selected.approved_at ? ` · ${new Date(selected.approved_at).toLocaleString()}` : ''}</p>
                    )}
                    {selected.approval_comment && (
                      <p className="text-sm mt-1 italic">"{selected.approval_comment}"</p>
                    )}
                  </div>
                )}

                {/* rd_head / admin — approve or reject panel */}
                {(user?.role === 'rd_head' || user?.role === 'admin') && selected.approval_status === 'pending_approval' && (
                  <div className="rounded-lg border border-slate-200 p-4 space-y-3 bg-slate-50">
                    <p className="text-sm font-semibold text-slate-700">R&D Head Review</p>
                    <p className="text-xs text-muted-foreground">This formula has been submitted for your approval. Add an optional comment and approve or reject.</p>
                    <Textarea
                      rows={2}
                      value={reviewComment}
                      onChange={e => setReviewComment(e.target.value)}
                      placeholder="Optional: add a remark or reason for your decision..."
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-50 gap-1.5"
                        disabled={reviewing}
                        onClick={() => handleReview('rejected')}
                      >
                        {reviewing ? <RefreshCw className="h-4 w-4 animate-spin"/> : <XCircle className="h-4 w-4"/>}
                        Reject
                      </Button>
                      <Button
                        className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                        disabled={reviewing}
                        onClick={() => handleReview('approved')}
                      >
                        {reviewing ? <RefreshCw className="h-4 w-4 animate-spin"/> : <CheckCircle2 className="h-4 w-4"/>}
                        Approve
                      </Button>
                    </div>
                  </div>
                )}

                {/* Quick summary grid */}
                <div className="grid grid-cols-2 gap-4 pt-1">
                  {[
                    { label:'Trial No.',    value: selected.trial_no       },
                    { label:'Batch No.',    value: selected.batch_no       },
                    { label:'Batch Size',   value: selected.batch_size ? `${selected.batch_size} gm` : null },
                    { label:'Unit Qty.',    value: selected.unit_qty   ? `${selected.unit_qty} gm`   : null },
                    { label:'Mfg Date',     value: selected.mfg_date       },
                    { label:'Evaluated By', value: selected.evaluated_by   },
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
              {/* Send for Approval — fd only (rd_head reviews, not sends) */}
              {user?.role === 'fd'
                && !['Recommended', 'Rejected'].includes(selected?.status)
                && selected?.approval_status !== 'pending_approval' && (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                  onClick={handleSendApproval}
                  disabled={sendingApproval}
                >
                  {sendingApproval ? <RefreshCw className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}
                  Send for Approval
                </Button>
              )}
              {/* rd_head quick-action buttons also available in footer when pending */}
              {(user?.role === 'rd_head' || user?.role === 'admin') && selected?.approval_status === 'pending_approval' && (
                <>
                  <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-50 gap-1.5"
                    disabled={reviewing} onClick={() => { setActiveTab('status'); handleReview('rejected') }}>
                    {reviewing ? <RefreshCw className="h-4 w-4 animate-spin"/> : <XCircle className="h-4 w-4"/>}
                    Reject
                  </Button>
                  <Button className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                    disabled={reviewing} onClick={() => { setActiveTab('status'); handleReview('approved') }}>
                    {reviewing ? <RefreshCw className="h-4 w-4 animate-spin"/> : <CheckCircle2 className="h-4 w-4"/>}
                    Approve
                  </Button>
                </>
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
function LabBookView({ user, token }) {
  const [formulas, setFormulas] = useState([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://fmcg-software.onrender.com'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiCall('/api/formulation', { token })
      setFormulas(Array.isArray(data) ? data : [])
    } catch { toast.error('Failed to load formulas') }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  const openDetail = (f) => { setSelected(f); setDetailOpen(true) }

  const STATUS_COLOR = {
    'Draft':          'bg-slate-100 text-slate-700',
    'In Testing':     'bg-blue-100 text-blue-700',
    'Sensory Pass':   'bg-emerald-100 text-emerald-700',
    'Recommended':    'bg-green-100 text-green-800',
    'Rejected':       'bg-red-100 text-red-700',
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">E-Lab Notebook</h1>
          <p className="text-muted-foreground text-sm">
            {loading ? 'Loading…' : `${formulas.length} formula record${formulas.length !== 1 ? 's' : ''} — click any card to view details`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4 mr-1"/>Refresh
        </Button>
      </div>

      {/* ── Cards grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="h-36 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : formulas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <FileText className="h-12 w-12 mb-3 opacity-30" />
          <p className="font-medium">No formulas found</p>
          <p className="text-sm">Formulas created in Formulation Dev will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {formulas.map(f => (
            <div
              key={f.formula_id}
              onClick={() => openDetail(f)}
              className="group relative flex flex-col gap-3 p-4 bg-white border border-slate-200 rounded-xl cursor-pointer
                         hover:border-primary/50 hover:shadow-md transition-all duration-150"
            >
              {/* Top row: formula_id + status badge */}
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-semibold text-primary truncate">{f.formula_id}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${STATUS_COLOR[f.status] || 'bg-slate-100 text-slate-600'}`}>
                  {f.status}
                </span>
              </div>

              {/* Middle: PPD name */}
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Product</p>
                <p className="text-sm font-medium leading-snug line-clamp-2">{f.project_name}</p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">{f.ppd_id || '—'}</p>
              </div>

              {/* Bottom row: Version + Type */}
              <div className="flex items-center gap-2 mt-auto pt-2 border-t border-slate-100">
                <span className="text-[11px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded">{f.version}</span>
                <span className="text-[11px] text-muted-foreground">{f.formula_type}</span>
                {/* Detail icon — visible on hover */}
                <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-primary">
                  <Eye className="h-4 w-4" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Detail Dialog ── */}
      {selected && (
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <DialogTitle className="font-mono text-lg">{selected.formula_id}</DialogTitle>
                  <DialogDescription className="mt-1">{selected.project_name} • {selected.version}</DialogDescription>
                </div>
                <span className={`text-xs px-2 py-1 rounded-md font-medium whitespace-nowrap shrink-0 ${STATUS_COLOR[selected.status] || 'bg-slate-100 text-slate-600'}`}>
                  {selected.status}
                </span>
              </div>
            </DialogHeader>

            <div className="space-y-4 text-sm">
              {/* Core info grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'PPD ID',          value: selected.ppd_id },
                  { label: 'Trial No.',        value: selected.trial_no },
                  { label: 'Batch No.',        value: selected.batch_no },
                  { label: 'Batch Size (gm)',  value: selected.batch_size },
                  { label: 'Unit Qty (gm)',    value: selected.unit_qty },
                  { label: 'Mfg Date',         value: selected.mfg_date },
                  { label: 'Trial Taken By',   value: selected.trial_taken_by },
                  { label: 'Evaluated By',     value: selected.evaluated_by },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 rounded-lg p-3 border">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-medium mt-0.5">{value || '—'}</p>
                  </div>
                ))}
              </div>

              {/* Approval status */}
              {selected.approval_status && (
                <div className={`rounded-lg border p-3 ${
                  selected.approval_status === 'pending_approval' ? 'bg-amber-50 border-amber-200' :
                  selected.approval_status === 'approved'         ? 'bg-green-50 border-green-200' :
                                                                    'bg-red-50 border-red-200'
                }`}>
                  <p className={`text-xs font-semibold uppercase tracking-wide ${
                    selected.approval_status === 'pending_approval' ? 'text-amber-700' :
                    selected.approval_status === 'approved'         ? 'text-green-700' :
                                                                      'text-red-700'
                  }`}>
                    {selected.approval_status === 'pending_approval' && '⏳ Pending R&D Head Review'}
                    {selected.approval_status === 'approved'         && '✓ Approved by R&D Head'}
                    {selected.approval_status === 'rejected'         && '✗ Rejected by R&D Head'}
                  </p>
                  {selected.approved_by && (
                    <p className="text-xs text-muted-foreground mt-1">By: {selected.approved_by}</p>
                  )}
                  {selected.approval_comment && (
                    <p className="text-sm mt-1 italic">"{selected.approval_comment}"</p>
                  )}
                </div>
              )}

              {/* Long-text fields */}
              {[
                { label: 'Method of Preparation', value: selected.method_of_preparation },
                { label: 'Observation',            value: selected.observation },
                { label: 'Conclusion',             value: selected.conclusion },
              ].filter(f => f.value).map(({ label, value }) => (
                <div key={label} className="bg-slate-50 rounded-lg p-3 border">
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <p className="text-sm whitespace-pre-wrap">{value}</p>
                </div>
              ))}

              {/* Ingredients */}
              {(selected.ingredients || []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Ingredients ({selected.ingredients.length})</p>
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8">Sr.</TableHead>
                          <TableHead>Ingredient</TableHead>
                          <TableHead>Vendor</TableHead>
                          <TableHead>Function</TableHead>
                          <TableHead>Qty (%)</TableHead>
                          <TableHead>Cost/Unit (₹)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selected.ingredients.map((ing, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-center text-xs text-muted-foreground">{i + 1}</TableCell>
                            <TableCell className="font-medium text-sm">{ing.name || '—'}</TableCell>
                            <TableCell className="text-sm">{ing.vendor || '—'}</TableCell>
                            <TableCell className="text-sm">{ing.use_function || '—'}</TableCell>
                            <TableCell className="text-sm">{ing.qty_pct || '—'}</TableCell>
                            <TableCell className="text-sm">{ing.cost_per_unit || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Meta info */}
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground pt-1">
                <div><span className="font-medium">Created by:</span> {selected.created_by} ({selected.created_by_role})</div>
                <div><span className="font-medium">Created:</span> {selected.created_at ? new Date(selected.created_at).toLocaleString('en-IN') : '—'}</div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" className="gap-1.5 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                onClick={() => window.open(`${API_BASE}/api/formulation/report/${selected.ppd_id}?token=${encodeURIComponent(token)}`, '_blank')}>
                <FileText className="h-3.5 w-3.5"/>Download PPD Report
              </Button>
              <Button onClick={() => setDetailOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

/* -------------------- PLANT TRIALS -------------------- */
function PlantTrialsView({ user, token, can }) {
  const [trials, setTrials] = useState([])
  const [loading, setLoading] = useState(true)
  const [ppds, setPpds] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ ppd_id:'', plant_location:'', batch_size:'', stage:'Pilot', bom_code:'', mfc_code:'', product_code:'', sfg_code:'', notes:'', scheduled_date:'' })

  const canCreate = ['admin','production','rd_head','packaging'].includes(user?.role) || (can && can('Plant Trials','create'))
  const STAGES = ['Pilot','Commercial Run','Stability','Scale-up']
  const STATUSES = ['Scheduled','In Progress','Completed','Failed']

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [tData, pData] = await Promise.all([
        apiCall('/api/planttrials', { token }),
        apiCall('/api/ppd', { token }),
      ])
      setTrials(Array.isArray(tData) ? tData : [])
      setPpds(Array.isArray(pData) ? pData : [])
    } catch(e) { toast.error('Failed to load trials') }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.ppd_id) return toast.error('Select a PPD')
    setSaving(true)
    try {
      await apiCall('/api/planttrials', { method:'POST', body: form, token })
      toast.success('Trial scheduled')
      setShowAdd(false)
      setForm({ ppd_id:'', plant_location:'', batch_size:'', stage:'Pilot', bom_code:'', mfc_code:'', product_code:'', sfg_code:'', notes:'', scheduled_date:'' })
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

      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Plant Trials</h1><p className="text-muted-foreground text-sm">Production scale-up, stability, and commercial run reports</p></div>
        {canCreate && <Button onClick={()=>setShowAdd(true)}><Plus className="h-4 w-4 mr-2"/>Schedule Trial</Button>}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Schedule Plant Trial</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>PPD</Label>
              <Select value={form.ppd_id} onValueChange={v=>setForm(f=>({...f,ppd_id:v}))}>
                <SelectTrigger><SelectValue placeholder="Select PPD"/></SelectTrigger>
                <SelectContent>{ppds.map(p=><SelectItem key={p.ppd_id} value={p.ppd_id}>{p.ppd_id} — {p.project_name}</SelectItem>)}</SelectContent>
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
  const [ppds, setPpds] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ ppd_id:'', check_type:'Ingredient Compliance', ingredient_or_claim:'', assigned_to:'', assigned_role:'regulatory', due_date:'', notes:'' })

  const canCreate = ['admin','regulatory','rd_head'].includes(user?.role) || (can && can('Regulatory','create'))
  const CHECK_TYPES = ['Ingredient Compliance','Claim Substantiation','FSSAI Filing','Label Compliance','Clinical Study','Import License']
  const STATUSES = ['Pending','Under Review','Approved','Rework Required']
  const statusColor = s => s==='Approved'?'default':s==='Rework Required'?'destructive':s==='Under Review'?'secondary':'outline'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [cData, pData] = await Promise.all([
        apiCall('/api/regulatory', { token }),
        apiCall('/api/ppd', { token }),
      ])
      setChecks(Array.isArray(cData) ? cData : [])
      setPpds(Array.isArray(pData) ? pData : [])
    } catch(e) { toast.error('Failed to load') }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.ppd_id || !form.check_type) return toast.error('PPD and check type required')
    setSaving(true)
    try {
      await apiCall('/api/regulatory', { method:'POST', body: form, token })
      toast.success('Regulatory check created & assigned')
      setShowAdd(false)
      setForm({ ppd_id:'', check_type:'Ingredient Compliance', ingredient_or_claim:'', assigned_to:'', assigned_role:'regulatory', due_date:'', notes:'' })
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
            <div><Label>PPD</Label>
              <Select value={form.ppd_id} onValueChange={v=>setForm(f=>({...f,ppd_id:v}))}>
                <SelectTrigger><SelectValue placeholder="Select PPD"/></SelectTrigger>
                <SelectContent>{ppds.map(p=><SelectItem key={p.ppd_id} value={p.ppd_id}>{p.ppd_id} — {p.project_name}</SelectItem>)}</SelectContent>
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
  const [ppds, setPpds] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ ppd_id:'', formula_id:'', panel_size:'', eval_date:'', overall_score:'', aroma:'', taste:'', mouthfeel:'', aftertaste:'', adl_protein_pct:'', adl_fat_pct:'', adl_moisture:'', adl_ash:'', adl_apc:'', adl_ecoli:'Absent', notes:'' })

  const canCreate = ['admin','pmsa','adl','rd_head'].includes(user?.role) || (can && can('Sensory','create'))
  const STATUSES = ['Pending','Pass','Fail']
  const statusColor = s => s==='Pass'?'default':s==='Fail'?'destructive':'secondary'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [eData, pData] = await Promise.all([apiCall('/api/sensory', { token }), apiCall('/api/ppd', { token })])
      setEvals(Array.isArray(eData) ? eData : [])
      setPpds(Array.isArray(pData) ? pData : [])
      if (eData?.length && !selected) setSelected(eData[0])
    } catch(e) { toast.error('Failed to load') }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.ppd_id) return toast.error('Select a PPD')
    setSaving(true)
    try {
      const res = await apiCall('/api/sensory', { method:'POST', body:{ ...form, panel_size: parseInt(form.panel_size)||0 }, token })
      toast.success(`Evaluation ${res.eval_id} submitted`)
      setShowAdd(false)
      setForm({ ppd_id:'', formula_id:'', panel_size:'', eval_date:'', overall_score:'', aroma:'', taste:'', mouthfeel:'', aftertaste:'', adl_protein_pct:'', adl_fat_pct:'', adl_moisture:'', adl_ash:'', adl_apc:'', adl_ecoli:'Absent', notes:'' })
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

      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Sensory & Analytical Evaluation</h1><p className="text-muted-foreground text-sm">PM & SA + ADL evaluation results</p></div>
        {canCreate && <Button onClick={()=>setShowAdd(true)}><Plus className="h-4 w-4 mr-2"/>Submit Evaluation</Button>}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Sensory & Analytical Evaluation</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto pr-1">
            <div className="col-span-2"><Label>PPD</Label>
              <Select value={form.ppd_id} onValueChange={v=>setForm(f=>({...f,ppd_id:v}))}>
                <SelectTrigger><SelectValue placeholder="Select PPD"/></SelectTrigger>
                <SelectContent>{ppds.map(p=><SelectItem key={p.ppd_id} value={p.ppd_id}>{p.ppd_id} — {p.project_name}</SelectItem>)}</SelectContent>
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
  const [ppds, setPpds] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [costRows, setCostRows] = useState([{ component:'', pct:'', cost_inr:'' }])
  const [pkgRows, setPkgRows] = useState([{ item:'', cost_per_unit:'', feasibility:'Feasible' }])
  const [form, setForm] = useState({ ppd_id:'', formula_id:'', total_cost_per_kg:'', notes:'' })

  const canCreate = ['admin','packaging','rd_head','mgmt'].includes(user?.role) || (can && can('Costing','create'))
  const STATUSES = ['Draft','Under Review','Approved']
  const statusColor = s => s==='Approved'?'default':s==='Under Review'?'secondary':'outline'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rData, pData] = await Promise.all([apiCall('/api/costing', { token }), apiCall('/api/ppd', { token })])
      setRecords(Array.isArray(rData) ? rData : [])
      setPpds(Array.isArray(pData) ? pData : [])
      if (rData?.length && !selected) setSelected(rData[0])
    } catch(e) { toast.error('Failed to load') }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.ppd_id) return toast.error('Select a PPD')
    setSaving(true)
    try {
      const res = await apiCall('/api/costing', { method:'POST', body:{ ...form, cost_breakdown: costRows.filter(r=>r.component), packaging_items: pkgRows.filter(r=>r.item) }, token })
      toast.success(`Costing record ${res.cost_id} created`)
      setShowAdd(false)
      setForm({ ppd_id:'', formula_id:'', total_cost_per_kg:'', notes:'' })
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

      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Costing & Packaging Feasibility</h1><p className="text-muted-foreground text-sm">Packaging team costing analysis</p></div>
        {canCreate && <Button onClick={()=>setShowAdd(true)}><Plus className="h-4 w-4 mr-2"/>New Costing</Button>}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Costing Record</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            <div><Label>PPD</Label>
              <Select value={form.ppd_id} onValueChange={v=>setForm(f=>({...f,ppd_id:v}))}>
                <SelectTrigger><SelectValue placeholder="Select PPD"/></SelectTrigger>
                <SelectContent>{ppds.map(p=><SelectItem key={p.ppd_id} value={p.ppd_id}>{p.ppd_id} — {p.project_name}</SelectItem>)}</SelectContent>
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
  const [ppds, setPpds] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ ppd_id:'', claim_text:'', evidence:'', assigned_to:'', assigned_role:'sa', notes:'' })

  const canCreate = ['admin','sa','rd_head','regulatory'].includes(user?.role) || (can && can('Claim','create'))
  const STATUSES = ['Pending','In Review','Verified','Rejected']
  const statusColor = s => s==='Verified'?'default':s==='Rejected'?'destructive':s==='In Review'?'secondary':'outline'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [cData, pData] = await Promise.all([apiCall('/api/claims', { token }), apiCall('/api/ppd', { token })])
      setClaims(Array.isArray(cData) ? cData : [])
      setPpds(Array.isArray(pData) ? pData : [])
    } catch(e) { toast.error('Failed to load') }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.ppd_id || !form.claim_text) return toast.error('PPD and claim text required')
    setSaving(true)
    try {
      await apiCall('/api/claims', { method:'POST', body: form, token })
      toast.success('Claim created & assigned for substantiation')
      setShowAdd(false)
      setForm({ ppd_id:'', claim_text:'', evidence:'', assigned_to:'', assigned_role:'sa', notes:'' })
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
            <div><Label>PPD</Label>
              <Select value={form.ppd_id} onValueChange={v=>setForm(f=>({...f,ppd_id:v}))}>
                <SelectTrigger><SelectValue placeholder="Select PPD"/></SelectTrigger>
                <SelectContent>{ppds.map(p=><SelectItem key={p.ppd_id} value={p.ppd_id}>{p.ppd_id} — {p.project_name}</SelectItem>)}</SelectContent>
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
  const [artworks, setArtworks]   = useState([])
  const [ppds, setPpds]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [showAdd, setShowAdd]     = useState(false)
  const [saving, setSaving]       = useState(false)
  const [selected, setSelected]   = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [editOpen, setEditOpen]   = useState(false)
  const [editForm, setEditForm]   = useState({})
  const [statusFilter, setStatusFilter] = useState('all')
  const [reviewComment, setReviewComment] = useState('')
  const [reviewing, setReviewing] = useState(null)
  const [form, setForm] = useState({ ppd_id:'', artwork_type:'Label', sku:'', brief_notes:'', design_link:'', assigned_to:'' })

  const canCreate = ['admin','marketing','packaging','rd_head'].includes(user?.role) || (can && can('Artwork','create'))
  const canUpdate = ['admin','packaging','marketing','rd_head'].includes(user?.role) || (can && can('Artwork','edit'))
  const canReview = ['admin','rd_head'].includes(user?.role)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : ''
      // packaging & rd_head need all PPDs for artwork — use ?all=all to bypass teams_involved filter
      const ppdUrl = ['packaging','rd_head'].includes(user?.role) ? '/api/ppd?all=all' : '/api/ppd'
      const [aData, pData] = await Promise.all([
        apiCall(`/api/artwork${params}`, { token }),
        apiCall(ppdUrl, { token }),
      ])
      setArtworks(Array.isArray(aData) ? aData : [])
      setPpds(Array.isArray(pData) ? pData : [])
    } catch(e) { toast.error('Failed to load artwork') }
    finally { setLoading(false) }
  }, [token, statusFilter, user?.role])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.ppd_id) return toast.error('Select a PPD')
    setSaving(true)
    try {
      const res = await apiCall('/api/artwork', { method:'POST', body: form, token })
      toast.success(`Artwork brief ${res.artwork_id} submitted — R&D Head notified for approval`)
      setShowAdd(false)
      setForm({ ppd_id:'', artwork_type:'Label', sku:'', brief_notes:'', design_link:'', assigned_to:'' })
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

  const handleReview = async (artworkId, decision) => {
    setReviewing(artworkId)
    try {
      await apiCall(`/api/artwork/${artworkId}/review`, {
        method: 'POST', token,
        body: { decision, comment: reviewComment.trim() || undefined }
      })
      toast.success(`Artwork ${decision === 'approved' ? 'Approved ✓' : 'Rework requested'}`)
      setReviewComment('')
      load()
    } catch(e) { toast.error(e.message || 'Failed') }
    finally { setReviewing(null) }
  }

  // Counts by status
  const pending = artworks.filter(a => a.status === 'Brief Pending').length
  const inProg  = artworks.filter(a => a.status === 'Design In Progress').length
  const review  = artworks.filter(a => a.status === 'Under Review').length
  const approved = artworks.filter(a => a.status === 'Approved').length

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Artwork Management</h1>
          <p className="text-muted-foreground text-sm">
            {user?.role === 'marketing' ? 'Submit artwork briefs for your brands' :
             user?.role === 'packaging' ? 'Upload artwork brief → sent to R&D Head for approval' :
             user?.role === 'rd_head'   ? 'Review and approve artwork briefs submitted by Packaging' :
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
            <DialogDescription>Packaging submits brief → R&D Head reviews and approves</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>PPD <span className="text-red-500">*</span></Label>
              <Select value={form.ppd_id} onValueChange={v=>setForm(f=>({...f,ppd_id:v}))}>
                <SelectTrigger><SelectValue placeholder="Select PPD"/></SelectTrigger>
                <SelectContent>{ppds.map(p=><SelectItem key={p.ppd_id} value={p.ppd_id}>{p.ppd_id} — {p.project_name}</SelectItem>)}</SelectContent>
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
              {/* Only R&D Head / Admin can add review comments and change status */}
              {canReview && (
                <>
                  <div><Label>Review Comment</Label>
                    <Textarea rows={2} value={editForm.comment||''} onChange={e=>setEditForm(f=>({...f,comment:e.target.value}))} placeholder="Reviewer feedback, change requests…"/>
                  </div>
                  <div><Label>Status</Label>
                    <Select value={editForm.status||''} onValueChange={v=>setEditForm(f=>({...f,status:v}))}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>{ART_STATUSES.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </>
              )}
              {/* Show current status as read-only for packaging */}
              {!canReview && (
                <div className="bg-slate-50 rounded-lg p-3 border">
                  <p className="text-xs text-muted-foreground">Current Status</p>
                  <span className={`text-xs px-2 py-0.5 rounded-md font-medium mt-1 inline-block ${ART_STATUS_COLORS[editForm.status]||'bg-slate-100'}`}>{editForm.status}</span>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={()=>setEditOpen(false)}>Cancel</Button>
              <Button disabled={saving} onClick={handleSave}>{saving?'Saving…':'Save Changes'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Detail Dialog — shown when clicking a row */}
      {selected && detailOpen && (
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-mono text-base">{selected.artwork_id}</DialogTitle>
              <DialogDescription>{selected.project_name} • {selected.brand}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-lg p-3 border">
                  <p className="text-xs text-muted-foreground">Artwork Type</p>
                  <p className="font-medium mt-0.5">{selected.artwork_type || '—'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border">
                  <p className="text-xs text-muted-foreground">SKU / Pack Size</p>
                  <p className="font-medium mt-0.5">{selected.sku || '—'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border">
                  <p className="text-xs text-muted-foreground">Version</p>
                  <p className="font-medium mt-0.5 font-mono">{selected.version || '—'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${ART_STATUS_COLORS[selected.status]||'bg-slate-100'}`}>{selected.status}</span>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border">
                  <p className="text-xs text-muted-foreground">Assigned To</p>
                  <p className="font-medium mt-0.5">{selected.assigned_to || '—'}</p>
                </div>
              </div>
              {selected.design_link && (
                <div className="bg-slate-50 rounded-lg p-3 border">
                  <p className="text-xs text-muted-foreground mb-1">Design Link</p>
                  <a href={selected.design_link} target="_blank" rel="noreferrer"
                    className="text-primary text-xs hover:underline flex items-center gap-1 break-all">
                    <Eye className="h-3 w-3 shrink-0"/>
                    {selected.design_link}
                  </a>
                </div>
              )}
              {selected.brief_notes && (
                <div className="bg-slate-50 rounded-lg p-3 border">
                  <p className="text-xs text-muted-foreground mb-1">Brief Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{selected.brief_notes}</p>
                </div>
              )}
              {selected.comment && (
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                  <p className="text-xs text-amber-700 font-medium mb-1">Review Comment</p>
                  <p className="text-sm">{selected.comment}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div><span className="font-medium">Created by:</span> {selected.created_by} ({selected.created_by_role})</div>
                <div><span className="font-medium">Created:</span> {selected.created_at ? new Date(selected.created_at).toLocaleString('en-IN') : '—'}</div>
              </div>
            </div>
            <DialogFooter>
              {canUpdate && (
                <Button variant="outline" onClick={()=>{ setDetailOpen(false); openEdit(selected) }}>
                  <Edit className="h-4 w-4 mr-2"/>Edit
                </Button>
              )}
              <Button onClick={()=>setDetailOpen(false)}>Close</Button>
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
                  <TableRow key={a.artwork_id} className="hover:bg-muted/40 cursor-pointer"
                    onClick={e => { if (e.target.closest('button,select,input,a')) return; setSelected(a); setDetailOpen(true) }}>
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
                    {(canUpdate || canReview) && (
                      <TableCell>
                        <div className="flex gap-1 items-center flex-wrap">
                          {/* R&D Head: Approve / Rework buttons — only for Under Review artworks */}
                          {canReview && a.status === 'Under Review' && (
                            <>
                              <Input
                                className="h-6 text-xs w-24"
                                placeholder="Comment"
                                value={reviewing === a.artwork_id ? reviewComment : ''}
                                onChange={e => { setReviewing(a.artwork_id); setReviewComment(e.target.value) }}
                              />
                              <Button size="sm" className="h-6 text-xs bg-emerald-600 hover:bg-emerald-700 px-2"
                                onClick={() => handleReview(a.artwork_id, 'approved')}
                                title="Approve">
                                <CheckCircle2 className="h-3 w-3"/>
                              </Button>
                              <Button size="sm" variant="outline" className="h-6 text-xs border-amber-400 text-amber-600 px-2"
                                onClick={() => handleReview(a.artwork_id, 'rework')}
                                title="Request Rework">
                                <XCircle className="h-3 w-3"/>
                              </Button>
                            </>
                          )}
                          {/* Packaging / marketing: Edit brief details only — no status change */}
                          {canUpdate && !canReview && (
                            <Button size="sm" variant="ghost" title="Edit Brief" onClick={()=>openEdit(a)}>
                              <Edit className="h-4 w-4"/>
                            </Button>
                          )}
                          {/* Admin & rd_head: Edit button always available */}
                          {canReview && (
                            <Button size="sm" variant="ghost" title="Edit" onClick={()=>openEdit(a)}>
                              <Edit className="h-4 w-4"/>
                            </Button>
                          )}
                        </div>
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
function ReportsView({ user, token }) {
  const UPLOAD_ROLES = ['production','packaging','regulatory','sa','admin']
  const canUpload = UPLOAD_ROLES.includes(user?.role)
  const [ppds, setPpds]             = useState([])
  const [reports, setReports]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [ppdFilter, setPpdFilter]   = useState('all')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploading, setUploading]   = useState(false)
  const [uploadForm, setUploadForm] = useState({ ppd_id:'', report_type:'Stability', notes:'' })
  const [uploadFile, setUploadFile] = useState(null)
  const REPORT_TYPES = ['Stability','QC Analysis','Regulatory Compliance','Production Trial','Batch Report','Safety Data','Other']

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rData, pData] = await Promise.all([
        apiCall(`/api/pilot-reports${ppdFilter !== 'all' ? `?ppd_id=${ppdFilter}` : ''}`, { token }),
        apiCall('/api/ppd', { token }),
      ])
      setReports(Array.isArray(rData) ? rData : [])
      setPpds(Array.isArray(pData) ? pData : [])
    } catch { toast.error('Failed to load reports') }
    finally { setLoading(false) }
  }, [token, ppdFilter])

  useEffect(() => { load() }, [load])

  const handleUpload = async () => {
    if (!uploadForm.ppd_id) return toast.error('Select a PPD')
    if (!uploadFile) return toast.error('Select a file to upload')
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('ppd_id', uploadForm.ppd_id)
      fd.append('report_type', uploadForm.report_type)
      fd.append('notes', uploadForm.notes)
      fd.append('file', uploadFile)
      const res = await fetch('/api/pilot-reports', {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
      })
      if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.detail || 'Upload failed') }
      toast.success('Report submitted — R&D Head has been notified')
      setUploadOpen(false)
      setUploadForm({ ppd_id:'', report_type:'Stability', notes:'' })
      setUploadFile(null)
      load()
    } catch(e) { toast.error(e.message) }
    finally { setUploading(false) }
  }

  const statusBadge = s => s==='approved'?'bg-emerald-100 text-emerald-700':s==='rejected'?'bg-red-100 text-red-700':'bg-amber-100 text-amber-700'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground text-sm">Pilot trial reports submitted for R&D Head review</p>
        </div>
        <div className="flex gap-2">
          {canUpload && (
            <Button onClick={() => setUploadOpen(true)}><Upload className="h-4 w-4 mr-2"/>Upload Report</Button>
          )}
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1"/>Refresh</Button>
        </div>
      </div>

      {/* PPD filter */}
      <Select value={ppdFilter} onValueChange={setPpdFilter}>
        <SelectTrigger className="w-64"><SelectValue placeholder="All PPDs"/></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All PPDs</SelectItem>
          {ppds.map(p=><SelectItem key={p.ppd_id} value={p.ppd_id}>{p.ppd_id} — {p.project_name}</SelectItem>)}
        </SelectContent>
      </Select>

      {/* Reports table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">{[1,2,3].map(i=><div key={i} className="h-10 bg-slate-100 rounded animate-pulse"/>)}</div>
          ) : reports.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30"/>
              <p className="font-medium">No reports yet</p>
              {canUpload && <p className="text-sm">Upload a report using the button above</p>}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report ID</TableHead>
                  <TableHead>PPD / Project</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Review Comment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map(r => (
                  <TableRow key={r.report_id}>
                    <TableCell className="font-mono text-xs">{r.report_id}</TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{r.project_name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{r.ppd_id}</div>
                    </TableCell>
                    <TableCell className="text-sm">{r.report_type}</TableCell>
                    <TableCell>
                      {r.file_url
                        ? <a href={`/api/pilot-reports/${r.report_id}/download`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1"><Paperclip className="h-3 w-3"/>{r.file_name||'Download'}</a>
                        : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{r.created_by}</div>
                      <div className="text-xs text-muted-foreground">{r.created_by_role}</div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : '—'}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-md font-medium capitalize ${statusBadge(r.status)}`}>{r.status}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">{r.review_comment||'—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {reports.length > 0 && (
          <div className="px-4 py-2 border-t text-xs text-muted-foreground">{reports.length} report{reports.length!==1?'s':''} shown</div>
        )}
      </Card>

      {/* Upload Dialog */}
      {canUpload && (
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Report</DialogTitle>
              <DialogDescription>R&D Head will be notified for review upon submission.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>PPD <span className="text-red-500">*</span></Label>
                <Select value={uploadForm.ppd_id} onValueChange={v=>setUploadForm(f=>({...f,ppd_id:v}))}>
                  <SelectTrigger><SelectValue placeholder="Select PPD"/></SelectTrigger>
                  <SelectContent>{ppds.map(p=><SelectItem key={p.ppd_id} value={p.ppd_id}>{p.ppd_id} — {p.project_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Report Type</Label>
                <Select value={uploadForm.report_type} onValueChange={v=>setUploadForm(f=>({...f,report_type:v}))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>{REPORT_TYPES.map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>File <span className="text-red-500">*</span></Label>
                <Input type="file" onChange={e=>setUploadFile(e.target.files?.[0]||null)}
                  accept=".pdf,.doc,.docx,.xlsx,.xls,.csv,.txt,.jpg,.jpeg,.png"/>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea rows={2} value={uploadForm.notes} onChange={e=>setUploadForm(f=>({...f,notes:e.target.value}))} placeholder="Any additional notes..."/>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={()=>setUploadOpen(false)}>Cancel</Button>
              <Button onClick={handleUpload} disabled={uploading}>
                {uploading ? <RefreshCw className="h-4 w-4 animate-spin mr-2"/> : <Upload className="h-4 w-4 mr-2"/>}
                Submit Report
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

/* -------------------- PILOT TRIAL -------------------- */
function PilotTrialView({ user, token }) {
  const isAdmin   = user?.role === 'admin'
  const canReview = ['admin','rd_head'].includes(user?.role)
  const canClose  = ['admin','rd_head'].includes(user?.role)

  const [reports, setReports]       = useState([])
  const [ppds, setPpds]             = useState([])
  const [loading, setLoading]       = useState(true)
  const [ppdFilter, setPpdFilter]   = useState('all')
  const [reviewing, setReviewing]   = useState(null)
  const [reviewComment, setReviewComment] = useState('')
  const [closureOpen, setClosureOpen] = useState(false)
  const [closurePpd, setClosurePpd]   = useState('')
  const [closureNotes, setClosureNotes] = useState('')
  const [submittingClosure, setSubmittingClosure] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rData, pData] = await Promise.all([
        apiCall(`/api/pilot-reports${ppdFilter !== 'all' ? `?ppd_id=${ppdFilter}` : ''}`, { token }),
        apiCall('/api/ppd', { token }),
      ])
      setReports(Array.isArray(rData) ? rData : [])
      setPpds(Array.isArray(pData) ? pData : [])
    } catch(e) { toast.error('Failed to load reports') }
    finally { setLoading(false) }
  }, [token, ppdFilter])

  useEffect(() => { load() }, [load])

  // Review (rd_head)
  const handleReview = async (reportId, decision) => {
    setReviewing(reportId)
    try {
      await apiCall(`/api/pilot-reports/${reportId}/review`, {
        method: 'POST', token,
        body: { decision, comment: reviewComment.trim() || undefined }
      })
      toast.success(`Report ${decision}`)
      setReviewComment('')
      load()
    } catch(e) { toast.error(e.message) }
    finally { setReviewing(null) }
  }

  // Submit for closure (rd_head)
  const handleSubmitClosure = async () => {
    if (!closurePpd) return toast.error('Select a PPD')
    setSubmittingClosure(true)
    try {
      const fd = new FormData()
      fd.append('ppd_id', closurePpd)
      fd.append('notes', closureNotes)
      const res = await fetch('/api/pilot-reports/submit-for-closure', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.detail || 'Failed') }
      toast.success('Project closure request sent to Project Management')
      setClosureOpen(false)
      setClosurePpd('')
      setClosureNotes('')
    } catch(e) { toast.error(e.message) }
    finally { setSubmittingClosure(false) }
  }

  const handleDelete = async (reportId) => {
    if (!confirm(`Delete report ${reportId}? This cannot be undone.`)) return
    try {
      await apiCall(`/api/pilot-reports/${reportId}`, { method: 'DELETE', token })
      toast.success('Report deleted')
      load()
    } catch(e) { toast.error(e.message) }
  }

  const statusBadge = (s) => {
    if (s === 'approved') return 'bg-emerald-100 text-emerald-700'
    if (s === 'rejected') return 'bg-red-100 text-red-700'
    return 'bg-amber-100 text-amber-700'
  }

  const pending   = reports.filter(r => r.status === 'Pending').length
  const approved  = reports.filter(r => r.status === 'approved').length
  const rejected  = reports.filter(r => r.status === 'rejected').length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Pilot Trial Reports</h1>
          <p className="text-muted-foreground text-sm">Upload, review, and manage pilot trial reports for all PPDs</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1"/>Refresh</Button>
          {canClose && (
            <Button variant="outline" className="border-violet-400 text-violet-700 hover:bg-violet-50"
              onClick={() => setClosureOpen(true)}>
              <Send className="h-4 w-4 mr-2"/>Submit for Project Closure
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[{l:'Pending Review',v:pending,c:'text-amber-600'},{l:'Approved',v:approved,c:'text-emerald-600'},{l:'Rejected',v:rejected,c:'text-red-600'}].map(s=>(
          <Card key={s.l}><CardContent className="p-4 text-center"><div className={`text-2xl font-bold ${s.c}`}>{s.v}</div><div className="text-xs text-muted-foreground mt-0.5">{s.l}</div></CardContent></Card>
        ))}
      </div>

      {/* PPD Filter */}
      <div className="flex gap-3 items-center">
        <Select value={ppdFilter} onValueChange={setPpdFilter}>
          <SelectTrigger className="w-64"><SelectValue placeholder="All PPDs"/></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All PPDs</SelectItem>
            {ppds.map(p=><SelectItem key={p.ppd_id} value={p.ppd_id}>{p.ppd_id} — {p.project_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Reports Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">{[1,2,3].map(i=><div key={i} className="h-10 bg-slate-100 rounded animate-pulse"/>)}</div>
          ) : reports.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30"/>
              <p className="font-medium">No reports yet</p>
              {false && <p className="text-sm">Upload a report using the button above</p>}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report ID</TableHead>
                  <TableHead>PPD / Project</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Comment</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map(r => (
                  <TableRow key={r.report_id}>
                    <TableCell className="font-mono text-xs">{r.report_id}</TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{r.project_name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{r.ppd_id}</div>
                    </TableCell>
                    <TableCell className="text-sm">{r.report_type}</TableCell>
                    <TableCell>
                      {r.file_url ? (
                        <a href={`/api/pilot-reports/${r.report_id}/download`} target="_blank" rel="noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                          <Paperclip className="h-3 w-3"/>{r.file_name || 'Download'}
                        </a>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{r.created_by}</div>
                      <div className="text-xs text-muted-foreground">{r.created_by_role}</div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-md font-medium capitalize ${statusBadge(r.status)}`}>
                        {r.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">{r.review_comment || '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 items-center flex-wrap">
                        {canReview && r.status === 'Pending' && (
                          <>
                            <Input
                              className="h-6 text-xs w-24"
                              placeholder="Comment"
                              value={reviewing === r.report_id ? reviewComment : ''}
                              onChange={e => { setReviewing(r.report_id); setReviewComment(e.target.value) }}
                            />
                            <Button size="sm" className="h-6 text-xs bg-emerald-600 hover:bg-emerald-700 px-2"
                              onClick={() => handleReview(r.report_id, 'approved')}>
                              <CheckCircle2 className="h-3 w-3"/>
                            </Button>
                            <Button size="sm" variant="outline" className="h-6 text-xs border-red-300 text-red-600 px-2"
                              onClick={() => handleReview(r.report_id, 'rejected')}>
                              <XCircle className="h-3 w-3"/>
                            </Button>
                          </>
                        )}
                        {canReview && r.status !== 'Pending' && (
                          <span className="text-xs text-muted-foreground mr-1">{r.reviewed_by || '—'}</span>
                        )}
                        {isAdmin && (
                          <Button size="sm" variant="outline"
                            className="h-6 text-xs border-red-300 text-red-600 hover:bg-red-50 px-2"
                            onClick={() => handleDelete(r.report_id)}>
                            <Trash2 className="h-3 w-3"/>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Submit for Closure Dialog (rd_head) */}
      <Dialog open={closureOpen} onOpenChange={setClosureOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit for Project Closure</DialogTitle>
            <DialogDescription>Project Management team will be notified to close the project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>PPD <span className="text-red-500">*</span></Label>
              <Select value={closurePpd} onValueChange={setClosurePpd}>
                <SelectTrigger><SelectValue placeholder="Select PPD"/></SelectTrigger>
                <SelectContent>{ppds.map(p=><SelectItem key={p.ppd_id} value={p.ppd_id}>{p.ppd_id} — {p.project_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea rows={2} value={closureNotes} onChange={e=>setClosureNotes(e.target.value)} placeholder="Closure notes, summary of pilot trial outcome..."/>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setClosureOpen(false)}>Cancel</Button>
            <Button className="bg-violet-600 hover:bg-violet-700" onClick={handleSubmitClosure} disabled={submittingClosure}>
              {submittingClosure ? <RefreshCw className="h-4 w-4 animate-spin mr-2"/> : <Send className="h-4 w-4 mr-2"/>}
              Submit for Closure
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
const PERM_MODULES = ['Projects','PPD','Formulation','Lab Notebook','Plant Trials','Pilot Trial','Regulatory','Sensory','Costing','Claim','Artwork','Master Data','Reports','Archive','Users','Audit']
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
