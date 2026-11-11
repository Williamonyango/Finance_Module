import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CircleDollarSign, UsersRound } from 'lucide-react'
import { useRecords } from '../hooks/useRecords'

const money = (value) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value)

export function GroupDetailPage() {
  const { groupId } = useParams()
  const navigate = useNavigate()
  const { records: groups } = useRecords('groups')
  const { records: members } = useRecords('members')
  const { records: contributions } = useRecords('contributions')
  const group = groups.find((item) => item.id === groupId)
  if (!group) return <div className="empty-state detail-not-found"><h2>Group not found</h2><p>This group is unavailable in your current centre scope.</p><Link className="secondary-button" to="/">Return to dashboard</Link></div>
  const groupMembers = members.filter((item) => item.groupId === group.id)
  const groupContributions = contributions.filter((item) => item.groupId === group.id)
  const total = groupContributions.reduce((sum, item) => sum + item.amount, 0)
  return <div className="detail-page"><button className="back-link" onClick={() => navigate('/')}><ArrowLeft size={16} /> Back to groups</button><div className="detail-heading"><div><span className="eyebrow">Church group</span><h1>{group.name}</h1><p>Centre-scoped administration · Member and contribution overview</p></div><div className="heading-actions"><span className={`status-pill status-pill--${group.status}`}>{group.status}</span><Link className="primary-button compact-button" to="/contributions">Record contribution</Link></div></div><section className="metric-grid detail-metrics"><Metric icon={UsersRound} label="Members" value={groupMembers.length} /><Metric icon={CircleDollarSign} label="Contribution total" value={money(total)} /><Metric icon={CircleDollarSign} label="Transactions" value={groupContributions.length} /></section><section className="panel detail-section"><div className="panel-heading"><div><span className="eyebrow">Group membership</span><h2>Members</h2></div><span className="detail-count">{groupMembers.length} members</span></div><div className="detail-list">{groupMembers.map((member) => <div className="detail-list-row" key={member.id}><div><strong>{member.name}</strong><span>{member.phone}</span></div><span>{member.status}</span></div>)}</div></section><section className="panel detail-section"><div className="panel-heading"><div><span className="eyebrow">Financial monitoring</span><h2>Contribution history</h2></div><span className="detail-count">{groupContributions.length} records</span></div><div className="detail-list">{groupContributions.map((item) => <div className="detail-list-row" key={item.id}><div><strong>{item.category.replaceAll('-', ' ')}</strong><span>{item.date} · {item.method}</span></div><b>{money(item.amount)}</b></div>)}</div></section></div>
}

function Metric({ icon: Icon, label, value }) { return <article className="metric-card"><div className="metric-icon"><Icon size={19} /></div><div><span className="eyebrow">{label}</span><strong>{value}</strong><p>Calculated from current records</p></div></article> }
