'use client'

import { useState, useMemo, useEffect } from 'react'
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

/* -------------------- APP ROOT -------------------- */
export default function App() {
  const [user, setUser] = useState(null)
  const [view, setView] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  if (!user) return <Login onLogin={setUser} />
  return <Shell user={user} view={view} setView={setView} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} onLogout={() => setUser(null)} />
}

/* -------------------- LOGIN -------------------- */
function Login({ onLogin }) {
  const [email, setEmail] = useState('demo.user@zyduswellness.com')
  const [password, setPassword] = useState('••••••••')
  const [role, setRole] = useState('admin')

  const handleLogin = (e) => {
    e.preventDefault()
    if (!email || !password) return toast.error('Please enter credentials')
    onLogin({ email, name: email.split('@')[0].split('.').map(s => s[0].toUpperCase()+s.slice(1)).join(' '), role })
    toast.success(`Welcome, ${ROLES[role].label}`)
  }

  return (
    <div className="min-h-screen flex zydus-pattern">
      {/* Left brand panel */}
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
          <p className="text-lg opacity-80 max-w-md">End-to-end product lifecycle management — from PPD to plant trials, approvals, and archival — powered by AI and integrated with SAP & Karomi.</p>
          <div className="grid grid-cols-3 gap-4 pt-6">
            {[
              { l: 'Brands', v: '12+' },
              { l: 'Active Projects', v: '48' },
              { l: 'Teams', v: '14' },
            ].map(s => (
              <div key={s.l} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
                <div className="text-2xl font-bold">{s.v}</div>
                <div className="text-xs opacity-80">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 text-xs opacity-70">© 2026 Zydus Wellness Ltd. All rights reserved. Confidential & Proprietary.</div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="space-y-1 text-center">
            <div className="lg:hidden mx-auto h-12 w-12 rounded-xl bg-primary flex items-center justify-center mb-2">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <CardTitle className="text-2xl">Sign in to your account</CardTitle>
            <CardDescription>Secure access • Machine-bound • 5-min inactivity logout</CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Employee Email / ID</Label>
                <Input id="email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@zyduswellness.com" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password">Password</Label>
                  <button type="button" className="text-xs text-primary hover:underline">Forgot password?</button>
                </div>
                <Input id="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Login as (Demo Role Selector)</Label>
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
              <Button type="submit" className="w-full h-11 text-base">Sign In Securely</Button>
              <p className="text-xs text-muted-foreground text-center">Protected by Zydus IT • Access is logged & audited</p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}

/* -------------------- SHELL (Sidebar + Header + Content) -------------------- */
function Shell({ user, view, setView, sidebarOpen, setSidebarOpen, onLogout }) {
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
        <Header user={user} onLogout={onLogout} view={view} setView={setView} />
        <main className="flex-1 overflow-auto">
          <ViewRouter view={view} setView={setView} user={user} />
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

function Header({ user, onLogout, view, setView }) {
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
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-accent" />
        </Button>
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
function ViewRouter({ view, setView, user }) {
  const p = "p-6 space-y-6"
  switch (view) {
    case 'dashboard': return <div className={p}><Dashboard user={user} setView={setView} /></div>
    case 'projects': return <div className={p}><ProjectsView setView={setView} /></div>
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

/* -------------------- DASHBOARD -------------------- */
function Dashboard({ user, setView }) {
  const stats = [
    { label: 'Active Projects', value: 24, change: '+3', icon: FolderKanban, color: 'from-emerald-500 to-emerald-700' },
    { label: 'Pending Approvals', value: 7, change: '+2', icon: FileCheck2, color: 'from-orange-500 to-orange-700' },
    { label: 'In Formulation', value: 12, change: '-1', icon: FlaskConical, color: 'from-blue-500 to-blue-700' },
    { label: 'Completed (Q1)', value: 18, change: '+5', icon: CheckCircle2, color: 'from-purple-500 to-purple-700' },
  ]
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {user.name.split(' ')[0]} 👋</h1>
          <p className="text-muted-foreground">Signed in as <span className="font-medium text-foreground">{ROLES[user.role].label}</span> — here's your workspace overview.</p>
        </div>
        <Button onClick={() => setView('projects')} className="gap-2"><Plus className="h-4 w-4"/>New Project</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-3xl font-bold mt-2">{s.value}</p>
                  <p className="text-xs mt-1"><span className={s.change.startsWith('+')?'text-emerald-600':'text-red-600'}>{s.change}</span> this month</p>
                </div>
                <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center`}>
                  <s.icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div><CardTitle>My Pending Tasks</CardTitle><CardDescription>Items requiring your action</CardDescription></div>
            <Button variant="outline" size="sm">View all</Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Project</TableHead><TableHead>Task</TableHead><TableHead>Priority</TableHead><TableHead>Due</TableHead><TableHead></TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { p: 'Complan Pro Chocolate', t: 'Review PPD v2.1', pr: 'High', d: 'Today' },
                  { p: 'Sugar Free Green Stevia+', t: 'Approve Formulation', pr: 'Medium', d: 'Tomorrow' },
                  { p: 'Everyuth Aloe Face Wash', t: 'Sensory Evaluation Report', pr: 'Critical', d: 'Today' },
                  { p: 'Glucon-D Immunity+', t: 'Regulatory Assessment', pr: 'Medium', d: '2 days' },
                ].map((t,i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{t.p}</TableCell>
                    <TableCell>{t.t}</TableCell>
                    <TableCell><Badge variant={t.pr==='Critical'?'destructive':t.pr==='High'?'default':'secondary'}>{t.pr}</Badge></TableCell>
                    <TableCell className="text-muted-foreground text-sm">{t.d}</TableCell>
                    <TableCell><Button size="sm" variant="ghost">Open</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent Activity</CardTitle><CardDescription>Latest updates across projects</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {[
              { u: 'Priya S.', a: 'submitted FD for approval', p: 'Sugar Free Stevia+', t: '5m' },
              { u: 'CEO Office', a: 'approved final PPD', p: 'Everyuth Aloe', t: '25m' },
              { u: 'Rahul M.', a: 'created new project', p: 'Complan NutriGro', t: '1h' },
              { u: 'Regulatory', a: 'requested rework', p: 'Nycil XT', t: '2h' },
              { u: 'Plant Team', a: 'uploaded stability report', p: 'Glucon-D', t: '3h' },
            ].map((a,i) => (
              <div key={i} className="flex gap-3">
                <Avatar className="h-8 w-8"><AvatarFallback className="text-xs bg-primary text-white">{a.u.split(' ').map(s=>s[0]).join('')}</AvatarFallback></Avatar>
                <div className="flex-1 text-sm">
                  <div><span className="font-medium">{a.u}</span> {a.a}</div>
                  <div className="text-muted-foreground text-xs">{a.p} • {a.t} ago</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Active Projects Pipeline</CardTitle><CardDescription>Live status across all lifecycle stages</CardDescription></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {['PPD Draft','PPD Review','Formulation','Sensory/Reg','Plant Trial','Approvals'].map((s,i) => (
              <div key={s} className="p-4 rounded-lg border bg-slate-50">
                <div className="text-xs text-muted-foreground">{s}</div>
                <div className="text-2xl font-bold">{[6,4,12,8,3,7][i]}</div>
                <Progress value={[10,25,60,45,80,90][i]} className="h-1 mt-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/* -------------------- PROJECTS -------------------- */
function ProjectsView({ setView }) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [open, setOpen] = useState(false)
  const filtered = MOCK_PROJECTS.filter(p =>
    (filter==='all' || p.status===filter) &&
    (p.name.toLowerCase().includes(q.toLowerCase()) || p.id.toLowerCase().includes(q.toLowerCase()))
  )
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Projects</h1><p className="text-muted-foreground text-sm">All product development projects across brands</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4"/>Create Project</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Create New Project</DialogTitle><DialogDescription>Start a new product development project. A draft PPD will be initiated.</DialogDescription></DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2"><Label>Project Name*</Label><Input placeholder="e.g. Complan Pro Chocolate Boost" /></div>
              <div className="space-y-2"><Label>Brand*</Label><Select><SelectTrigger><SelectValue placeholder="Select brand"/></SelectTrigger><SelectContent>{['Complan','Sugar Free','Nycil','Glucon-D','Everyuth','Nutralite'].map(b=><SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Project Type*</Label><Select><SelectTrigger><SelectValue placeholder="Select type"/></SelectTrigger><SelectContent>{['New Product','AVD','Innovation','Sustainability','Cost Reduction','Product Improvement'].map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Priority</Label><Select><SelectTrigger><SelectValue placeholder="Medium"/></SelectTrigger><SelectContent>{['Low','Medium','High','Critical'].map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
              <div className="col-span-2 space-y-2"><Label>Objective / Brief</Label><Textarea rows={3} placeholder="Describe the product objective, target consumer, key benefits..." /></div>
              <div className="col-span-2 space-y-2"><Label>Target Launch Date</Label><Input type="date"/></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button><Button onClick={()=>{setOpen(false);toast.success('Project created and PPD draft initiated')}}>Create Project</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by name or ID..." className="pl-9" />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-52"><Filter className="h-4 w-4 mr-2"/><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.keys(STATUS_COLORS).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon"><Download className="h-4 w-4"/></Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Project ID</TableHead><TableHead>Name</TableHead><TableHead>Brand</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Progress</TableHead><TableHead>Owner</TableHead><TableHead>Updated</TableHead><TableHead></TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => (
                <TableRow key={p.id} className="cursor-pointer" onClick={()=>{setView('ppd');toast(`Opening ${p.name}`)}}>
                  <TableCell className="font-mono text-xs">{p.id}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell><Badge variant="outline">{p.brand}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.type}</TableCell>
                  <TableCell><span className={`text-xs px-2 py-1 rounded-md font-medium ${STATUS_COLORS[p.status]||'bg-slate-100'}`}>{p.status}</span></TableCell>
                  <TableCell><div className="flex items-center gap-2 w-32"><Progress value={p.progress} className="h-1.5"/><span className="text-xs">{p.progress}%</span></div></TableCell>
                  <TableCell className="text-sm">{p.owner}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.updated}</TableCell>
                  <TableCell><Button size="sm" variant="ghost"><ChevronRight className="h-4 w-4"/></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
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
