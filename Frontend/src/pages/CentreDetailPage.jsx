import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CircleDollarSign, UsersRound } from 'lucide-react'
import { useRecords } from '../hooks/useRecords'

const money = (value) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value)

export function CentreDetailPage() {
  const { centreId } = useParams()
  const navigate = useNavigate()
  const { records: centres } = useRecords('centres')
  const { records: groups } = useRecords('groups')
  const { records: members } = useRecords('members')
  const { records: contributions } = useRecords('contributions')
  const centre = centres.find((item) => item.id === centreId)
  if (!centre) return <div className="empty-state detail-not-found"><h2>Centre not found</h2><p>This centre is unavailable in your current parish scope.</p><Link className="secondary-button" to="/">Return to dashboard</Link></div>
  const centreGroups = groups.filter((item) => item.centreId === centre.id)
  const centreMembers = members.filter((item) => item.centreId === centre.id)
  const centreContributions = contributions.filter((item) => item.centreId === centre.id)
  const total = centreContributions.reduce((sum, item) => sum + item.amount, 0)
  return <div className="detail-page"><button className="back-link" onClick={() => navigate('/')}><ArrowLeft size={16} /> Back to centres</button><div className="detail-heading"><div><span className="eyebrow">Centre environment</span><h1>{centre.name}</h1><p>{centre.location} · Parish-scoped administration</p></div><span className={`status-pill status-pill--${centre.status}`}>{centre.status}</span></div><section className="metric-grid detail-metrics"><Metric icon={UsersRound} label="Groups" value={centreGroups.length} /><Metric icon={UsersRound} label="Members" value={centreMembers.length} /><Metric icon={CircleDollarSign} label="Contribution total" value={money(total)} /></section><section className="panel detail-section"><div className="panel-heading"><div><span className="eyebrow">Centre structure</span><h2>Church groups</h2></div><span className="detail-count">{centreGroups.length} groups</span></div><div className="detail-list">{centreGroups.map((group) => <div className="detail-list-row" key={group.id}><div><strong>{group.name}</strong><span>{members.filter((member) => member.groupId === group.id).length} members</span></div><span>{contributions.filter((item) => item.groupId === group.id).length} contributions</span></div>)}</div></section><section className="panel detail-section"><div className="panel-heading"><div><span className="eyebrow">Financial monitoring</span><h2>Recent centre contributions</h2></div><span className="detail-count">{centreContributions.length} records</span></div><div className="detail-list">{centreContributions.slice(0, 5).map((item) => <div className="detail-list-row" key={item.id}><div><strong>{item.category.replaceAll('-', ' ')}</strong><span>{item.date} · {item.method}</span></div><b>{money(item.amount)}</b></div>)}</div></section></div>
}

function Metric({ icon: Icon, label, value }) { return <article className="metric-card"><div className="metric-icon"><Icon size={19} /></div><div><span className="eyebrow">{label}</span><strong>{value}</strong><p>Calculated from current records</p></div></article> }
