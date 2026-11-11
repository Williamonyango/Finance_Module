import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Bell, Building2, ChevronDown, CircleDollarSign, LayoutDashboard, LogOut, Menu, X } from 'lucide-react'
import { useSession } from '../context/SessionContext'
import toast from 'react-hot-toast'

const ownerNavigation = [
  { label: 'Overview', icon: LayoutDashboard, to: '/' },
  { label: 'Parishes', icon: Building2, to: '/parishes' },
]
const parishNavigation = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/' },
  { label: 'Centres', icon: Building2, to: '/centres' },
  { label: 'Contributions', icon: CircleDollarSign, to: '/contributions' },
]
const centreNavigation = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/' },
  { label: 'Groups', icon: Building2, to: '/groups' },
  { label: 'Contributions', icon: CircleDollarSign, to: '/contributions' },
]
const groupNavigation = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/' },
  { label: 'Members', icon: Building2, to: '/members' },
  { label: 'Contributions', icon: CircleDollarSign, to: '/contributions' },
]

export function AppShell() {
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const { session, signOut } = useSession()
  const navigation = session?.role === 'parish' ? parishNavigation : session?.role === 'centre' ? centreNavigation : session?.role === 'group' ? groupNavigation : ownerNavigation
  const navigate = useNavigate()
  const initials = (session?.name || 'Elias Wambui').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      toast.error(error.message || 'Unable to sign out.')
    }
  }

  return (
    <div className="app-shell">
      {isSidebarOpen && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${isSidebarOpen ? 'sidebar--open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">✦</div>
          <div>
            <strong>Parish Ledger</strong>
            <span>Finance ERP</span>
          </div>
          <button className="icon-button sidebar-close" aria-label="Close navigation" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <div className="sidebar-label">Workspace</div>
        <nav className="nav-list" aria-label="Main navigation">
          {navigation.map(({ label, icon: Icon, to }) => (
            <NavLink key={label} to={to} end className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`} onClick={() => setSidebarOpen(false)}>
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="tenant-card">
            <span className="eyebrow">Current environment</span>
            <strong>{session?.role === 'parish' ? 'Parish administration' : session?.role === 'centre' ? 'Centre administration' : session?.role === 'group' ? 'Group administration' : 'Platform administration'}</strong>
            <span>{session?.role === 'parish' ? 'St. Mary Parish' : session?.role === 'centre' ? 'Central Centre' : session?.role === 'group' ? 'St. Peter SCC' : 'All parish records'}</span>
          </div>
          <button className="sign-out-button" onClick={handleSignOut}>
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <button className="icon-button menu-button" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}>
            <Menu size={21} />
          </button>
          <div className="breadcrumb"><span>{session?.roleLabel || 'ERP Owner'}</span><ChevronDown size={15} /></div>
          <div className="topbar-actions">
            <button className="icon-button notification-button" aria-label="Notifications"><Bell size={20} /><span /></button>
            <div className="profile">
              <div className="avatar">{initials}</div>
              <div className="profile-copy"><strong>{session?.name || 'Elias Wambui'}</strong><span>{session?.role || 'ERP Owner'}</span></div>
              <ChevronDown size={16} className="profile-chevron" />
            </div>
          </div>
        </header>
        <div className="page-content"><Outlet /></div>
      </main>
    </div>
  )
}
