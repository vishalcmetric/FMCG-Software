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
  admin: { label: 'System Administrator', color: 'bg-purple-600' },
  source: { label: 'Source Team', color: 'bg-blue-600' },
  pm: { label: 'Project Management', color: 'bg-cyan-600' },
  fd: { label: 'R&D / F&D Team Member', color: 'bg-emerald-600' },
  rd_head: { label: 'R&D Head', color: 'bg-emerald-800' },
  marketing: { label: 'Marketing Team', color: 'bg-pink-600' },
  regulatory: { label: 'Regulatory Team', color: 'bg-red-600' },
  packaging: { label: 'Packaging Team', color: 'bg-amber-600' },
  adl: { label: 'ADL Team', color: 'bg-indigo-600' },
  pmsa: { label: 'PM & SA Team', color: 'bg-teal-600' },
  sa: { label: 'SA Team', color: 'bg-sky-600' },
  mgmt: { label: 'Management Committee', color: 'bg-slate-800' },
  ceo: { label: 'CEO', color: 'bg-black' },
  production: { label: 'Production / Plant Trial', color: 'bg-orange-600' },
}

const MENU = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: 'all' },
  { key: 'projects', label: 'Projects', icon: FolderKanban, roles: 'all' },
  { key: 'ppd', label: 'PPD Management', icon: FileText, roles: ['admin','source','pm','fd','rd_head','marketing','regulatory','packaging','mgmt','ceo'] },
  { key: 'formulation', label: 'Formulation Dev.', icon: FlaskConical, roles: ['admin','fd','rd_head'] },
  { key: 'labbook', label: 'E-Lab Notebook', icon: Notebook, roles: ['admin','fd','rd_head','adl'] },
  { key: 'plant', label: 'Plant Trials', icon: Factory, roles: ['admin','production','rd_head','packaging'] },
  { key: 'regulatory', label: 'Regulatory', icon: ShieldCheck, roles: ['admin','regulatory','rd_head'] },
  { key: 'sensory', label: 'Sensory & Analytical', icon: TestTube2, roles: ['admin','pmsa','adl','rd_head'] },
  { key: 'costing', label: 'Costing & Feasibility', icon: Calculator, roles: ['admin','packaging','rd_head','mgmt'] },
  { key: 'claim', label: 'Claim Substantiation', icon: BadgeCheck, roles: ['admin','sa','rd_head'] },
  { key: 'artwork', label: 'Artwork (Karomi)', icon: Palette, roles: ['admin','packaging','marketing'] },
  { key: 'master', label: 'Master Data (SAP)', icon: Database, roles: ['admin','production','packaging','pm'] },
  { key: 'reports', label: 'Reports & Analytics', icon: BarChart3, roles: 'all' },
  { key: 'archive', label: 'Archive', icon: Archive, roles: 'all' },
  { key: 'admin_users', label: 'Users', icon: Users, roles: ['admin'], group: 'Administration' },
  { key: 'admin_roles', label: 'Roles & Permissions', icon: KeyRound, roles: ['admin'], group: 'Administration' },
  { key: 'admin_masters', label: 'Master Configuration', icon: Settings, roles: ['admin'], group: 'Administration' },
  { key: 'audit', label: 'Audit Logs', icon: ScrollText, roles: ['admin','mgmt','ceo'], group: 'Administration' },
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
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

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
  }

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
            <h1 className="text-2xl font-bold">Zydus Wellness</h1>
            <p className="text-sm opacity-80">Product Development Platform</p>
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
      <div className="relative z-10 text-xs opacity-70">© 2026 Zydus Wellness Ltd. All rights reserved.</div>
    </div>
  )
}

