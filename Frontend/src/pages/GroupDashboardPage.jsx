import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, ArrowUpRight, ChevronLeft, ChevronRight, CircleDollarSign, MoreHorizontal, Plus, Search, UsersRound } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSession } from '../context/SessionContext'
import { useRecords } from '../hooks/useRecords'

const PAGE_SIZE = 5
const money = (value) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value)
const titleCase = (value) => value.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

export function GroupDashboardPage({ dashboard }) {
  const { session } = useSession()
  const { records: groups } = useRecords('groups')
  const { records: members, create: createMember, update: updateMember, remove: removeMember } = useRecords('members')
  const { records: contributions, create: createContribution, update: updateContribution, remove: removeContribution } = useRecords('contributions')
  const group = groups.find((item) => item.id === session.groupId)
  const [memberQuery, setMemberQuery] = useState('')
  const [memberStatus, setMemberStatus] = useState('all')
  const [contributionQuery, setContributionQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [memberPage, setMemberPage] = useState(1)
  const [contributionPage, setContributionPage] = useState(1)
  const [modal, setModal] = useState(null)
  const [editing, setEditing] = useState(null)
  const [memberForm, setMemberForm] = useState({ name: '', phone: '', status: 'active' })
  const [contributionForm, setContributionForm] = useState({ memberId: '', amount: '', category: 'tithes', date: '2026-10-26', method: 'M-Pesa', reference: '' })
  const total = Number(dashboard?.contributions?.total ?? contributions.reduce((sum, item) => sum + Number(item.amount), 0))
  const trend = useMemo(() => ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'].map((month, index) => ({ month, amount: contributions.filter((item) => new Date(item.date).getMonth() === index + 4).reduce((sum, item) => sum + item.amount, 0) || [0, 0, 8500, 12000, 18500, total][index] })), [contributions, total])
  const filteredMembers = members.filter((member) => (memberStatus === 'all' || member.status === memberStatus) && member.name.toLowerCase().includes(memberQuery.toLowerCase()))
  const filteredContributions = contributions.filter((item) => (category === 'all' || item.category === category) && `${item.date} ${item.reference} ${item.method}`.toLowerCase().includes(contributionQuery.toLowerCase()))
  const memberCount = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE))
  const contributionCount = Math.max(1, Math.ceil(filteredContributions.length / PAGE_SIZE))
  const visibleMembers = filteredMembers.slice((memberPage - 1) * PAGE_SIZE, memberPage * PAGE_SIZE)
  const visibleContributions = filteredContributions.slice((contributionPage - 1) * PAGE_SIZE, contributionPage * PAGE_SIZE)
  const memberName = (id) => members.find((member) => member.id === id)?.name || 'Unknown member'

  const openMember = (member) => { setEditing(member); setMemberForm(member ? { name: member.name, phone: member.phone, status: member.status } : { name: '', phone: '', status: 'active' }); setModal('member') }
  const submitMember = async (event) => {
    event.preventDefault()
    if (!memberForm.name || !memberForm.phone) return toast.error('Complete the member name and phone number.')
    try {
      if (editing) await updateMember(editing.id, memberForm)
      else await createMember({ ...memberForm, parishId: session.parishId, centreId: session.centreId, groupId: session.groupId })
      setModal(null)
      toast.success(editing ? 'Member updated.' : 'Member added.')
    } catch (error) { toast.error(error.message) }
  }
  const deleteMember = async (member) => {
    if (!window.confirm(`Delete ${member.name}? This action cannot be undone.`)) return
    try { await removeMember(member.id); toast.success('Member deleted.') } catch (error) { toast.error(error.message) }
  }
  const openContribution = (contribution) => {
    setEditing(contribution)
    setContributionForm(contribution ? { memberId: contribution.memberId, amount: contribution.amount, category: contribution.category, date: contribution.date, method: contribution.method, reference: contribution.reference } : { memberId: members[0]?.id || '', amount: '', category: 'tithes', date: '2026-10-26', method: 'M-Pesa', reference: '' })
    setModal('contribution')
  }
  const submitContribution = async (event) => {
    event.preventDefault()
    const amount = Number(contributionForm.amount)
    const selectedMember = members.find((member) => member.id === contributionForm.memberId)
    if (!selectedMember || !amount || amount <= 0 || !contributionForm.date || !contributionForm.reference) return toast.error('Complete all contribution fields with a positive amount.')
    try {
      const payload = { ...contributionForm, amount, parishId: session.parishId, centreId: session.centreId, groupId: session.groupId, memberId: selectedMember.id }
      if (editing) await updateContribution(editing.id, payload)
      else await createContribution(payload)
      setModal(null)
      toast.success(editing ? 'Contribution updated.' : 'Contribution recorded.')
    } catch (error) { toast.error(error.message) }
  }
  const deleteContribution = async (contribution) => {
    if (!window.confirm('Delete this contribution record?')) return
    try { await removeContribution(contribution.id); toast.success('Contribution voided.') } catch (error) { toast.error(error.message) }
  }
  const generateReport = () => {
    const report = `${group?.name || 'Group'} financial summary\nRecorded contributions: ${money(total)}\nMembers: ${members.length}\nTransactions: ${contributions.length}\nGenerated: ${new Date().toLocaleDateString()}`
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([report], { type: 'text/plain' }))
    link.download = `${group?.id || 'group'}-summary.txt`
    link.click()
    URL.revokeObjectURL(link.href)
    toast.success('Group summary report generated.')
  }

  return <div className="workspace-page"><div className="page-heading"><div><span className="eyebrow">Group treasurer dashboard</span><h1>{group?.name || 'Group workspace'}</h1><p>Manage members, record contributions and review your group history.</p></div><div className="heading-actions"><div className="date-chip">Monday, 26 October 2026</div><button className="secondary-button" onClick={generateReport}>Generate report</button></div></div><section className="metric-grid"><Metric icon={UsersRound} label="Members" value={members.length} detail={`${members.filter((item) => item.status === 'active').length} active members`} /><Metric icon={CircleDollarSign} label="Contributions" value={money(total)} detail={`${contributions.length} recorded transactions`} /><Metric icon={Activity} label="Recent activity" value={contributions.filter((item) => item.date >= '2026-10-18').length} detail="Transactions this period" /></section><section className="dashboard-grid"><article className="panel chart-panel"><div className="panel-heading"><div><span className="eyebrow">Group contribution trend</span><h2>Stewardship overview</h2></div><span className="trend-badge"><ArrowUpRight size={14} /> Tracking</span></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend}><defs><linearGradient id="groupContributionFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#2a9d8f" stopOpacity=".28" /><stop offset="100%" stopColor="#2a9d8f" stopOpacity="0" /></linearGradient></defs><CartesianGrid stroke="#e8eef1" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#637381' }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#637381' }} tickFormatter={(value) => `${value / 1000}k`} /><Tooltip formatter={(value) => money(value)} /><Area type="monotone" dataKey="amount" stroke="#2a9d8f" strokeWidth={3} fill="url(#groupContributionFill)" /></AreaChart></ResponsiveContainer></div></article><article className="panel activity-panel"><div className="panel-heading"><div><span className="eyebrow">Group activity</span><h2>Recent transactions</h2></div><CircleDollarSign size={19} color="#2a9d8f" /></div>{contributions.slice(0, 4).map((item) => <div className="activity-item" key={item.id}><span className="activity-dot" /><div><strong>{memberName(item.memberId)}</strong><p>{item.date} · {titleCase(item.category)}</p></div><b>{money(item.amount)}</b></div>)}</article></section><section className="panel parish-panel" id="members"><div className="panel-heading parish-heading"><div><span className="eyebrow">Member management</span><h2>Group members</h2><p>Maintain member details within {group?.name || 'this group'}.</p></div><button className="primary-button compact-button" onClick={() => openMember(null)}><Plus size={16} /> Add member</button></div><div className="table-toolbar"><div className="search-box"><Search size={17} /><input placeholder="Search members..." value={memberQuery} onChange={(event) => { setMemberQuery(event.target.value); setMemberPage(1) }} /></div><select value={memberStatus} onChange={(event) => { setMemberStatus(event.target.value); setMemberPage(1) }}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div><div className="table-scroll"><table><thead><tr><th>Member</th><th>Phone</th><th>Contributions</th><th>Status</th><th aria-label="Actions" /></tr></thead><tbody>{visibleMembers.map((member) => <tr key={member.id}><td><Link className="table-primary" to={`/members/${member.id}`}>{member.name}</Link><span className="table-secondary">Member history</span></td><td>{member.phone}</td><td>{money(contributions.filter((item) => item.memberId === member.id).reduce((sum, item) => sum + item.amount, 0))}</td><td><span className={`status-pill status-pill--${member.status}`}>{titleCase(member.status)}</span></td><td><div className="row-actions"><button onClick={() => openMember(member)}>Edit</button><button onClick={() => { try { updateMember(member.id, { status: member.status === 'active' ? 'inactive' : 'active' }); toast.success('Member status updated.') } catch (error) { toast.error(error.message) } }}>{member.status === 'active' ? 'Deactivate' : 'Activate'}</button><button title="Delete member" onClick={() => deleteMember(member)}><MoreHorizontal size={16} /></button></div></td></tr>)}</tbody></table></div>{visibleMembers.length === 0 && <div className="empty-state">No members match your filters.</div>}<Pagination page={memberPage} pageCount={memberCount} total={filteredMembers.length} onPage={setMemberPage} /></section><section className="panel parish-panel" id="contributions"><div className="panel-heading parish-heading"><div><span className="eyebrow">Contribution records</span><h2>Transaction history</h2><p>Review and maintain the group’s recorded contributions.</p></div><button className="primary-button compact-button" onClick={() => openContribution(null)}><Plus size={16} /> Record contribution</button></div><div className="table-toolbar"><div className="search-box"><Search size={17} /><input placeholder="Search date, method or reference..." value={contributionQuery} onChange={(event) => { setContributionQuery(event.target.value); setContributionPage(1) }} /></div><select value={category} onChange={(event) => { setCategory(event.target.value); setContributionPage(1) }}><option value="all">All categories</option><option value="tithes">Tithes</option><option value="sunday-offering">Sunday Offering</option><option value="development-fund">Development Fund</option></select></div><div className="table-scroll"><table><thead><tr><th>Date</th><th>Member</th><th>Category</th><th>Method</th><th>Amount</th><th aria-label="Actions" /></tr></thead><tbody>{visibleContributions.map((item) => <tr key={item.id}><td>{item.date}</td><td>{memberName(item.memberId)}</td><td>{titleCase(item.category)}</td><td>{item.method}</td><td><strong>{money(item.amount)}</strong></td><td><div className="row-actions"><button onClick={() => openContribution(item)}>Edit</button><button title="Delete contribution" onClick={() => deleteContribution(item)}><MoreHorizontal size={16} /></button></div></td></tr>)}</tbody></table></div>{visibleContributions.length === 0 && <div className="empty-state">No contributions match your filters.</div>}<Pagination page={contributionPage} pageCount={contributionCount} total={filteredContributions.length} onPage={setContributionPage} /></section>{modal === 'member' && <MemberForm form={memberForm} setForm={setMemberForm} editing={editing} onSubmit={submitMember} onClose={() => setModal(null)} />}{modal === 'contribution' && <ContributionForm form={contributionForm} setForm={setContributionForm} members={members} editing={editing} onSubmit={submitContribution} onClose={() => setModal(null)} />}</div>
}

