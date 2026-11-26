import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CircleDollarSign, UsersRound } from "lucide-react";
import { DetailNotFound } from "../components/DetailNotFound";
import { MetricCard } from "../components/MetricCard";
import { useRecords } from "../hooks/useRecords";
import { formatCurrency as money } from "../services/formatters";

export function GroupDetailPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { records: groups } = useRecords("groups");
  const { records: members } = useRecords("members");
  const { records: contributions } = useRecords("contributions");
  const { records: centres } = useRecords("centres");
  const group = groups.find((item) => item.id === groupId);
  if (!group)
    return (
      <DetailNotFound
        title="Group not found"
        description="This group is unavailable in your current centre scope."
      />
    );
  const centre = centres.find((item) => item.id === group.centreId);
  const groupMembers = members.filter((item) => item.groupId === group.id);
  const groupContributions = contributions.filter(
    (item) => item.groupId === group.id,
  );
  const total = groupContributions.reduce((sum, item) => sum + item.amount, 0);
  return (
    <div className="detail-page">
      <button
        className="back-link"
        onClick={() => navigate(centre ? `/centres/${centre.id}` : "/")}
      >
        <ArrowLeft size={16} /> Back to {centre?.name || "centres"}
      </button>
      <div className="detail-heading">
        <div>
          <span className="eyebrow">Church group</span>
          <h1>{group.name}</h1>
          <p>
            Centre:{" "}
            {centre ? (
              <Link to={`/centres/${centre.id}`}>{centre.name}</Link>
            ) : (
              "Unavailable"
            )}{" "}
            · Member and contribution overview
          </p>
        </div>
        <div className="heading-actions">
          <span className={`status-pill status-pill--${group.status}`}>
            {group.status}
          </span>
          <Link className="primary-button compact-button" to="/contributions">
            Record contribution
          </Link>
        </div>
      </div>
      <section className="metric-grid detail-metrics">
        <MetricCard
          icon={UsersRound}
          label="Members"
          value={groupMembers.length}
          detail="Calculated from current records"
        />
        <MetricCard
          icon={CircleDollarSign}
          label="Contribution total"
          value={money(total)}
          detail="Calculated from current records"
        />
        <MetricCard
          icon={CircleDollarSign}
          label="Transactions"
          value={groupContributions.length}
          detail="Calculated from current records"
        />
      </section>
      <section className="panel detail-section">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Group membership</span>
            <h2>Members</h2>
          </div>
          <span className="detail-count">{groupMembers.length} members</span>
        </div>
        <div className="detail-list">
          {groupMembers.map((member) => (
            <div className="detail-list-row" key={member.id}>
              <div>
                <Link className="table-primary" to={`/members/${member.id}`}>
                  {member.name}
                </Link>
                <span>{member.phone}</span>
              </div>
              <span>{member.status}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="panel detail-section">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Financial monitoring</span>
            <h2>Contribution history</h2>
          </div>
          <span className="detail-count">
            {groupContributions.length} records
          </span>
        </div>
        <div className="detail-list">
          {groupContributions.map((item) => (
            <div className="detail-list-row" key={item.id}>
              <div>
                <strong>{item.category.replaceAll("-", " ")}</strong>
                <span>
                  {item.date} · {item.method}
                </span>
              </div>
              <b>{money(item.amount)}</b>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