/** API status badge */
function ApiStatusBadge({ status }) {
  if (!status) return null
  return (
    <div className={`flex items-center gap-2 w-full text-xs px-1 ${status === 'online' ? 'text-emerald-600' : 'text-amber-600'}`}>
      <div className={`h-2 w-2 rounded-full ${status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
      {status === 'online' ? 'FastAPI backend connected' : 'Backend offline — demo mode active'}
    </div>
  )
}

/* ── LOGIN ── */
function Login({ onLogin }) {
  const [email, setEmail]       = useState('admin@zyduswellness.com')
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
      toast.warning('API offline — using demo mode')
      const demoUser = { email, name: email.split('@')[0].split('.').map(s => s[0].toUpperCase()+s.slice(1)).join(' '), role }
      onLogin(demoUser, null)
      toast.success(`Welcome, ${ROLES[role]?.label || role}`)
    } finally { setLoading(false) }
  }

  if (authPage === 'signup') return <Signup onBack={() => setAuthPage('login')} onLogin={onLogin} apiStatus={apiStatus} />
  if (authPage === 'forgot') return <ForgotPassword onBack={() => setAuthPage('login')} apiStatus={apiStatus} />

  return (
    <div className="min-h-screen flex zydus-pattern">
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
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@zyduswellness.com" autoComplete="email" />
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
              <p className="text-xs text-muted-foreground text-center">Protected by Zydus IT • Access is logged & audited</p>
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
    <div className="min-h-screen flex zydus-pattern">
      <BrandPanel />
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl">Create your account</CardTitle>
            <CardDescription>Register to access the Zydus Wellness platform</CardDescription>
          </CardHeader>
          <form onSubmit={handleSignup}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={form.name} onChange={set('name')} placeholder="Dr. Anjali Rao" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={set('email')} placeholder="name@zyduswellness.com" autoComplete="email" />
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
    <div className="min-h-screen flex zydus-pattern">
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
                  <Input id="fp-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@zyduswellness.com" autoFocus />
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

/* -------------------- SHELL (Sidebar + Header + Content) -------------------- */
function Shell({ user, token, view, setView, sidebarOpen, setSidebarOpen, onLogout }) {
  const menuItems = MENU.filter(m => m.roles === 'all' || m.roles.includes(user.role))
  const mainMenu = menuItems.filter(m => !m.group)
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
              <div className="font-semibold text-sm truncate">Zydus Wellness</div>
              <div className="text-[10px] opacity-70 truncate">Product Dev Platform</div>
            </div>
          )}
        </div>
        <ScrollArea className="flex-1 py-2">
          <nav className="px-2 space-y-0.5">
            {mainMenu.map(item => (
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
          <ViewRouter view={view} setView={setView} user={user} token={token} />
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
  project_created: { icon: Plus,        color: 'text-emerald-600', bg: 'bg-emerald-50' },
  project_updated: { icon: Edit,        color: 'text-blue-600',    bg: 'bg-blue-50'    },
  project_deleted: { icon: Trash2,      color: 'text-red-600',     bg: 'bg-red-50'     },
  task_assigned:   { icon: FileCheck2,  color: 'text-orange-600',  bg: 'bg-orange-50'  },
  info:            { icon: Bell,        color: 'text-slate-600',   bg: 'bg-slate-50'   },
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
      setView('projects')
      toast.info(`Opening project ${n.entity_id}`)
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
function ViewRouter({ view, setView, user, token }) {
  const p = "p-6 space-y-6"
  switch (view) {
    case 'dashboard': return <div className={p}><Dashboard user={user} setView={setView} token={token} /></div>
    case 'projects': return <div className={p}><ProjectsView setView={setView} user={user} token={token} /></div>
    case 'ppd': return <div className={p}><PPDView user={user} /></div>
    case 'formulation': return <div className={p}><FormulationView /></div>
    case 'labbook': return <div className={p}><LabBookView /></div>
    case 'plant': return <div className={p}><PlantTrialsView /></div>
    case 'regulatory': return <div className={p}><RegulatoryView /></div>
    case 'sensory': return <div className={p}><SensoryView /></div>
    case 'costing': return <div className={p}><CostingView /></div>
    case 'claim': return <div className={p}><ClaimView /></div>
    case 'artwork': return <div className={p}><ArtworkView /></div>
    case 'master': return <div className={p}><MasterDataView /></div>
    case 'reports': return <div className={p}><ReportsView /></div>
    case 'archive': return <div className={p}><ArchiveView /></div>
    case 'admin_users': return <div className={p}><UsersAdmin /></div>
    case 'admin_roles': return <div className={p}><RolesAdmin /></div>
    case 'admin_masters': return <div className={p}><MastersAdmin /></div>
    case 'audit': return <div className={p}><AuditView /></div>
    default: return <div className={p}><Dashboard user={user} setView={setView} /></div>
  }
}

/* -------------------- ICON MAP (for dynamic stat icons) -------------------- */
const ICON_MAP = {
  FolderKanban, FileCheck2, FlaskConical, CheckCircle2,
  ShieldCheck, AlertCircle, XCircle, Clock, TrendingUp,
  FileText, Package, ClipboardList, RefreshCw, Factory, Users,
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
            {error && <span className="ml-2 text-amber-500 text-sm">(demo data — API offline)</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => fetchDashboard(true)} disabled={refreshing} title="Refresh dashboard">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setView('projects')} className="gap-2"><Plus className="h-4 w-4"/>New Project</Button>
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
            <div><CardTitle>My Pending Tasks</CardTitle><CardDescription>Items requiring your action</CardDescription></div>
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
                  <TableRow><TableHead>Project</TableHead><TableHead>Task</TableHead><TableHead>Priority</TableHead><TableHead>Due</TableHead><TableHead></TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((t, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{t.project}</TableCell>
                      <TableCell>{t.task}</TableCell>
                      <TableCell>
                        <Badge variant={t.priority==='Critical'?'destructive':t.priority==='High'?'default':'secondary'}>{t.priority}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{t.due}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => { setView('ppd'); toast(`Opening ${t.project}`) }}>Open</Button>
                      </TableCell>
                    </TableRow>
                  ))}
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
const BRANDS       = ['Complan','Sugar Free','Nycil','Glucon-D','Everyuth','Nutralite','Glucon-D','Sugarlite']
const PROJ_TYPES   = ['New Product','AVD','Innovation','Sustainability','Cost Reduction','Product Improvement']
const PRIORITIES   = ['Low','Medium','High','Critical']
const ALL_ROLE_KEYS = ['source','pm','fd','rd_head','marketing','regulatory','packaging','adl','pmsa','sa','mgmt','ceo','production']

function ProjectsView({ setView, user, token }) {
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

  const isAdmin = user?.role === 'admin'

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
    const a    = document.createElement('a'); a.href = url; a.download = 'zydus_projects.csv'; a.click()
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
          {isAdmin && (
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
                    {isAdmin
                      ? <Input value={editForm.name||''} onChange={e => setEditForm(f=>({...f,name:e.target.value}))} />
                      : <p className="text-sm py-2">{editForm.name}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Brand</Label>
                    {isAdmin
                      ? <Select value={editForm.brand||''} onValueChange={v => setEditForm(f=>({...f,brand:v}))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                        </Select>
                      : <p className="text-sm py-2">{editForm.brand}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    {isAdmin
                      ? <Select value={editForm.type||''} onValueChange={v => setEditForm(f=>({...f,type:v}))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{PROJ_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                      : <p className="text-sm py-2">{editForm.type}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    {isAdmin
                      ? <Select value={editForm.priority||''} onValueChange={v => setEditForm(f=>({...f,priority:v}))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{PRIORITIES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                      : <p className="text-sm py-2">{editForm.priority}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Target Launch</Label>
                    {isAdmin
                      ? <Input type="date" value={editForm.target_launch||''} onChange={e => setEditForm(f=>({...f,target_launch:e.target.value}))} />
                      : <p className="text-sm py-2">{editForm.target_launch || '—'}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Owner</Label>
                    <p className="text-sm py-2">{selected.owner}</p>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Objective</Label>
                    {isAdmin
                      ? <Textarea rows={3} value={editForm.objective||''} onChange={e => setEditForm(f=>({...f,objective:e.target.value}))} />
                      : <p className="text-sm py-2 whitespace-pre-line">{editForm.objective || '—'}</p>}
                  </div>
                </div>
              </TabsContent>

              {/* ── Status & Progress tab ── */}
              <TabsContent value="progress" className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Current Status</Label>
                  {isAdmin
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
                  {isAdmin
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
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Teams currently assigned to this project. Only members of these teams can see this project in their dashboard.</p>
                  <div className="flex flex-wrap gap-2">
                    {(selected.teams_involved || '').split(',').filter(Boolean).map(r => (
                      <Badge key={r} className={`${ROLES[r]?.color || 'bg-slate-600'} text-white text-xs`}>
                        {ROLES[r]?.label || r}
                      </Badge>
                    ))}
                  </div>
                  {isAdmin && (
                    <p className="text-xs text-muted-foreground pt-2">To change team access, edit the project and update teams from the admin panel.</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="gap-2 pt-2">
              {isAdmin && (
                <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="mr-auto">
                  {deleting ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                  Delete
                </Button>
              )}
              <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
              {isAdmin && (
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
function PPDView({ user }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">PPD — Product Development Plan</h1><p className="text-muted-foreground text-sm">Complan Pro Chocolate Boost • ZW-2026-001 • Version 2.1 (Draft)</p></div>
        <div className="flex gap-2"><Button variant="outline"><History className="h-4 w-4 mr-2"/>Version History</Button><Button variant="outline"><Send className="h-4 w-4 mr-2"/>Circulate for Review</Button><Button><Send className="h-4 w-4 mr-2"/>Submit for Approval</Button></div>
      </div>

      <Tabs defaultValue="details">
        <TabsList className="grid grid-cols-6 w-full max-w-3xl">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="attachments">Documents</TabsTrigger>
          <TabsTrigger value="reviewers">Reviewers</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
          <TabsTrigger value="workflow">Approval Flow</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Project & Product Details</CardTitle><CardDescription>Structured form fields — required for submission</CardDescription></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Field label="Brand" value="Complan"/>
              <Field label="Project Type" value="New Product"/>
              <Field label="Product Category" value="Nutrition Powder"/>
              <Field label="Target Consumer" value="Kids 5-15 yrs"/>
              <Field label="Market Segment" value="Premium Health"/>
              <Field label="Expected Launch" value="Q4 2026"/>
              <div className="col-span-2 space-y-2"><Label>Objective</Label><Textarea rows={3} defaultValue="Develop a chocolate-flavored premium nutrition powder with 34 essential nutrients, focused on cognitive & physical development for kids aged 5-15..."/></div>
              <div className="col-span-2 space-y-2"><Label>Key Benefits / Claims</Label><Textarea rows={3} defaultValue="• Supports memory & concentration&#10;• Immunity boosting&#10;• Height & weight gain support"/></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attachments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between"><div><CardTitle>Uploaded Documents</CardTitle><CardDescription>Supports PDF, images, Excel, videos ≤ 30MB, external links</CardDescription></div><Button><Upload className="h-4 w-4 mr-2"/>Upload File</Button></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>File</TableHead><TableHead>Type</TableHead><TableHead>Size</TableHead><TableHead>Uploaded By</TableHead><TableHead>Version</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {[
                    { n: 'Market_Research_Complan.pdf', t: 'PDF', s: '2.4 MB', u: 'Rahul M.', v: 'v1' },
                    { n: 'Competitor_Analysis.xlsx', t: 'Excel', s: '186 KB', u: 'Rahul M.', v: 'v2' },
                    { n: 'Consumer_Insights_Video.mp4', t: 'Video', s: '24 MB', u: 'Marketing', v: 'v1' },
                    { n: 'Brand_Guidelines_Link', t: 'OneDrive Link', s: '—', u: 'Marketing', v: 'v1' },
                  ].map((f,i)=>(
                    <TableRow key={i}><TableCell className="font-medium">{f.n}</TableCell><TableCell><Badge variant="outline">{f.t}</Badge></TableCell><TableCell>{f.s}</TableCell><TableCell>{f.u}</TableCell><TableCell>{f.v}</TableCell><TableCell><Button size="sm" variant="ghost"><Eye className="h-4 w-4"/></Button><Button size="sm" variant="ghost"><Download className="h-4 w-4"/></Button></TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviewers">
          <Card>
            <CardHeader><CardTitle>Assigned Reviewers</CardTitle><CardDescription>Functional teams & department heads that must review this PPD</CardDescription></CardHeader>
            <CardContent className="space-y-2">
              {[
                { team: 'Marketing Team', head: 'Neeraj Kapoor', status: 'Reviewed', color: 'green' },
                { team: 'R&D / F&D Team', head: 'Dr. Anjali Rao', status: 'In Progress', color: 'blue' },
                { team: 'Regulatory Team', head: 'Amit Verma', status: 'Pending', color: 'amber' },
                { team: 'Packaging Team', head: 'Rajesh Nair', status: 'Reviewed', color: 'green' },
                { team: 'Sales / GDSO Team', head: 'Kavita Menon', status: 'Pending', color: 'amber' },
              ].map((r,i)=>(
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <div><div className="font-medium">{r.team}</div><div className="text-xs text-muted-foreground">Head: {r.head}</div></div>
                  <Badge variant={r.status==='Reviewed'?'default':r.status==='In Progress'?'secondary':'outline'}>{r.status}</Badge>
                </div>
              ))}
              <Button variant="outline" className="w-full"><Plus className="h-4 w-4 mr-2"/>Add Reviewer</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments">
          <Card>
            <CardHeader><CardTitle>Review Comments & Remarks</CardTitle><CardDescription>Consolidated feedback from all reviewers</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {[
                { u: 'Neeraj K. (Marketing)', c: 'Please clarify positioning vs. existing Complan Original. Suggest adding cognitive benefit as primary claim.', t: '2 hrs ago' },
                { u: 'Dr. Anjali Rao (R&D)', c: 'Formulation approach feasible. Recommend early ADL sample to validate protein source stability.', t: '4 hrs ago' },
                { u: 'Rajesh N. (Packaging)', c: 'Costing feasible within +8% of Complan Original. Requesting artwork brief by end of week.', t: '1 day ago' },
              ].map((c,i)=>(
                <div key={i} className="flex gap-3 p-3 border rounded-lg">
                  <Avatar><AvatarFallback>{c.u.split(' ').map(s=>s[0]).join('').slice(0,2)}</AvatarFallback></Avatar>
                  <div className="flex-1">
                    <div className="flex justify-between"><span className="font-medium text-sm">{c.u}</span><span className="text-xs text-muted-foreground">{c.t}</span></div>
                    <p className="text-sm mt-1">{c.c}</p>
                  </div>
                </div>
              ))}
              <div className="border rounded-lg p-3 space-y-2">
                <Textarea placeholder="Add your comment..." rows={2}/>
                <div className="flex justify-end gap-2"><Button variant="outline" size="sm">Rework</Button><Button size="sm"><MessageSquare className="h-4 w-4 mr-2"/>Post Comment</Button></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflow">
          <Card>
            <CardHeader><CardTitle>Approval Workflow</CardTitle><CardDescription>Multi-level approvals — track progress in real-time</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { s: 'Source Team — PPD Created', d: 'Rahul Mehta', t: '3 days ago', st: 'done' },
                  { s: 'Project Management Team — Departments Assigned', d: 'PM Office', t: '2 days ago', st: 'done' },
                  { s: 'Functional Teams Review', d: 'Marketing, R&D, Regulatory, Packaging, Sales', t: 'In progress', st: 'active' },
                  { s: 'Source Team — PPD Finalization', d: 'Waiting for consolidated feedback', t: '—', st: 'pending' },
                  { s: 'Management Committee Approval', d: 'Marketing Head, Sales Head, R&D Head, GDSO Head, Regulatory Head, CFO', t: '—', st: 'pending' },
                  { s: 'CEO Final Approval', d: 'CEO Office', t: '—', st: 'pending' },
                  { s: 'Execution Phase — Formulation Development', d: '', t: '—', st: 'pending' },
                ].map((w,i,a) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${w.st==='done'?'bg-emerald-600 text-white':w.st==='active'?'bg-orange-500 text-white':'bg-slate-200 text-slate-500'}`}>
                        {w.st==='done'?<CheckCircle2 className="h-5 w-5"/>:w.st==='active'?<Clock className="h-5 w-5 animate-pulse"/>:i+1}
                      </div>
                      {i<a.length-1 && <div className={`w-0.5 flex-1 ${w.st==='done'?'bg-emerald-600':'bg-slate-200'}`} style={{minHeight:24}}/>}
                    </div>
                    <div className="pb-4 flex-1">
                      <div className="font-medium">{w.s}</div>
                      {w.d && <div className="text-sm text-muted-foreground">{w.d}</div>}
                      <div className="text-xs text-muted-foreground mt-0.5">{w.t}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader><CardTitle>Version History</CardTitle><CardDescription>Full audit trail of PPD versions</CardDescription></CardHeader>
            <CardContent className="p-0">
              <Table><TableHeader><TableRow><TableHead>Version</TableHead><TableHead>Changes</TableHead><TableHead>By</TableHead><TableHead>Date</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {[
                    { v: 'v2.1', c: 'Updated cognitive claim + revised target consumer', u: 'Rahul M.', d: 'Today' },
                    { v: 'v2.0', c: 'Rework post initial review — pricing revised', u: 'Rahul M.', d: '2 days ago' },
                    { v: 'v1.0', c: 'Initial PPD submission', u: 'Rahul M.', d: '5 days ago' },
                  ].map((v,i)=>(<TableRow key={i}><TableCell><Badge>{v.v}</Badge></TableCell><TableCell>{v.c}</TableCell><TableCell>{v.u}</TableCell><TableCell>{v.d}</TableCell><TableCell><Button size="sm" variant="outline"><Eye className="h-4 w-4 mr-2"/>View</Button></TableCell></TableRow>))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
function Field({ label, value }) {
  return <div className="space-y-2"><Label>{label}</Label><Input defaultValue={value}/></div>
}

/* -------------------- FORMULATION -------------------- */
function FormulationView() {
  const [compareOpen, setCompareOpen] = useState(false)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Formulation Development</h1><p className="text-muted-foreground text-sm">R&D / F&D workspace — trials, versions, and AI-assisted analysis</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={()=>setCompareOpen(true)}><GitCompare className="h-4 w-4 mr-2"/>Compare Formulas</Button>
          <Button><Plus className="h-4 w-4 mr-2"/>New Formula Version</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Active Formulas</CardTitle><CardDescription>Complan Pro Chocolate Boost — 4 versions in trial</CardDescription></CardHeader>
          <CardContent className="p-0">
            <Table><TableHeader><TableRow><TableHead>Version</TableHead><TableHead>Type</TableHead><TableHead>Protein Source</TableHead><TableHead>Sweetener</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {[
                  { v: 'F-01', t: 'Trial', p: 'Whey Isolate 22%', s: 'Sucralose', st: 'Rejected' },
                  { v: 'F-02', t: 'Trial', p: 'Whey Isolate 25%', s: 'Stevia + Sucrose', st: 'Sensory pass' },
                  { v: 'F-03', t: 'Trial', p: 'Milk + Whey Blend', s: 'Sucrose', st: 'In Testing' },
                  { v: 'F-04', t: 'Final', p: 'Milk + Whey (30/70)', s: 'Sucrose + Stevia', st: 'Recommended' },
                ].map((f,i)=>(<TableRow key={i}><TableCell><Badge variant={f.st==='Recommended'?'default':'outline'}>{f.v}</Badge></TableCell><TableCell>{f.t}</TableCell><TableCell>{f.p}</TableCell><TableCell>{f.s}</TableCell><TableCell><Badge variant={f.st==='Recommended'?'default':f.st==='Rejected'?'destructive':'secondary'}>{f.st}</Badge></TableCell><TableCell><Button size="sm" variant="ghost"><Eye className="h-4 w-4"/></Button></TableCell></TableRow>))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/5 to-accent/5">
          <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-accent"/>AI Formulation Insights</CardTitle><CardDescription>Pattern analysis across 42 historical trials</CardDescription></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="p-3 rounded-lg bg-white border">
              <div className="font-medium text-primary">✓ Recommendation</div>
              <p className="text-muted-foreground text-xs mt-1">F-04 profile matches your 6 highest-scored historical formulas. Estimated sensory pass: <b>87%</b>.</p>
            </div>
            <div className="p-3 rounded-lg bg-white border">
              <div className="font-medium text-orange-600">⚠ Watch</div>
              <p className="text-muted-foreground text-xs mt-1">Sucralose in F-01 caused rejection in 3 similar trials. Consider stevia blends.</p>
            </div>
            <div className="p-3 rounded-lg bg-white border">
              <div className="font-medium text-blue-600">ℹ Trend</div>
              <p className="text-muted-foreground text-xs mt-1">Milk-whey blends (30/70) show +18% stability at 40°C vs. pure whey.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Technical Documents</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {['AVD Assessment','Innovation Note','Sustainability','Literature Search','Ingredient Search','Benchmarking','DOE Plan','Regulatory Check'].map(d=>(
            <div key={d} className="p-4 border rounded-lg hover:shadow-md transition cursor-pointer">
              <FileText className="h-6 w-6 text-primary mb-2"/><div className="font-medium text-sm">{d}</div><div className="text-xs text-muted-foreground mt-1">Click to open</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader><DialogTitle>Compare Formulas Side-by-Side</DialogTitle><DialogDescription>Select up to 5 formulas to compare</DialogDescription></DialogHeader>
          <Table><TableHeader><TableRow><TableHead>Parameter</TableHead><TableHead>F-01</TableHead><TableHead>F-02</TableHead><TableHead>F-03</TableHead><TableHead>F-04</TableHead></TableRow></TableHeader>
            <TableBody>
              {[
                ['Protein %','22%','25%','24%','26%'],
                ['Sugar (g/100g)','12','8','15','10'],
                ['Sweetener','Sucralose','Stevia+Sucrose','Sucrose','Sucrose+Stevia'],
                ['Cocoa %','12%','14%','13%','15%'],
                ['Sensory Score','5.2/10','7.8/10','7.1/10','8.6/10'],
                ['Cost/kg','₹385','₹412','₹398','₹425'],
                ['Stability (40°C)','65 days','78 days','82 days','92 days'],
              ].map((r,i)=>(<TableRow key={i}><TableCell className="font-medium">{r[0]}</TableCell><TableCell>{r[1]}</TableCell><TableCell>{r[2]}</TableCell><TableCell>{r[3]}</TableCell><TableCell className="font-medium text-primary">{r[4]}</TableCell></TableRow>))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* -------------------- LAB NOTEBOOK -------------------- */
function LabBookView() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">E-Lab Notebook</h1><p className="text-muted-foreground text-sm">Digitized experiment records with historical versioning</p></div>
        <Button><Plus className="h-4 w-4 mr-2"/>New Experiment</Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Experiments</CardTitle></CardHeader>
          <CardContent className="p-0"><ScrollArea className="h-[500px]"><div className="p-2 space-y-1">
            {[
              { id: 'EXP-4521', t: 'Whey solubility trial', d: 'Today, 10:30 AM' },
              { id: 'EXP-4520', t: 'Cocoa flavor stability', d: 'Yesterday' },
              { id: 'EXP-4519', t: 'Sweetener blend ratio DOE', d: '2 days ago' },
              { id: 'EXP-4518', t: 'Protein aggregation test', d: '3 days ago' },
              { id: 'EXP-4517', t: 'pH range validation', d: '4 days ago' },
              { id: 'EXP-4516', t: 'Viscosity check batch A/B', d: '5 days ago' },
            ].map((e,i)=>(<div key={i} className={`p-3 rounded-lg cursor-pointer hover:bg-slate-100 ${i===0?'bg-primary/5 border border-primary/20':''}`}><div className="flex justify-between"><span className="text-xs text-muted-foreground font-mono">{e.id}</span><span className="text-xs text-muted-foreground">{e.d}</span></div><div className="font-medium text-sm mt-1">{e.t}</div></div>))}
          </div></ScrollArea></CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row justify-between items-start"><div><CardTitle>EXP-4521 — Whey solubility trial</CardTitle><CardDescription>Recorded by Dr. Anjali Rao • Version 3 of 3</CardDescription></div><Badge>Active</Badge></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 border rounded-lg"><div className="text-xs text-muted-foreground">Date</div><div className="font-medium">15 Jun 2026</div></div>
              <div className="p-3 border rounded-lg"><div className="text-xs text-muted-foreground">Batch #</div><div className="font-medium">B-2026-045</div></div>
              <div className="p-3 border rounded-lg"><div className="text-xs text-muted-foreground">Temperature</div><div className="font-medium">40°C</div></div>
              <div className="p-3 border rounded-lg"><div className="text-xs text-muted-foreground">Duration</div><div className="font-medium">4 hrs</div></div>
            </div>
            <div><Label>Observations</Label><Textarea rows={4} defaultValue="Whey isolate at 25% w/v shows full dissolution within 90 seconds at 40°C. No visible aggregation post 4 hours. Turbidity measurement: 12 NTU (acceptable range). Recommend proceeding to sensory trial."/></div>
            <div><Label>Attachments</Label><div className="mt-2 flex flex-wrap gap-2">
              {['solubility_reading.xlsx','turbidity_chart.png','photo_batch_045.jpg'].map(a=>(<Badge key={a} variant="outline" className="py-1.5 pl-3"><FileText className="h-3 w-3 mr-2"/>{a}</Badge>))}
            </div></div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/* -------------------- PLANT TRIALS -------------------- */
function PlantTrialsView() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Plant Trials</h1><p className="text-muted-foreground text-sm">Production scale-up, stability, and commercial run reports</p></div>
        <Button><Plus className="h-4 w-4 mr-2"/>Schedule Trial</Button>
      </div>

      <Tabs defaultValue="active">
        <TabsList><TabsTrigger value="active">Active Trials</TabsTrigger><TabsTrigger value="reports">Reports</TabsTrigger><TabsTrigger value="forms">Production Forms</TabsTrigger></TabsList>
        <TabsContent value="active">
          <Card><CardContent className="p-0"><Table>
            <TableHeader><TableRow><TableHead>Trial ID</TableHead><TableHead>Project</TableHead><TableHead>Plant</TableHead><TableHead>Batch Size</TableHead><TableHead>Stage</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {[
                { id: 'PT-2026-021', p: 'Nycil Cool Menthol XT', pl: 'Sikkim Plant', b: '500 kg', s: 'Commercial Run', st: 'In Progress' },
                { id: 'PT-2026-020', p: 'Complan Pro Chocolate', pl: 'Aligarh Plant', b: '250 kg', s: 'Pilot', st: 'Complete' },
                { id: 'PT-2026-019', p: 'Glucon-D Immunity+', pl: 'Ahmedabad Plant', b: '1000 kg', s: 'Stability', st: 'Ongoing' },
              ].map((t,i)=>(<TableRow key={i}><TableCell className="font-mono text-xs">{t.id}</TableCell><TableCell className="font-medium">{t.p}</TableCell><TableCell>{t.pl}</TableCell><TableCell>{t.b}</TableCell><TableCell>{t.s}</TableCell><TableCell><Badge variant={t.st==='Complete'?'default':'secondary'}>{t.st}</Badge></TableCell></TableRow>))}
            </TableBody>
          </Table></CardContent></Card>
        </TabsContent>
        <TabsContent value="reports">
          <Card><CardHeader><CardTitle>Trial Reports</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['Stability Batch Reports','TRF (Trial Request Form)','COA (Certificate of Analysis)','Sensory Report','Plain Trial Report','Commercial Run Report','Stability Report','License Application','Clinical Report'].map(r=>(<div key={r} className="p-4 border rounded-lg hover:shadow-md cursor-pointer"><FileCheck2 className="h-6 w-6 text-primary mb-2"/><div className="font-medium text-sm">{r}</div><Button variant="ghost" size="sm" className="mt-2 -ml-2"><Upload className="h-3 w-3 mr-1"/>Upload</Button></div>))}
          </div></CardContent></Card>
        </TabsContent>
        <TabsContent value="forms">
          <Card><CardHeader><CardTitle>Production Data Forms</CardTitle><CardDescription>Fill out BOM, MFC, Product & Specification details</CardDescription></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Field label="BOM Code" value="BOM-CMP-4521"/>
              <Field label="MFC (Master Formula Code)" value="MFC-2026-088"/>
              <Field label="Product Code" value="P-CMP-CH-500"/>
              <Field label="SFG Code (Semi-Finished)" value="SFG-2026-142"/>
              <Field label="Packaging BOM" value="PKG-BOM-021"/>
              <Field label="Specification #" value="SPEC-CMP-2026"/>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

/* -------------------- REGULATORY -------------------- */
function RegulatoryView() {
  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold">Regulatory Compliance</h1><p className="text-muted-foreground text-sm">Ingredient validation, claims verification, statutory documents</p></div>
      <div className="grid grid-cols-3 gap-4">
        {[
          { l: 'Under Review', v: 8, c: 'text-orange-600' },
          { l: 'Approved', v: 24, c: 'text-emerald-600' },
          { l: 'Rework Required', v: 3, c: 'text-red-600' },
        ].map(s => (<Card key={s.l}><CardContent className="p-6"><div className="text-sm text-muted-foreground">{s.l}</div><div className={`text-3xl font-bold ${s.c}`}>{s.v}</div></CardContent></Card>))}
      </div>
      <Card><CardHeader><CardTitle>Pending Regulatory Reviews</CardTitle></CardHeader><CardContent className="p-0"><Table>
        <TableHeader><TableRow><TableHead>Project</TableHead><TableHead>Check Type</TableHead><TableHead>Ingredient/Claim</TableHead><TableHead>Assigned</TableHead><TableHead>Due</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {[
            { p: 'Complan Pro Chocolate', c: 'Ingredient Compliance', i: 'Whey Isolate (imported)', a: 'Amit V.', d: 'Today' },
            { p: 'Glucon-D Immunity+', c: 'Claim Substantiation', i: 'Immunity Boost claim', a: 'Amit V.', d: '2 days' },
            { p: 'Everyuth Aloe', c: 'FSSAI Filing', i: 'Cosmetic license update', a: 'Priya R.', d: '5 days' },
          ].map((r,i)=>(<TableRow key={i}><TableCell className="font-medium">{r.p}</TableCell><TableCell>{r.c}</TableCell><TableCell>{r.i}</TableCell><TableCell>{r.a}</TableCell><TableCell><Badge variant="outline">{r.d}</Badge></TableCell><TableCell><Button size="sm"><CheckCircle2 className="h-4 w-4 mr-2"/>Review</Button></TableCell></TableRow>))}
        </TableBody>
      </Table></CardContent></Card>
    </div>
  )
}

/* -------------------- SENSORY -------------------- */
function SensoryView() {
  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold">Sensory & Analytical Evaluation</h1><p className="text-muted-foreground text-sm">PM & SA Team + ADL evaluation results</p></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card><CardHeader><CardTitle>Sensory Test — Complan Pro F-04</CardTitle><CardDescription>Panel size: 24 evaluators • Date: 15 Jun 2026</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {[
              { l: 'Overall Acceptance', v: 86 }, { l: 'Aroma', v: 82 }, { l: 'Taste', v: 88 }, { l: 'Mouthfeel', v: 79 }, { l: 'Aftertaste', v: 84 },
            ].map(s => (<div key={s.l}><div className="flex justify-between text-sm mb-1"><span>{s.l}</span><span className="font-medium">{s.v}%</span></div><Progress value={s.v}/></div>))}
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle>Analytical Validation (ADL)</CardTitle><CardDescription>Chemical & microbial testing</CardDescription></CardHeader>
          <CardContent className="p-0"><Table>
            <TableHeader><TableRow><TableHead>Parameter</TableHead><TableHead>Result</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {[['Protein %','25.8%','Pass'],['Fat %','8.2%','Pass'],['Moisture','3.1%','Pass'],['Ash','4.9%','Pass'],['Aerobic Plate Count','<10 CFU/g','Pass'],['E. coli','Absent','Pass']].map((r,i)=>(<TableRow key={i}><TableCell>{r[0]}</TableCell><TableCell className="font-medium">{r[1]}</TableCell><TableCell><Badge>{r[2]}</Badge></TableCell></TableRow>))}
            </TableBody>
          </Table></CardContent>
        </Card>
      </div>
    </div>
  )
}

/* -------------------- COSTING -------------------- */
function CostingView() {
  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold">Costing & Packaging Feasibility</h1><p className="text-muted-foreground text-sm">Packaging team costing analysis</p></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card><CardHeader><CardTitle>Formula Cost Breakdown</CardTitle><CardDescription>Complan Pro Chocolate F-04 • per kg</CardDescription></CardHeader>
          <CardContent className="p-0"><Table>
            <TableHeader><TableRow><TableHead>Component</TableHead><TableHead>%</TableHead><TableHead className="text-right">Cost (₹)</TableHead></TableRow></TableHeader>
            <TableBody>
              {[['Whey + Milk Blend','30','185'],['Sugar / Stevia','18','42'],['Cocoa Powder','15','68'],['Vitamins & Minerals','5','98'],['Flavors & Others','4','32']].map((r,i)=>(<TableRow key={i}><TableCell>{r[0]}</TableCell><TableCell>{r[1]}%</TableCell><TableCell className="text-right font-medium">{r[2]}</TableCell></TableRow>))}
              <TableRow className="font-bold bg-slate-50"><TableCell>Total Formula Cost</TableCell><TableCell>72%</TableCell><TableCell className="text-right">₹425</TableCell></TableRow>
            </TableBody>
          </Table></CardContent>
        </Card>
        <Card><CardHeader><CardTitle>Packaging Feasibility</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { l: 'Primary Pouch (200g)', c: '₹8.5', f: 'Feasible' },
              { l: 'Secondary Carton', c: '₹4.2', f: 'Feasible' },
              { l: 'Master Case (24 units)', c: '₹22', f: 'Feasible' },
              { l: 'Doypack Alternative', c: '₹12', f: 'Under Review' },
            ].map((p,i)=>(<div key={i} className="flex justify-between items-center p-3 border rounded-lg"><div><div className="font-medium">{p.l}</div><div className="text-sm text-muted-foreground">{p.c} / unit</div></div><Badge variant={p.f==='Feasible'?'default':'secondary'}>{p.f}</Badge></div>))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/* -------------------- CLAIM -------------------- */
function ClaimView() {
  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold">Claim Substantiation</h1><p className="text-muted-foreground text-sm">SA Team — evidence and validation of product claims</p></div>
      <Card><CardHeader><CardTitle>Claims Under Review</CardTitle></CardHeader><CardContent className="p-0"><Table>
        <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Claim</TableHead><TableHead>Evidence</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>
          {[
            { p: 'Complan Pro', c: 'Supports memory & concentration', e: '2 clinical studies', s: 'Verified' },
            { p: 'Complan Pro', c: 'Boosts immunity', e: 'Vitamin panel + zinc claim', s: 'Verified' },
            { p: 'Glucon-D Immunity+', c: 'Instant energy in 5 mins', e: 'Blood glucose study', s: 'In Review' },
            { p: 'Everyuth Aloe', c: 'Reduces acne in 7 days', e: 'Panel study 60 subjects', s: 'Pending' },
          ].map((c,i)=>(<TableRow key={i}><TableCell className="font-medium">{c.p}</TableCell><TableCell>{c.c}</TableCell><TableCell className="text-sm">{c.e}</TableCell><TableCell><Badge variant={c.s==='Verified'?'default':'secondary'}>{c.s}</Badge></TableCell></TableRow>))}
        </TableBody>
      </Table></CardContent></Card>
    </div>
  )
}

/* -------------------- ARTWORK (Karomi) -------------------- */
function ArtworkView() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Artwork Management</h1><p className="text-muted-foreground text-sm">Integrated with Karomi • Sync artwork versions and approvals</p></div>
        <Button variant="outline"><RefreshCw className="h-4 w-4 mr-2"/>Sync with Karomi</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { p: 'Complan Pro', v: 'v3.2', s: 'Approved' },
          { p: 'Glucon-D Orange', v: 'v1.0', s: 'In Review' },
          { p: 'Nycil XT', v: 'v2.1', s: 'Approved' },
          { p: 'Everyuth Aloe', v: 'v4.0', s: 'Rework' },
        ].map((a,i)=>(<Card key={i}><CardContent className="p-4"><div className="aspect-square bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg mb-3 flex items-center justify-center"><Palette className="h-12 w-12 text-primary/40"/></div><div className="font-medium">{a.p}</div><div className="flex justify-between items-center mt-1"><span className="text-xs text-muted-foreground">{a.v}</span><Badge variant={a.s==='Approved'?'default':a.s==='Rework'?'destructive':'secondary'} className="text-[10px]">{a.s}</Badge></div></CardContent></Card>))}
      </div>
    </div>
  )
}

