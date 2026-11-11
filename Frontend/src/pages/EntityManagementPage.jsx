import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSession } from '../context/SessionContext'
import { useRecords } from '../hooks/useRecords'

const config = {
  parishes: { title: 'Parishes', eyebrow: 'Platform administration', description: 'Manage independent parish environments.', singular: 'parish', fields: ['name', 'code', 'location', 'priest', 'email', 'password', 'status'], defaults: { name: '', code: '', location: '', priest: '', email: '', password: '', status: 'active' } },
  centres: { title: 'Centres', eyebrow: 'Parish administration', description: 'Manage centres belonging to your parish.', singular: 'centre', fields: ['name', 'location', 'email', 'password', 'status'], defaults: { name: '', location: '', email: '', password: '', status: 'active' } },
  groups: { title: 'Groups', eyebrow: 'Centre administration', description: 'Manage church groups belonging to your centre.', singular: 'group', fields: ['name', 'email', 'password', 'status'], defaults: { name: '', email: '', password: '', status: 'active' } },
  members: { title: 'Members', eyebrow: 'Group administration', description: 'Manage members belonging to your group.', singular: 'member', fields: ['name', 'phone', 'status'], defaults: { name: '', phone: '', status: 'active' } },
}

const titleCase = (value) => value.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

export function EntityManagementPage({ entity }) {
  const { session } = useSession()
  const definition = config[entity]
  const { records, create, update, remove } = useRecords(entity)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(definition.defaults)
  const [isFormOpen, setFormOpen] = useState(false)
  const filtered = records.filter((item) => (status === 'all' || item.status === status) && Object.values(item).join(' ').toLowerCase().includes(query.toLowerCase()))

  const openForm = (record) => {
    setEditing(record)
    setForm(record ? Object.fromEntries(definition.fields.map((field) => [field, field === 'password' ? '' : record[field] || ''])) : { ...definition.defaults })
    setFormOpen(true)
  }
  const submit = async (event) => {
    event.preventDefault()
    if (!form.name || (['parishes', 'centres', 'groups'].includes(entity) && (!form.email || (!editing && !form.password))) || (entity === 'parishes' && (!form.code || !form.location || !form.priest)) || (entity === 'centres' && !form.location) || (entity === 'members' && !form.phone)) return toast.error(`Complete the ${definition.singular} details.`)
    try {
      const hierarchy = entity === 'centres' ? { parishId: session.parishId } : entity === 'groups' ? { parishId: session.parishId, centreId: session.centreId } : entity === 'members' ? { parishId: session.parishId, centreId: session.centreId, groupId: session.groupId } : {}
      const changes = editing && !form.password ? { ...form, password: editing.password } : form
      if (editing) await update(editing.id, changes)
      else await create({ ...form, ...hierarchy })
      setFormOpen(false)
      toast.success(`${definition.singular} ${editing ? 'updated' : 'created'}.`)
    } catch (error) { toast.error(error.message) }
  }
  const deleteRecord = async (record) => {
    if (!window.confirm(`Delete ${record.name}? This action cannot be undone.`)) return
    try { await remove(record.id); toast.success(`${definition.singular} deleted.`) } catch (error) { toast.error(error.message) }
  }

  return <div className="workspace-page"><div className="page-heading"><div><span className="eyebrow">{definition.eyebrow}</span><h1>{definition.title}</h1><p>{definition.description}</p></div><button className="primary-button compact-button" onClick={() => openForm(null)}><Plus size={16} /> Add {definition.singular}</button></div><section className="metric-grid"><Metric label={`Total ${definition.title.toLowerCase()}`} value={records.length} detail={`${records.filter((item) => item.status === 'active').length} active`} /><Metric label="Filtered records" value={filtered.length} detail="Matching your search" /></section><section className="panel parish-panel register-panel"><div className="table-toolbar"><div className="search-box"><Search size={17} /><input placeholder={`Search ${definition.title.toLowerCase()}...`} value={query} onChange={(event) => setQuery(event.target.value)} /></div><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option>{entity === 'parishes' && <option value="suspended">Suspended</option>}</select></div><div className="table-scroll"><table><thead><tr><th>Name</th>{entity === 'parishes' && <><th>Code</th><th>Location</th><th>Priest</th></>}{entity === 'centres' && <th>Location</th>}{entity === 'members' && <th>Phone</th>}<th>Status</th><th aria-label="Actions" /></tr></thead><tbody>{filtered.map((record) => <tr key={record.id}><td><Link className="table-primary" to={`/${entity}/${record.id}`}>{record.name}</Link></td>{entity === 'parishes' && <><td>{record.code}</td><td>{record.location}</td><td>{record.priest}</td></>}{entity === 'centres' && <td>{record.location}</td>}{entity === 'members' && <td>{record.phone}</td>}<td><span className={`status-pill status-pill--${record.status}`}>{titleCase(record.status)}</span></td><td><div className="row-actions"><button onClick={() => openForm(record)}>Edit</button>    <button className="destructive-action" onClick={() => deleteRecord(record)} title={`Delete ${definition.singular}`} aria-label={`Delete ${definition.singular}`}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div>{filtered.length === 0 && <div className="empty-state">No matching records.</div>}</section>{isFormOpen && <EntityForm definition={definition} entity={entity} form={form} setForm={setForm} editing={editing} onSubmit={submit} onClose={() => setFormOpen(false)} />}</div>
}

function Metric({ label, value, detail }) { return <article className="metric-card"><div className="metric-icon"><Plus size={19} /></div><div><span className="eyebrow">{label}</span><strong>{value}</strong><p>{detail}</p></div></article> }
function EntityForm({ definition, entity, form, setForm, editing, onSubmit, onClose }) {
  return <div className="modal-backdrop"><div className="modal"><div className="modal-heading"><div><span className="eyebrow">{editing ? `Edit ${definition.singular}` : `New ${definition.singular}`}</span><h2>{editing ? `Update ${definition.singular}` : `Create ${definition.singular}`}</h2></div><button className="modal-close" onClick={onClose}>×</button></div><form className="modal-form" onSubmit={onSubmit}>{definition.fields.map((field) => <label key={field}>{titleCase(field)}{field === 'status' ? <select value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option>{entity === 'parishes' && <option value="suspended">Suspended</option>}</select> : <input type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'} value={form[field]} placeholder={field === 'password' && editing ? 'Leave blank to keep current password' : ''} onChange={(event) => setForm({ ...form, [field]: event.target.value })} disabled={field === 'code' && Boolean(editing)} />}</label>)}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button compact-button" type="submit">{editing ? 'Save changes' : `Create ${definition.singular}`}</button></div></form></div></div>
}
