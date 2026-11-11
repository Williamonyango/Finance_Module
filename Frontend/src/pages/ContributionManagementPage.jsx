import { useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowDownUp, CalendarDays, CircleDollarSign, Download, FileText, MoreHorizontal, Plus, Printer, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSession } from '../context/SessionContext'
import { useRecords } from '../hooks/useRecords'
import { downloadContributionsCsv } from '../services/apiClient'

const PAGE_SIZE = 8
const money = (value) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value)
const titleCase = (value) => value.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

export function ContributionManagementPage() {
  const { session } = useSession()
  const { records: contributions, create, update, remove } = useRecords('contributions')
  const { records: members } = useRecords('members')
  const { records: parishes } = useRecords('parishes')
  const { records: centres } = useRecords('centres')
  const { records: groups } = useRecords('groups')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [parishId, setParishId] = useState('all')
  const [centreId, setCentreId] = useState('all')
  const [groupId, setGroupId] = useState('all')
  const [memberId, setMemberId] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [sort, setSort] = useState('date-desc')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(null)
  const [isFormOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState({ memberId: '', amount: '', category: 'tithes', date: '2026-10-26', method: 'M-Pesa', reference: '' })
  const canChooseParish = session.role === 'owner'
  const canChooseCentre = session.role === 'owner' || session.role === 'parish'
  const canChooseGroup = session.role === 'owner' || session.role === 'parish' || session.role === 'centre'
  const total = contributions.reduce((sum, item) => sum + item.amount, 0)
  const filtered = contributions.filter((item) => {
    const member = members.find((candidate) => candidate.id === item.memberId)
    const matchesQuery = `${item.date} ${item.reference} ${item.method} ${member?.name || ''}`.toLowerCase().includes(query.toLowerCase())
    return matchesQuery && (category === 'all' || item.category === category) && (parishId === 'all' || item.parishId === parishId) && (centreId === 'all' || item.centreId === centreId) && (groupId === 'all' || item.groupId === groupId) && (memberId === 'all' || item.memberId === memberId) && (!fromDate || item.date >= fromDate) && (!toDate || item.date <= toDate)
  }).sort((a, b) => sort === 'amount-desc' ? b.amount - a.amount : sort === 'amount-asc' ? a.amount - b.amount : sort === 'date-asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date))
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const summaryByCategory = ['tithes', 'sunday-offering', 'development-fund'].map((value) => ({ label: titleCase(value), amount: filtered.filter((item) => item.category === value).reduce((sum, item) => sum + item.amount, 0) }))
  const monthly = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'].map((month, index) => ({ month, amount: filtered.filter((item) => new Date(item.date).getMonth() === index + 4).reduce((sum, item) => sum + item.amount, 0) }))
  const visibleMembers = members.filter((member) => (session.role === 'owner' || member.parishId === session.parishId) && (session.role !== 'centre' || member.centreId === session.centreId) && (session.role !== 'group' || member.groupId === session.groupId))
  const resetFilters = () => { setQuery(''); setCategory('all'); setParishId('all'); setCentreId('all'); setGroupId('all'); setMemberId('all'); setFromDate(''); setToDate(''); setPage(1) }
  const openForm = (contribution) => {
    setEditing(contribution)
    setForm(contribution ? { memberId: contribution.memberId, amount: contribution.amount, category: contribution.category, date: contribution.date, method: contribution.method, reference: contribution.reference } : { memberId: visibleMembers[0]?.id || '', amount: '', category: 'tithes', date: '2026-10-26', method: 'M-Pesa', reference: '' })
    setFormOpen(true)
  }
  const submit = async (event) => {
    event.preventDefault()
    const amount = Number(form.amount)
    const member = members.find((item) => item.id === form.memberId)
    if (!member || !amount || amount <= 0 || !form.date || !form.reference) return toast.error('Complete all fields with a positive amount and reference.')
    try {
      const payload = { ...form, amount, memberId: member.id, parishId: member.parishId, centreId: member.centreId, groupId: member.groupId }
      if (editing) await update(editing.id, payload)
      else await create(payload)
      setFormOpen(false)
      toast.success(editing ? 'Contribution updated.' : 'Contribution recorded.')
    } catch (error) { toast.error(error.message) }
  }
  const deleteRecord = async (record) => {
    if (!window.confirm('Void this contribution record? This cannot be undone.')) return
    try { await remove(record.id); toast.success('Contribution voided.') } catch (error) { toast.error(error.message) }
  }
  const exportCsv = async () => {
    try {
      const blob = await downloadContributionsCsv({ fromDate, toDate, parishId, centreId, groupId, memberId, category })
      download(blob, 'contribution-register.csv', 'text/csv')
      toast.success('CSV export generated.')
    } catch (error) { toast.error(error.message || 'Unable to export CSV.') }
  }
  const printReport = () => { window.print() }

  return <div className="workspace-page contribution-page"><div className="page-heading"><div><span className="eyebrow">Contribution management</span><h1>Contribution register</h1><p>Review and maintain permitted contribution records across your current scope.</p></div><div className="heading-actions"><button className="secondary-button" onClick={printReport}><Printer size={15} /> Print report</button><button className="secondary-button" onClick={exportCsv}><Download size={15} /> Export CSV</button><button className="primary-button compact-button" onClick={() => openForm(null)}><Plus size={16} /> Record contribution</button></div></div><section className="metric-grid"><Metric icon={CircleDollarSign} label="Filtered total" value={money(filtered.reduce((sum, item) => sum + item.amount, 0))} detail={`${filtered.length} matching records`} /><Metric icon={FileText} label="All records" value={contributions.length} detail={`Total recorded ${money(total)}`} /><Metric icon={CalendarDays} label="This month" value={money(contributions.filter((item) => item.date.startsWith('2026-10')).reduce((sum, item) => sum + item.amount, 0))} detail="October 2026" /><Metric icon={ArrowDownUp} label="Categories" value={summaryByCategory.filter((item) => item.amount > 0).length} detail="With recorded activity" /></section><section className="dashboard-grid"><article className="panel chart-panel"><div className="panel-heading"><div><span className="eyebrow">Monthly trend</span><h2>Contribution activity</h2></div></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={monthly}><defs><linearGradient id="registerFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#2a9d8f" stopOpacity=".28" /><stop offset="100%" stopColor="#2a9d8f" stopOpacity="0" /></linearGradient></defs><CartesianGrid stroke="#e8eef1" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#637381' }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#637381' }} tickFormatter={(value) => `${value / 1000}k`} /><Tooltip formatter={(value) => money(value)} /><Area type="monotone" dataKey="amount" stroke="#2a9d8f" strokeWidth={3} fill="url(#registerFill)" /></AreaChart></ResponsiveContainer></div></article><article className="panel activity-panel"><div className="panel-heading"><div><span className="eyebrow">Filtered summary</span><h2>By category</h2></div></div>{summaryByCategory.map((item) => <div className="activity-item" key={item.label}><span className="activity-dot" /><div><strong>{item.label}</strong><p>Current filtered records</p></div><b>{money(item.amount)}</b></div>)}</article></section><section className="panel parish-panel register-panel"><div className="filter-grid"><div className="search-box"><Search size={17} /><input placeholder="Search member, date, method or reference..." value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} /></div><select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1) }}><option value="all">All categories</option><option value="tithes">Tithes</option><option value="sunday-offering">Sunday Offering</option><option value="development-fund">Development Fund</option></select>{canChooseParish && <select value={parishId} onChange={(event) => { setParishId(event.target.value); setPage(1) }}><option value="all">All parishes</option>{parishes.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>}{canChooseCentre && <select value={centreId} onChange={(event) => { setCentreId(event.target.value); setPage(1) }}><option value="all">All centres</option>{centres.filter((item) => parishId === 'all' || item.parishId === parishId).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>}{canChooseGroup && <select value={groupId} onChange={(event) => { setGroupId(event.target.value); setPage(1) }}><option value="all">All groups</option>{groups.filter((item) => (parishId === 'all' || item.parishId === parishId) && (centreId === 'all' || item.centreId === centreId)).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>}<select value={memberId} onChange={(event) => { setMemberId(event.target.value); setPage(1) }}><option value="all">All members</option>{members.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><label className="date-filter"><span>From</span><input type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPage(1) }} /></label><label className="date-filter"><span>To</span><input type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); setPage(1) }} /></label><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="date-desc">Newest first</option><option value="date-asc">Oldest first</option><option value="amount-desc">Highest amount</option><option value="amount-asc">Lowest amount</option></select><button className="secondary-button reset-button" onClick={resetFilters}>Reset</button></div><div className="register-heading"><div><span className="eyebrow">Permitted records</span><h2>Transaction register</h2></div><span className="filtered-total">Filtered total <strong>{money(filtered.reduce((sum, item) => sum + item.amount, 0))}</strong></span></div><div className="table-scroll"><table><thead><tr><th>Date</th><th>Member</th><th>Category</th><th>Method / Ref.</th><th>Amount</th><th aria-label="Actions" /></tr></thead><tbody>{visible.map((item) => <tr key={item.id}><td>{item.date}</td><td>{members.find((member) => member.id === item.memberId)?.name || 'Unknown'}</td><td>{titleCase(item.category)}</td><td>{item.method}<span className="table-secondary">{item.reference}</span></td><td><strong>{money(item.amount)}</strong></td><td><div className="row-actions"><button onClick={() => openForm(item)}>Edit</button>  <button title="Void contribution" onClick={() => deleteRecord(item)}><MoreHorizontal size={16} /></button></div></td></tr>)}</tbody></table></div>{visible.length === 0 && <div className="empty-state">No contributions match the selected filters.</div>}<div className="pagination"><span>Showing {visible.length} of {filtered.length}</span><div><button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>‹</button><strong>{page} / {pageCount}</strong><button disabled={page === pageCount} onClick={() => setPage((value) => value + 1)}>›</button></div></div></section>{isFormOpen && <ContributionForm form={form} setForm={setForm} members={visibleMembers} editing={editing} onSubmit={submit} onClose={() => setFormOpen(false)} />}</div>
}

function Metric({ icon: Icon, label, value, detail }) { return <article className="metric-card"><div className="metric-icon"><Icon size={19} /></div><div><span className="eyebrow">{label}</span><strong>{value}</strong><p>{detail}</p></div></article> }
function ContributionForm({ form, setForm, members, editing, onSubmit, onClose }) { return <div className="modal-backdrop"><div className="modal"><div className="modal-heading"><div><span className="eyebrow">{editing ? 'Edit record' : 'New record'}</span><h2>{editing ? 'Update contribution' : 'Record contribution'}</h2></div><button className="modal-close" onClick={onClose}>×</button></div><form className="modal-form" onSubmit={onSubmit}><label>Member<select value={form.memberId} onChange={(event) => setForm({ ...form, memberId: event.target.value })}>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label><label>Amount (KES)<input type="number" min="1" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></label><label>Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option value="tithes">Tithes</option><option value="sunday-offering">Sunday Offering</option><option value="development-fund">Development Fund</option></select></label><label>Date<input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label><label>Method<select value={form.method} onChange={(event) => setForm({ ...form, method: event.target.value })}><option>M-Pesa</option><option>Cash</option><option>Bank Transfer</option></select></label><label>Reference<input value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button compact-button" type="submit">{editing ? 'Save changes' : 'Record contribution'}</button></div></form></div></div> }
function download(content, filename, type) { const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([content], { type })); link.download = filename; link.click(); URL.revokeObjectURL(link.href) }