/* -------------------- MASTER DATA (SAP) -------------------- */
function MasterDataView() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Master Data (SAP)</h1><p className="text-muted-foreground text-sm">Synchronized from SAP • PM, BOM, SFG codes</p></div>
        <Button variant="outline"><RefreshCw className="h-4 w-4 mr-2"/>Sync from SAP</Button>
      </div>
      <Tabs defaultValue="pm">
        <TabsList><TabsTrigger value="pm">PM Codes</TabsTrigger><TabsTrigger value="bom">BOM Codes</TabsTrigger><TabsTrigger value="sfg">SFG Codes</TabsTrigger><TabsTrigger value="pkg">Packaging BOM</TabsTrigger></TabsList>
        <TabsContent value="pm"><Card><CardContent className="p-0"><Table>
          <TableHeader><TableRow><TableHead>PM Code</TableHead><TableHead>Description</TableHead><TableHead>Category</TableHead><TableHead>UOM</TableHead><TableHead>Last Sync</TableHead></TableRow></TableHeader>
          <TableBody>
            {[
              ['PM-4521','Whey Protein Isolate 90%','Raw Material','KG','Today'],
              ['PM-4522','Cocoa Powder Alkalized','Raw Material','KG','Today'],
              ['PM-4523','Sucralose Powder','Raw Material','KG','Today'],
              ['PM-4524','Vitamin Premix ZW-A','Raw Material','KG','Today'],
              ['PM-4525','Natural Chocolate Flavor','Raw Material','L','Today'],
            ].map((r,i)=>(<TableRow key={i}><TableCell className="font-mono">{r[0]}</TableCell><TableCell>{r[1]}</TableCell><TableCell>{r[2]}</TableCell><TableCell>{r[3]}</TableCell><TableCell className="text-muted-foreground text-sm">{r[4]}</TableCell></TableRow>))}
          </TableBody>
        </Table></CardContent></Card></TabsContent>
        <TabsContent value="bom"><Card><CardContent className="p-6 text-muted-foreground">BOM Code table synced from SAP…</CardContent></Card></TabsContent>
        <TabsContent value="sfg"><Card><CardContent className="p-6 text-muted-foreground">SFG (Semi-Finished Goods) codes…</CardContent></Card></TabsContent>
        <TabsContent value="pkg"><Card><CardContent className="p-6 text-muted-foreground">Packaging BOM…</CardContent></Card></TabsContent>
      </Tabs>
    </div>
  )
}

