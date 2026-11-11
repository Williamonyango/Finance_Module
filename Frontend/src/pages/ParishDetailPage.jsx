import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Building2, CircleDollarSign, UsersRound } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRecords } from '../hooks/useRecords'

const money = (value) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value)

export function ParishDetailPage() {
  const { parishId } = useParams()
  const navigate = useNavigate()
  const { records: parishes } = useRecords('parishes')
  const { records: centres } = useRecords('centres')
  const { records: groups } = useRecords('groups')
  const { records: members } = useRecords('members')
  const { records: contributions } = useRecords('contributions')
  const parish = parishes.find((item) => item.id === parishId)
  if (!parish) return <div className="empty-state detail-not-found"><h2>Parish not found</h2><p>This parish is unavailable in your current platform scope.</p><Link className="secondary-button" to="/">Return to dashboard</Link></div>
  const parishCentres = centres.filter((item) => item.parishId === parish.id)
  const parishGroups = groups.filter((item) => item.parishId === parish.id)
  const parishMembers = members.filter((item) => item.parishId === parish.id)
  const parishContributions = contributions.filter((item) => item.parishId === parish.id)
  const total = parishContributions.reduce((sum, item) => sum + item.amount, 0)
  const activate = () => { toast.success(`${parish.name} status is managed from the dashboard.`); navigate('/') }
  return <div className="detail-page"><button className="back-link" onClick={() => navigate('/')}><ArrowLeft size={16} /> Back to parishes</button><div className="detail-heading"><div><span className="eyebrow">Parish environment</span><h1>{parish.name}</h1><p>{parish.code} · {parish.location} · {parish.priest}</p></div><span className={`status-pill status-pill--${parish.status}`}>{parish.status}</span></div><section className="metric-grid detail-metrics"><Metric icon={Building2} label="Centres" value={parishCentres.length} /><Metric icon={UsersRound} label="Members" value={parishMembers.length} /><Metric icon={CircleDollarSign} label="Recorded contributions" value={money(total)} /></section><section className="panel detail-section"><div className="panel-heading"><div><span className="eyebrow">Organisational structure</span><h2>Centres and groups</h2></div><span className="detail-count">{parishGroups.length} groups</span></div><div className="detail-list">{parishCentres.map((centre) => <div className="detail-list-row" key={centre.id}><div><strong>{centre.name}</strong><span>{centre.location}</span></div><span>{parishGroups.filter((group) => group.centreId === centre.id).length} groups</span></div>)}</div></section><section className="panel detail-section"><div className="panel-heading"><div><span className="eyebrow">Financial monitoring</span><h2>Recent contributions</h2></div><span className="detail-count">{parishContributions.length} records</span></div><div className="detail-list">{parishContributions.slice(0, 5).map((contribution) => <div className="detail-list-row" key={contribution.id}><div><strong>{contribution.category.replaceAll('-', ' ')}</strong><span>{contribution.date} · {contribution.method}</span></div><b>{money(contribution.amount)}</b></div>)}</div></section><button className="secondary-button" onClick={activate}>Open administrative environment</button></div>
}

function Metric({ icon: Icon, label, value }) { return <article className="metric-card"><div className="metric-icon"><Icon size={19} /></div><div><span className="eyebrow">{label}</span><strong>{value}</strong><p>Calculated from current records</p></div></article> }
