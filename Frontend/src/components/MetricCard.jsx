export function MetricCard({ icon: Icon, label, value, detail }) {
  return (
    <article className="metric-card">
      {Icon && (
        <div className="metric-icon">
          <Icon size={19} />
        </div>
      )}
      <div>
        <span className="eyebrow">{label}</span>
        <strong>{value}</strong>
        {detail !== undefined && <p>{detail}</p>}
      </div>
    </article>
  );
}