/* -------------------- REPORTS -------------------- */
function ReportsView() {
  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold">Reports & Analytics</h1><p className="text-muted-foreground text-sm">Print & merge project artifacts • executive dashboards</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { t: 'Project Status Report', d: 'Live status of all active projects', i: BarChart3 },
          { t: 'Stability Reports', d: 'Aggregated stability data', i: TrendingUp },
          { t: 'Cost Analytics', d: 'Formula cost trends by brand', i: Calculator },
          { t: 'Regulatory Register', d: 'All regulatory filings & approvals', i: ShieldCheck },
          { t: 'Sensory Trends', d: 'Historical sensory panel data', i: TestTube2 },
          { t: 'Print & Merge', d: 'Combine formula, reports & approvals into single PDF', i: Layers },
        ].map(r => (
          <Card key={r.t} className="hover:shadow-md cursor-pointer">
            <CardContent className="p-6">
              <r.i className="h-8 w-8 text-primary mb-3"/>
              <div className="font-semibold">{r.t}</div>
              <div className="text-sm text-muted-foreground mt-1">{r.d}</div>
              <div className="flex gap-2 mt-4"><Button size="sm" variant="outline"><Eye className="h-3 w-3 mr-2"/>View</Button><Button size="sm" variant="outline"><Download className="h-3 w-3 mr-2"/>Export</Button></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

/* -------------------- ARCHIVE -------------------- */
function ArchiveView() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Archive</h1><p className="text-muted-foreground text-sm">Completed & archived projects with AI-powered advanced search</p></div>
      </div>
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1"><Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><Input placeholder="Ask AI: e.g. 'Show all chocolate flavored formulas with sensory score > 8'..." className="pl-9 h-11"/></div>
            <Button className="h-11 gap-2"><Sparkles className="h-4 w-4"/>AI Search</Button>
          </div>
        </CardContent>
      </Card>
      <Card><CardContent className="p-0"><Table>
        <TableHeader><TableRow><TableHead>Project ID</TableHead><TableHead>Name</TableHead><TableHead>Completed</TableHead><TableHead>Owner</TableHead><TableHead>Docs</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {[
            { id: 'ZW-2025-098', n: 'Nutralite Choco Spread Lite', d: 'Mar 2025', o: 'Meera I.', dc: 47 },
            { id: 'ZW-2025-085', n: 'Sugar Free Green Original', d: 'Feb 2025', o: 'Priya S.', dc: 62 },
            { id: 'ZW-2024-142', n: 'Complan Original Refresh', d: 'Dec 2024', o: 'Rahul M.', dc: 89 },
          ].map((p,i)=>(<TableRow key={i}><TableCell className="font-mono text-xs">{p.id}</TableCell><TableCell className="font-medium">{p.n}</TableCell><TableCell>{p.d}</TableCell><TableCell>{p.o}</TableCell><TableCell>{p.dc}</TableCell><TableCell><Button size="sm" variant="outline"><Eye className="h-4 w-4 mr-2"/>View</Button></TableCell></TableRow>))}
        </TableBody>
      </Table></CardContent></Card>
    </div>
  )
}

