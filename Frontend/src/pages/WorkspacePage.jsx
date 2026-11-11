import { useState } from 'react'
import { ChevronLeft, ChevronRight, Building2, Plus, Search, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRecords } from '../hooks/useRecords'
import { useSession } from '../context/SessionContext'
import { useDashboard } from '../hooks/useDashboard'
import { ParishDashboardPage } from './ParishDashboardPage'
import { CentreDashboardPage } from './CentreDashboardPage'
import { GroupDashboardPage } from './GroupDashboardPage'

const PAGE_SIZE = 5
const titleCase = (value) => value.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

export function WorkspacePage() {
  const { session } = useSession()
  const { dashboard } = useDashboard()
  if (session?.role === 'parish') return <ParishDashboardPage dashboard={dashboard} />
  if (session?.role === 'centre') return <CentreDashboardPage dashboard={dashboard} />
  if (session?.role === 'group') return <GroupDashboardPage dashboard={dashboard} />
  return <OwnerWorkspacePage dashboard={dashboard} />
}

function OwnerWorkspacePage({ dashboard }) {
  const { records: parishes, create, update, remove } = useRecords('parishes')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [isFormOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', code: '', location: '', priest: '', email: '', password: '', status: 'active' })
  const filteredParishes = parishes.filter((parish) => (status === 'all' || parish.status === status) && `${parish.name} ${parish.code} ${parish.location}`.toLowerCase().includes(query.toLowerCase()))
  const pageCount = Math.max(1, Math.ceil(filteredParishes.length / PAGE_SIZE))
  const visibleParishes = filteredParishes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', code: '', location: '', priest: '', email: '', password: '', status: 'active' })
    setFormOpen(true)
  }
  const openEdit = (parish) => { setEditing(parish); setForm({ ...parish, password: '' }); setFormOpen(true) }
  const submitParish = async (event) => {
    event.preventDefault()
    if (!form.name || !form.code || !form.location || !form.priest || !form.email || (!editing && !form.password)) return toast.error('Complete all parish fields and login credentials.')
    try {
      const changes = editing && !form.password ? { ...form, password: editing.password } : form
      if (editing) await update(editing.id, changes)
      else await create(form)
      setFormOpen(false)
      toast.success(editing ? 'Parish updated.' : 'Parish created.')
    } catch (error) { toast.error(error.message) }
  }
  const toggleStatus = async (parish) => {
    try { await update(parish.id, { status: parish.status === 'active' ? 'inactive' : 'active' }); toast.success(`${parish.name} is now ${parish.status === 'active' ? 'inactive' : 'active'}.`) } catch (error) { toast.error(error.message) }
  }
  const deleteParish = async (parish) => {
    if (!window.confirm(`Delete ${parish.name}? This action cannot be undone.`)) return
    try { await remove(parish.id); toast.success('Parish deleted.') } catch (error) { toast.error(error.message) }
  }

  return (
    <div className="workspace-page">
      <div className="page-heading"><div><span className="eyebrow">ERP owner dashboard</span><h1>Good afternoon, Elias.</h1><p>Manage parish environments from one place.</p></div></div>
      <section className="metric-grid">
        <Metric label="Registered parishes" value={dashboard?.counts?.parishes ?? parishes.length} detail={`${dashboard?.counts?.parishes ?? parishes.filter((item) => item.status === 'active').length} active environments`} />
      </section>
      <section className="panel parish-panel" id="parishes"><div className="panel-heading parish-heading"><div><span className="eyebrow">Platform administration</span><h2>Parish management</h2><p>Manage independent parish environments and their current status.</p></div><button className="primary-button compact-button" onClick={openCreate}><Plus size={16} /> Add parish</button></div><div className="table-toolbar"><div className="search-box"><Search size={17} /><input placeholder="Search parishes..." value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} /></div><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div><div className="table-scroll"><table><thead><tr><th>Parish</th><th>Location</th><th>Priest</th><th>Status</th><th aria-label="Actions" /></tr></thead><tbody>{visibleParishes.map((parish) => <tr key={parish.id}><td><strong className="table-primary">{parish.name}</strong><span className="table-secondary">{parish.code}</span></td><td>{parish.location}</td><td>{parish.priest}</td><td><span className={`status-pill status-pill--${parish.status}`}>{titleCase(parish.status)}</span></td><td><div className="row-actions"><button title="Edit parish" onClick={() => openEdit(parish)}>Edit</button><button title="Toggle parish status" onClick={() => toggleStatus(parish)}>{parish.status === 'active' ? 'Suspend' : 'Activate'}</button>            <button className="destructive-action" title="Delete parish" aria-label="Delete parish" onClick={() => deleteParish(parish)}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div>{visibleParishes.length === 0 && <div className="empty-state">No parishes match your filters.</div>}<div className="pagination"><span>Showing {visibleParishes.length} of {filteredParishes.length}</span><div><button disabled={page === 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={16} /></button><strong>{page} / {pageCount}</strong><button disabled={page === pageCount} onClick={() => setPage((value) => value + 1)}><ChevronRight size={16} /></button></div></div></section>
      {isFormOpen && <ParishForm form={form} setForm={setForm} editing={editing} onSubmit={submitParish} onClose={() => setFormOpen(false)} />}
    </div>
  )
}

function Metric({ label, value, detail }) { return <article className="metric-card"><div className="metric-icon"><Building2 size={19} /></div><div><span className="eyebrow">{label}</span><strong>{value}</strong><p>{detail}</p></div></article> }
function ParishForm({ form, setForm, editing, onSubmit, onClose }) { return <div className="modal-backdrop"><div className="modal"><div className="modal-heading"><div><span className="eyebrow">{editing ? 'Edit environment' : 'New environment'}</span><h2>{editing ? 'Update parish' : 'Create parish'}</h2></div><button className="modal-close" onClick={onClose}>×</button></div><form className="modal-form" onSubmit={onSubmit}><label>Parish name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Parish code<input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} disabled={Boolean(editing)} /></label><label>Location<input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></label><label>Parish priest<input value={form.priest} onChange={(event) => setForm({ ...form, priest: event.target.value })} /></label><label>Login email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label>Login password<input type="password" placeholder={editing ? 'Leave blank to keep current password' : ''} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label><label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option></select></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button compact-button" type="submit">{editing ? 'Save changes' : 'Create parish'}</button></div></form></div></div> }
