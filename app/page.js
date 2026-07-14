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
    case 'ppd': return <div className={p}><PPDView user={user} token={token} /></div>
    case 'formulation': return <div className={p}><FormulationView user={user} token={token} /></div>
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

const TASK_TYPES = ['General','Formulation','Regulatory','Packaging','Marketing','Lab Testing','Review','Approval','Other']

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

  // Tasks
  const [tasks, setTasks] = useState([])
  const [tasksLoading, setTasksLoading] = useState(false)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [taskTargetRole, setTaskTargetRole] = useState('')
  const [taskForm, setTaskForm] = useState({ title:'', type:'General', priority:'Medium', due_date:'', due_label:'' })
  const [creatingTask, setCreatingTask] = useState(false)

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
                        {isAdmin && (
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
function PPDView({ user, token }) {
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
          {isAdmin && (
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
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [actionTag, setActionTag]   = useState('comment')
  const [postingComment, setPostingComment] = useState(false)
  const [reviewers, setReviewers] = useState(initialPpd.reviewers || [])

  const isAdmin = user?.role === 'admin'
  const myRole  = user?.role || 'fd'

  const fetchComments = useCallback(async () => {
    try {
      const data = await apiCall(`/api/ppd/${ppd.ppd_id}/comments`, { token })
      setComments(data)
    } catch { /* ignore */ }
  }, [ppd.ppd_id, token])

  useEffect(() => { fetchComments() }, [fetchComments])

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiCall(`/api/ppd/${ppd.ppd_id}`, { method: 'PUT', token, body: editForm })
      toast.success('PPD updated — all teams notified')
      const updated = await apiCall(`/api/ppd/${ppd.ppd_id}`, { token })
      setPpd(updated)
      setEditForm(f => ({ ...f, status: updated.status }))
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
      setNewComment('')
      setActionTag('comment')
      fetchComments()
      // Refresh ppd status if rework/approve changed it
      const updated = await apiCall(`/api/ppd/${ppd.ppd_id}`, { token })
      setPpd(updated)
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
      setReviewers(updatedReviewers)
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

  // Derive workflow step status from reviewers
  const reviewedCount = reviewers.filter(r => ['Reviewed','Approved'].includes(r.status)).length
  const allReviewed   = reviewers.length > 0 && reviewedCount === reviewers.length
  const wfSteps = [
    { s: 'PPD Created',                    d: `By ${ppd.created_by} (${ROLES[ppd.created_by_role]?.label || ppd.created_by_role})`,   st: 'done' },
    { s: 'Departments Assigned',           d: `Teams: ${(ppd.teams_involved||'').split(',').filter(Boolean).map(r => ROLES[r]?.label || r).join(', ')}`, st: 'done' },
    { s: 'Functional Teams Review',        d: `${reviewedCount}/${reviewers.length} teams reviewed`,  st: ppd.status === 'Under Review' ? 'active' : reviewedCount > 0 ? 'done' : 'pending' },
    { s: 'PPD Finalization',               d: allReviewed ? 'All reviews received' : 'Waiting for consolidated feedback', st: ['Approved','Submitted','CEO Approved'].includes(ppd.status) ? 'done' : 'pending' },
    { s: 'Management Committee Approval',  d: 'Marketing Head, R&D Head, Regulatory Head, CFO',                             st: ['CEO Approved'].includes(ppd.status) ? 'done' : ppd.status === 'Approved' ? 'active' : 'pending' },
    { s: 'CEO Final Approval',             d: 'CEO Office',                                                                 st: ppd.status === 'CEO Approved' ? 'done' : 'pending' },
    { s: 'Execution Phase — Formulation',  d: 'PPD locked, formulation starts',                                            st: 'pending' },
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
        <div className="flex gap-2 shrink-0">
          {isAdmin && (
            <>
              <Button variant="outline" size="sm" onClick={() => handleSave()} disabled={saving}>
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
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="reviewers">Reviewers</TabsTrigger>
          <TabsTrigger value="comments">Comments ({comments.length})</TabsTrigger>
          <TabsTrigger value="workflow">Approval Flow</TabsTrigger>
          <TabsTrigger value="admin">Admin</TabsTrigger>
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
                {isAdmin
                  ? <Input value={editForm.product_category} onChange={e => setEditForm(f => ({...f, product_category: e.target.value}))} placeholder="e.g. Nutrition Powder" />
                  : <p className="text-sm py-2">{ppd.product_category || '—'}</p>}
              </div>
              <div className="space-y-2">
                <Label>Target Consumer</Label>
                {isAdmin
                  ? <Input value={editForm.target_consumer} onChange={e => setEditForm(f => ({...f, target_consumer: e.target.value}))} placeholder="e.g. Kids 5-15 yrs" />
                  : <p className="text-sm py-2">{ppd.target_consumer || '—'}</p>}
              </div>
              <div className="space-y-2">
                <Label>Market Segment</Label>
                {isAdmin
                  ? <Input value={editForm.market_segment} onChange={e => setEditForm(f => ({...f, market_segment: e.target.value}))} placeholder="e.g. Premium Health" />
                  : <p className="text-sm py-2">{ppd.market_segment || '—'}</p>}
              </div>
              <div className="space-y-2">
                <Label>Expected Launch</Label>
                {isAdmin
                  ? <Input value={editForm.expected_launch} onChange={e => setEditForm(f => ({...f, expected_launch: e.target.value}))} placeholder="e.g. Q4 2026" />
                  : <p className="text-sm py-2">{ppd.expected_launch || '—'}</p>}
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Objective</Label>
                {isAdmin
                  ? <Textarea rows={3} value={editForm.objective} onChange={e => setEditForm(f => ({...f, objective: e.target.value}))} placeholder="Product objective, target consumer, key goals..." />
                  : <p className="text-sm py-2 whitespace-pre-line">{ppd.objective || '—'}</p>}
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Key Benefits / Claims</Label>
                {isAdmin
                  ? <Textarea rows={3} value={editForm.key_benefits} onChange={e => setEditForm(f => ({...f, key_benefits: e.target.value}))} placeholder="• Claim 1&#10;• Claim 2" />
                  : <p className="text-sm py-2 whitespace-pre-line">{ppd.key_benefits || '—'}</p>}
              </div>
              {isAdmin && (
                <div className="col-span-2 space-y-2">
                  <Label>Status</Label>
                  <Select value={editForm.status} onValueChange={v => setEditForm(f => ({...f, status: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PPD_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
            {isAdmin && (
              <CardFooter className="border-t pt-4">
                <Button onClick={handleSave} disabled={saving} className="ml-auto">
                  {saving && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
                  Save All Changes
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        {/* ── REVIEWERS TAB ── */}
        <TabsContent value="reviewers">
          <Card>
            <CardHeader><CardTitle>Assigned Reviewers</CardTitle><CardDescription>Each functional team reviews this PPD. Their status updates are visible to everyone.</CardDescription></CardHeader>
            <CardContent className="space-y-2">
              {reviewers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No reviewers assigned yet.</p>
              ) : (
                reviewers.map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg gap-4">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{r.team_label}</div>
                      {r.head_name && <div className="text-xs text-muted-foreground">Head: {r.head_name}</div>}
                      {r.comment && <div className="text-xs text-muted-foreground mt-1 italic">"{r.comment}"</div>}
                      {r.updated_at && <div className="text-xs text-muted-foreground">{relTime(r.updated_at)}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={r.status==='Reviewed'||r.status==='Approved'?'default':r.status==='Rework'?'destructive':r.status==='In Progress'?'secondary':'outline'}>
                        {r.status}
                      </Badge>
                      {/* Team member can update their own review */}
                      {r.role === myRole && (
                        <Select value={r.status} onValueChange={v => handleReviewerUpdate(r.role, v)}>
                          <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>{REVIEWER_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      )}
                      {/* Admin can update any reviewer */}
                      {isAdmin && r.role !== myRole && (
                        <Select value={r.status} onValueChange={v => handleReviewerUpdate(r.role, v)}>
                          <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>{REVIEWER_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                ))
              )}
              {isAdmin && (
                <div className="pt-2 text-xs text-muted-foreground">
                  Reviewer list is auto-seeded from teams assigned to the project. Admin can manage team assignments on the project.
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

function FormulationView({ user, token }) {
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

  const canEdit = ['admin','fd','rd_head'].includes(user?.role)
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
                <span className={`text-xs px-2 py-1 rounded-md font-medium whitespace-nowrap ${FORMULA_STATUS_COLORS[selected.status]||'bg-slate-100'}`}>{selected.status}</span>
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