/* -------------------- ADMIN — USERS -------------------- */
function UsersAdmin() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Users</h1><p className="text-muted-foreground text-sm">Manage employees, roles, and access</p></div>
        <Button><Plus className="h-4 w-4 mr-2"/>Add User</Button>
      </div>
      <Card><CardContent className="p-0"><Table>
        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Department</TableHead><TableHead>Status</TableHead><TableHead>Last Login</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {[
            { n: 'Rahul Mehta', e: 'rahul.mehta@zyduswellness.com', r: 'Source Team', d: 'Marketing', s: 'Active', l: '2 min ago' },
            { n: 'Dr. Anjali Rao', e: 'anjali.rao@zyduswellness.com', r: 'R&D Head', d: 'R&D', s: 'Active', l: '15 min ago' },
            { n: 'Amit Verma', e: 'amit.verma@zyduswellness.com', r: 'Regulatory', d: 'Regulatory', s: 'Active', l: '1 hr ago' },
            { n: 'Priya Sharma', e: 'priya.sharma@zyduswellness.com', r: 'F&D Member', d: 'R&D', s: 'Active', l: '3 hrs ago' },
            { n: 'Rajesh Nair', e: 'rajesh.nair@zyduswellness.com', r: 'Packaging', d: 'Packaging', s: 'Inactive', l: '5 days ago' },
          ].map((u,i)=>(<TableRow key={i}><TableCell className="font-medium">{u.n}</TableCell><TableCell className="text-sm">{u.e}</TableCell><TableCell><Badge variant="outline">{u.r}</Badge></TableCell><TableCell>{u.d}</TableCell><TableCell><Badge variant={u.s==='Active'?'default':'secondary'}>{u.s}</Badge></TableCell><TableCell className="text-sm text-muted-foreground">{u.l}</TableCell><TableCell><Button size="sm" variant="ghost"><Edit className="h-4 w-4"/></Button><Button size="sm" variant="ghost"><UserCog className="h-4 w-4"/></Button></TableCell></TableRow>))}
        </TableBody>
      </Table></CardContent></Card>
    </div>
  )
}

