import { Link } from "react-router-dom";

export function DetailNotFound({ title, description }) {
  return (
    <div className="empty-state detail-not-found">
      <h2>{title}</h2>
      <p>{description}</p>
      <Link className="secondary-button" to="/">
        Return to dashboard
      </Link>
    </div>
  );
}