function Metric({ icon: Icon, label, value, detail }) { return <article className="metric-card"><div className="metric-icon"><Icon size={19} /></div><div><span className="eyebrow">{label}</span><strong>{value}</strong><p>{detail}</p></div></article> }
function Pagination({ page, pageCount, total, onPage }) { return <div className="pagination"><span>Showing {total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span><div><button disabled={page === 1} onClick={() => onPage((value) => value - 1)}><ChevronLeft size={16} /></button><strong>{page} / {pageCount}</strong><button disabled={page === pageCount} onClick={() => onPage((value) => value + 1)}><ChevronRight size={16} /></button></div></div> }
function MemberForm({ form, setForm, editing, onSubmit, onClose }) { return <div className="modal-backdrop"><div className="modal"><div className="modal-heading"><div><span className="eyebrow">{editing ? 'Edit member' : 'New member'}</span><h2>{editing ? 'Update member' : 'Add member'}</h2></div><button className="modal-close" onClick={onClose}>×</button></div><form className="modal-form" onSubmit={onSubmit}><label>Full name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Phone number<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label><label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option></select></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button compact-button" type="submit">{editing ? 'Save changes' : 'Add member'}</button></div></form></div></div> }
function ContributionForm({ form, setForm, members, editing, onSubmit, onClose }) { return <div className="modal-backdrop"><div className="modal"><div className="modal-heading"><div><span className="eyebrow">{editing ? 'Edit contribution' : 'New contribution'}</span><h2>{editing ? 'Update contribution' : 'Record contribution'}</h2></div><button className="modal-close" onClick={onClose}>×</button></div><form className="modal-form" onSubmit={onSubmit}><label>Member<select value={form.memberId} onChange={(event) => setForm({ ...form, memberId: event.target.value })}>{members.map((member) => <option value={member.id} key={member.id}>{member.name}</option>)}</select></label><label>Amount (KES)<input type="number" min="1" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></label><label>Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option value="tithes">Tithes</option><option value="sunday-offering">Sunday Offering</option><option value="development-fund">Development Fund</option></select></label><label>Date<input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label><label>Method<select value={form.method} onChange={(event) => setForm({ ...form, method: event.target.value })}><option>M-Pesa</option><option>Cash</option><option>Bank Transfer</option></select></label><label>Reference<input value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button compact-button" type="submit">{editing ? 'Save changes' : 'Record contribution'}</button></div></form></div></div> }