/* -------------------- ADMIN — ROLES -------------------- */
function RolesAdmin() {
  const modules = ['Projects','PPD','Formulation','Lab Notebook','Plant Trials','Regulatory','Sensory','Costing','Claim','Artwork','Master Data','Reports','Archive','Users','Audit']
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Roles & Permissions</h1><p className="text-muted-foreground text-sm">Configure module & action-level access per role</p></div>
        <Button><Plus className="h-4 w-4 mr-2"/>Add Role</Button>
      </div>
      <Card><CardContent className="p-0"><ScrollArea className="w-full"><Table>
        <TableHeader><TableRow><TableHead className="sticky left-0 bg-white z-10">Role</TableHead>{modules.map(m=><TableHead key={m} className="text-center text-xs">{m}</TableHead>)}</TableRow></TableHeader>
        <TableBody>
          {Object.entries(ROLES).slice(0,8).map(([k,v])=>(
            <TableRow key={k}>
              <TableCell className="font-medium sticky left-0 bg-white z-10">{v.label}</TableCell>
              {modules.map(m => (
                <TableCell key={m} className="text-center"><Checkbox defaultChecked={Math.random()>0.35}/></TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table></ScrollArea></CardContent></Card>
    </div>
  )
}

/* -------------------- ADMIN — MASTERS -------------------- */
function MastersAdmin() {
  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold">Master Configuration</h1><p className="text-muted-foreground text-sm">Manage brands, project types, raw materials, dropdowns & email templates</p></div>
      <Tabs defaultValue="brands">
        <TabsList><TabsTrigger value="brands">Brands</TabsTrigger><TabsTrigger value="types">Project Types</TabsTrigger><TabsTrigger value="rm">Raw Materials</TabsTrigger><TabsTrigger value="drop">Dropdowns</TabsTrigger><TabsTrigger value="email">Email Templates</TabsTrigger></TabsList>
        <TabsContent value="brands"><Card><CardContent className="p-6"><div className="flex flex-wrap gap-2">{['Complan','Sugar Free','Nycil','Glucon-D','Everyuth','Nutralite','Fanciful','Zyduscare'].map(b=>(<Badge key={b} variant="outline" className="text-sm py-2 px-4">{b}<button className="ml-2 opacity-50 hover:opacity-100"><Trash2 className="h-3 w-3"/></button></Badge>))}<Button variant="outline" size="sm"><Plus className="h-3 w-3 mr-1"/>Add Brand</Button></div></CardContent></Card></TabsContent>
        <TabsContent value="types"><Card><CardContent className="p-6"><div className="flex flex-wrap gap-2">{['New Product','AVD','Innovation','Sustainability','Cost Reduction','Product Improvement'].map(t=>(<Badge key={t} variant="outline" className="text-sm py-2 px-4">{t}</Badge>))}</div></CardContent></Card></TabsContent>
        <TabsContent value="rm"><Card><CardContent className="p-0"><Table>
          <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>INCI Name</TableHead><TableHead>Category</TableHead><TableHead>Vendor</TableHead></TableRow></TableHeader>
          <TableBody>{[
            ['RM-001','Whey Protein Isolate','Protein','Glanbia'],['RM-002','Cocoa Powder','Flavoring','Cargill'],['RM-003','Sucralose','Sweetener','JK Sucralose'],
          ].map((r,i)=>(<TableRow key={i}><TableCell className="font-mono">{r[0]}</TableCell><TableCell>{r[1]}</TableCell><TableCell>{r[2]}</TableCell><TableCell>{r[3]}</TableCell></TableRow>))}</TableBody>
        </Table></CardContent></Card></TabsContent>
        <TabsContent value="drop"><Card><CardContent className="p-6 space-y-4">
          {['Departments','Designations','Document Types'].map(d=>(<div key={d}><Label className="text-base font-semibold">{d}</Label><div className="flex flex-wrap gap-2 mt-2">{['Option A','Option B','Option C'].map(o=><Badge key={o} variant="outline">{o}</Badge>)}<Button size="sm" variant="ghost"><Plus className="h-3 w-3"/></Button></div></div>))}
        </CardContent></Card></TabsContent>
        <TabsContent value="email"><Card><CardHeader><CardTitle>Email Templates</CardTitle><CardDescription>Dynamic placeholders: {'{project_name}'}, {'{user_name}'}, {'{status}'}, etc.</CardDescription></CardHeader><CardContent className="space-y-3">
          {['PPD Submitted','Review Assigned','Approved','Rework Requested','Task Completed'].map(t=>(<div key={t} className="flex justify-between items-center p-3 border rounded-lg"><div><div className="font-medium">{t}</div><div className="text-xs text-muted-foreground">Template configured</div></div><Button size="sm" variant="outline"><Edit className="h-4 w-4 mr-2"/>Edit</Button></div>))}
        </CardContent></Card></TabsContent>
      </Tabs>
    </div>
  )
}

/* -------------------- AUDIT -------------------- */
function AuditView() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Audit Logs</h1><p className="text-muted-foreground text-sm">Complete activity trail — every action logged</p></div>
        <Button variant="outline"><Download className="h-4 w-4 mr-2"/>Export CSV</Button>
      </div>
      <Card><CardContent className="p-0"><Table>
        <TableHeader><TableRow><TableHead>Timestamp</TableHead><TableHead>User</TableHead><TableHead>Action</TableHead><TableHead>Entity</TableHead><TableHead>IP / Machine</TableHead></TableRow></TableHeader>
        <TableBody>
          {[
            { t: '2026-06-15 14:23:11', u: 'Rahul Mehta', a: 'UPDATE', e: 'PPD ZW-2026-001 v2.1', ip: '10.0.24.15 / WKS-MKT-042' },
            { t: '2026-06-15 14:20:03', u: 'Dr. Anjali Rao', a: 'APPROVE', e: 'Formula F-04', ip: '10.0.35.11 / WKS-RD-018' },
            { t: '2026-06-15 14:18:44', u: 'Amit Verma', a: 'CREATE', e: 'Regulatory Assessment', ip: '10.0.42.22 / WKS-REG-005' },
            { t: '2026-06-15 14:15:02', u: 'System', a: 'SAP_SYNC', e: '245 records synced', ip: 'System' },
            { t: '2026-06-15 14:12:38', u: 'Rahul Mehta', a: 'LOGIN', e: 'Session started', ip: '10.0.24.15 / WKS-MKT-042' },
            { t: '2026-06-15 14:10:22', u: 'Priya Sharma', a: 'UPLOAD', e: 'lab_report_045.pdf', ip: '10.0.35.22 / WKS-RD-025' },
          ].map((l,i)=>(<TableRow key={i}><TableCell className="text-xs font-mono">{l.t}</TableCell><TableCell className="font-medium">{l.u}</TableCell><TableCell><Badge variant="outline">{l.a}</Badge></TableCell><TableCell>{l.e}</TableCell><TableCell className="text-xs font-mono text-muted-foreground">{l.ip}</TableCell></TableRow>))}
        </TableBody>
      </Table></CardContent></Card>
    </div>
  )
}
