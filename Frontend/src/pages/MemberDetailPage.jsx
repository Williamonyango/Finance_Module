import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CircleDollarSign, UsersRound } from "lucide-react";
import { DetailNotFound } from "../components/DetailNotFound";
import { MetricCard } from "../components/MetricCard";
import { useRecords } from "../hooks/useRecords";
import { formatCurrency as money } from "../services/formatters";

export function MemberDetailPage() {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const { records: members } = useRecords("members");
  const { records: contributions } = useRecords("contributions");
  const { records: groups } = useRecords("groups");
  const { records: centres } = useRecords("centres");
  const member = members.find((item) => item.id === memberId);
  if (!member)
    return (
      <DetailNotFound
        title="Member not found"
        description="This member is unavailable in your current scope."
      />
    );
  const group = groups.find((item) => item.id === member.groupId);
  const centre = centres.find((item) => item.id === member.centreId);
  const history = contributions.filter((item) => item.memberId === member.id);
  const total = history.reduce((sum, item) => sum + item.amount, 0);
  return (
    <div className="detail-page">
      <button
        className="back-link"
        onClick={() => navigate(group ? `/groups/${group.id}` : "/")}
      >
        <ArrowLeft size={16} /> Back to {group?.name || "group"}
      </button>
      <div className="detail-heading">
        <div>
          <span className="eyebrow">Member contribution history</span>
          <h1>{member.name}</h1>
          <p>
            {member.phone} · Group:{" "}
            {group ? (
              <Link to={`/groups/${group.id}`}>{group.name}</Link>
            ) : (
              "Unavailable"
            )}{" "}
            · Centre:{" "}
            {centre ? (
              <Link to={`/centres/${centre.id}`}>{centre.name}</Link>
            ) : (
              "Unavailable"
            )}
          </p>
        </div>
        <span className={`status-pill status-pill--${member.status}`}>
          {member.status}
        </span>
      </div>
      <section className="metric-grid detail-metrics">
        <MetricCard
          icon={UsersRound}
          label="Member status"
          value={member.status}
          detail="Calculated from current records"
        />
        <MetricCard
          icon={CircleDollarSign}
          label="Total contributions"
          value={money(total)}
          detail="Calculated from current records"
        />
        <MetricCard
          icon={CircleDollarSign}
          label="Transactions"
          value={history.length}
          detail="Calculated from current records"
        />
      </section>
      <section className="panel detail-section">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Transaction history</span>
            <h2>All recorded contributions</h2>
          </div>
          <span className="detail-count">{history.length} records</span>
        </div>
        <div className="detail-list">
          {history.map((item) => (
            <div className="detail-list-row" key={item.id}>
              <div>
                <strong>{item.category.replaceAll("-", " ")}</strong>
                <span>
                  {item.date} · {item.method} · {item.reference}
                </span>
              </div>
              <b>{money(item.amount)}</b>
            </div>
          ))}
        </div>
        {history.length === 0 && (
          <div className="empty-state">
            No contributions have been recorded for this member.
          </div>
        )}
      </section>
    </div>
  );
}
