import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CircleDollarSign, UsersRound } from 'lucide-react'
import { useRecords } from '../hooks/useRecords'

const money = (value) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value)

export function MemberDetailPage() {
  const { memberId } = useParams()
  const navigate = useNavigate()
  const { records: members } = useRecords('members')
  const { records: contributions } = useRecords('contributions')
  const member = members.find((item) => item.id === memberId)
  if (!member) return <div className="empty-state detail-not-found"><h2>Member not found</h2><p>This member is unavailable in your current group scope.</p><Link className="secondary-button" to="/">Return to dashboard</Link></div>
  const history = contributions.filter((item) => item.memberId === member.id)
  const total = history.reduce((sum, item) => sum + item.amount, 0)
  return <div className="detail-page"><button className="back-link" onClick={() => navigate('/')}><ArrowLeft size={16} /> Back to group dashboard</button><div className="detail-heading"><div><span className="eyebrow">Member contribution history</span><h1>{member.name}</h1><p>{member.phone} · Group-scoped member record</p></div><span className={`status-pill status-pill--${member.status}`}>{member.status}</span></div><section className="metric-grid detail-metrics"><Metric icon={UsersRound} label="Member status" value={member.status} /><Metric icon={CircleDollarSign} label="Total contributions" value={money(total)} /><Metric icon={CircleDollarSign} label="Transactions" value={history.length} /></section><section className="panel detail-section"><div className="panel-heading"><div><span className="eyebrow">Transaction history</span><h2>All recorded contributions</h2></div><span className="detail-count">{history.length} records</span></div><div className="detail-list">{history.map((item) => <div className="detail-list-row" key={item.id}><div><strong>{item.category.replaceAll('-', ' ')}</strong><span>{item.date} · {item.method} · {item.reference}</span></div><b>{money(item.amount)}</b></div>)}</div>{history.length === 0 && <div className="empty-state">No contributions have been recorded for this member.</div>}</section></div>
}

function Metric({ icon: Icon, label, value }) { return <article className="metric-card"><div className="metric-icon"><Icon size={19} /></div><div><span className="eyebrow">{label}</span><strong>{value}</strong><p>Calculated from current records</p></div></article> }
