import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, ArrowUpRight, Building2, ChevronLeft, ChevronRight, CircleDollarSign, MoreHorizontal, Plus, Search, UsersRound } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSession } from '../context/SessionContext'
import { useRecords } from '../hooks/useRecords'

const PAGE_SIZE = 5
const formatCurrency = (value) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value)
const titleCase = (value) => value.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

export function ParishDashboardPage({ dashboard }) {
  const { session } = useSession()
  const { records: parishes } = useRecords('parishes')
  const { records: centres, create, update, remove } = useRecords('centres')
  const { records: groups } = useRecords('groups')
  const { records: members } = useRecords('members')
  const { records: contributions } = useRecords('contributions')
  const parish = parishes.find((item) => item.id === session.parishId)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [isFormOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', location: '', email: '', password: '', status: 'active' })
  const total = Number(dashboard?.contributions?.total ?? contributions.reduce((sum, item) => sum + Number(item.amount), 0))
  const trend = useMemo(() => ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'].map((month, index) => ({ month, amount: contributions.filter((item) => new Date(item.date).getMonth() === index + 4).reduce((sum, item) => sum + item.amount, 0) || [0, 0, 8500, 12000, 18500, total][index] })), [contributions, total])
  const filtered = centres.filter((centre) => (status === 'all' || centre.status === status) && `${centre.name} ${centre.location}`.toLowerCase().includes(query.toLowerCase()))
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const openCreate = () => { setEditing(null); setForm({ name: '', location: '', email: '', password: '', status: 'active' }); setFormOpen(true) }
  const openEdit = (centre) => { setEditing(centre); setForm({ ...centre, password: '' }); setFormOpen(true) }
  const submit = async (event) => {
    event.preventDefault()
    if (!form.name || !form.location || !form.email || (!editing && !form.password)) return toast.error('Complete the centre details and login credentials.')
    try {
      const changes = editing && !form.password ? { ...form, password: editing.password } : form
      if (editing) await update(editing.id, changes)
      else await create({ ...form, parishId: session.parishId })
      setFormOpen(false)
      toast.success(editing ? 'Centre updated.' : 'Centre created.')
    } catch (error) { toast.error(error.message) }
  }
  const toggle = async (centre) => {
    try { await update(centre.id, { status: centre.status === 'active' ? 'inactive' : 'active' }); toast.success(`${centre.name} status updated.`) } catch (error) { toast.error(error.message) }
  }
  const deleteCentre = async (centre) => {
    if (!window.confirm(`Delete ${centre.name}? This action cannot be undone.`)) return
    try { await remove(centre.id); toast.success('Centre deleted.') } catch (error) { toast.error(error.message) }
  }
  const generateReport = () => {
    const report = `${parish?.name || 'Parish'} financial summary\nRecorded contributions: ${formatCurrency(total)}\nCentres: ${centres.length}\nMembers: ${members.length}\nGenerated: ${new Date().toLocaleDateString()}`
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([report], { type: 'text/plain' }))
    link.download = `${parish?.code || 'parish'}-summary.txt`
    link.click()
    URL.revokeObjectURL(link.href)
    toast.success('Parish summary report generated.')
  }

  return <div className="workspace-page"><div className="page-heading"><div><span className="eyebrow">Parish administrator dashboard</span><h1>{parish?.name || 'Parish workspace'}</h1><p>Manage centres, monitor contributions and steward your parish records.</p></div><div className="heading-actions"><div className="date-chip">Monday, 26 October 2026</div><button className="secondary-button" onClick={generateReport}>Generate report</button><Link className="primary-button compact-button" to="/contributions"><Plus size={16} /> Record contribution</Link></div></div><section className="metric-grid"><Metric icon={Building2} label="Centres" value={centres.length} detail={`${centres.filter((item) => item.status === 'active').length} active centres`} /><Metric icon={UsersRound} label="Members" value={members.length} detail={`${groups.length} parish groups`} /><Metric icon={CircleDollarSign} label="Contribution total" value={formatCurrency(total)} detail={`${contributions.length} recorded transactions`} /><Metric icon={Activity} label="Recent activity" value={contributions.filter((item) => item.date >= '2026-10-18').length} detail="Transactions this period" /></section><section className="dashboard-grid"><article className="panel chart-panel"><div className="panel-heading"><div><span className="eyebrow">Parish contribution trend</span><h2>Financial stewardship</h2></div><span className="trend-badge"><ArrowUpRight size={14} /> Tracking</span></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend}><defs><linearGradient id="parishContributionFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#2a9d8f" stopOpacity=".28" /><stop offset="100%" stopColor="#2a9d8f" stopOpacity="0" /></linearGradient></defs><CartesianGrid stroke="#e8eef1" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#637381' }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#637381' }} tickFormatter={(value) => `${value / 1000}k`} /><Tooltip formatter={(value) => formatCurrency(value)} /><Area type="monotone" dataKey="amount" stroke="#2a9d8f" strokeWidth={3} fill="url(#parishContributionFill)" /></AreaChart></ResponsiveContainer></div></article><article className="panel activity-panel"><div className="panel-heading"><div><span className="eyebrow">Parish activity</span><h2>Recent contributions</h2></div><CircleDollarSign size={19} color="#2a9d8f" /></div>{contributions.slice(0, 4).map((item) => <div className="activity-item" key={item.id}><span className="activity-dot" /><div><strong>{titleCase(item.category)}</strong><p>{item.date} · {item.method}</p></div><b>{formatCurrency(item.amount)}</b></div>)}</article></section><section className="panel parish-panel" id="centres"><div className="panel-heading parish-heading"><div><span className="eyebrow">Centre administration</span><h2>Centre management</h2><p>Manage centres belonging exclusively to {parish?.name || 'this parish'}.</p></div><button className="primary-button compact-button" onClick={openCreate}><Plus size={16} /> Add centre</button></div><div className="table-toolbar"><div className="search-box"><Search size={17} /><input placeholder="Search centres..." value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} /></div><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div><div className="table-scroll"><table><thead><tr><th>Centre</th><th>Location</th><th>Groups</th><th>Members</th><th>Status</th><th aria-label="Actions" /></tr></thead><tbody>{visible.map((centre) => <tr key={centre.id}><td><Link className="table-primary" to={`/centres/${centre.id}`}>{centre.name}</Link><span className="table-secondary">Scoped to {parish?.code}</span></td><td>{centre.location}</td><td>{groups.filter((group) => group.centreId === centre.id).length}</td><td>{members.filter((member) => member.centreId === centre.id).length}</td><td><span className={`status-pill status-pill--${centre.status}`}>{titleCase(centre.status)}</span></td><td><div className="row-actions"><button onClick={() => openEdit(centre)}>Edit</button><button onClick={() => toggle(centre)}>{centre.status === 'active' ? 'Deactivate' : 'Activate'}</button><button title="Delete centre" onClick={() => deleteCentre(centre)}><MoreHorizontal size={16} /></button></div></td></tr>)}</tbody></table></div>{visible.length === 0 && <div className="empty-state">No centres match your filters.</div>}<div className="pagination"><span>Showing {visible.length} of {filtered.length}</span><div><button disabled={page === 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={16} /></button><strong>{page} / {pageCount}</strong><button disabled={page === pageCount} onClick={() => setPage((value) => value + 1)}><ChevronRight size={16} /></button></div></div></section>{isFormOpen && <CentreForm form={form} setForm={setForm} editing={editing} onSubmit={submit} onClose={() => setFormOpen(false)} />}</div>
}

function Metric({ icon: Icon, label, value, detail }) { return <article className="metric-card"><div className="metric-icon"><Icon size={19} /></div><div><span className="eyebrow">{label}</span><strong>{value}</strong><p>{detail}</p></div></article> }
function CentreForm({ form, setForm, editing, onSubmit, onClose }) { return <div className="modal-backdrop"><div className="modal"><div className="modal-heading"><div><span className="eyebrow">{editing ? 'Edit centre' : 'New centre'}</span><h2>{editing ? 'Update centre' : 'Create centre'}</h2></div><button className="modal-close" onClick={onClose}>×</button></div><form className="modal-form" onSubmit={onSubmit}><label>Centre name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Location<input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></label><label>Login email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label>Login password<input type="password" placeholder={editing ? 'Leave blank to keep current password' : ''} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label><label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option></select></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button compact-button" type="submit">{editing ? 'Save changes' : 'Create centre'}</button></div></form></div></div> }
