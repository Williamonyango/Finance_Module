import { useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { MetricCard } from "../components/MetricCard";
import { useRecords } from "../hooks/useRecords";
import { titleCase } from "../services/formatters";

export function ParishHierarchyPage({ entity }) {
  const { records: centres } = useRecords("centres");
  const { records: groups } = useRecords("groups");
  const { records: members } = useRecords("members");
  const [query, setQuery] = useState("");
  const [selectedCentreId, setSelectedCentreId] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const records = entity === "groups" ? groups : members;
  const availableGroups = groups.filter(
    (group) => !selectedCentreId || group.centreId === selectedCentreId,
  );
  const filtered = records.filter((record) => {
    const centre = centres.find((item) => item.id === record.centreId);
    const group = groups.find((item) => item.id === record.groupId);
    return (
      (!selectedCentreId || record.centreId === selectedCentreId) &&
      (!selectedGroupId || record.groupId === selectedGroupId) &&
      `${record.name} ${record.phone || ""} ${centre?.name || ""} ${group?.name || ""}`
        .toLowerCase()
        .includes(query.toLowerCase())
    );
  });

  return (
    <div className="workspace-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Parish overview</span>
          <h1>{entity === "groups" ? "Groups" : "Members"}</h1>
          <p>View groups and members across the centres in your parish.</p>
        </div>
      </div>
      <section className="metric-grid">
        <MetricCard
          label={`Total ${entity}`}
          value={records.length}
          detail="Across your parish"
        />
        {entity === "groups" && (
          <MetricCard
            label="Centres"
            value={centres.length}
            detail="In your parish"
          />
        )}
      </section>
      <section className="panel parish-panel register-panel">
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={17} />
            <input
              placeholder={`Search ${entity}...`}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          {entity === "members" && (
            <>
              <label>
                Centre
                <select
                  value={selectedCentreId}
                  onChange={(event) => {
                    setSelectedCentreId(event.target.value);
                    setSelectedGroupId("");
                  }}
                >
                  <option value="">All centres</option>
                  {centres.map((centre) => (
                    <option key={centre.id} value={centre.id}>
                      {centre.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Group
                <select
                  value={selectedGroupId}
                  onChange={(event) => setSelectedGroupId(event.target.value)}
                >
                  <option value="">All groups</option>
                  {availableGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              {entity === "groups" ? (
                <tr>
                  <th>Group</th>
                  <th>Centre</th>
                  <th>Members</th>
                  <th>Status</th>
                </tr>
              ) : (
                <tr>
                  <th>Member</th>
                  <th>Group</th>
                  <th>Centre</th>
                  <th>Phone</th>
                  <th>Status</th>
                </tr>
              )}
            </thead>
            <tbody>
              {filtered.map((record) => {
                const centre = centres.find(
                  (item) => item.id === record.centreId,
                );
                const group = groups.find((item) => item.id === record.groupId);
                return entity === "groups" ? (
                  <tr key={record.id}>
                    <td>
                      <Link
                        className="table-primary"
                        to={`/groups/${record.id}`}
                      >
                        {record.name}
                      </Link>
                    </td>
                    <td>
                      {centre ? (
                        <Link to={`/centres/${centre.id}`}>{centre.name}</Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {
                        members.filter((member) => member.groupId === record.id)
                          .length
                      }
                    </td>
                    <td>
                      <span
                        className={`status-pill status-pill--${record.status}`}
                      >
                        {titleCase(record.status)}
                      </span>
                    </td>
                  </tr>
                ) : (
                  <tr key={record.id}>
                    <td>
                      <Link
                        className="table-primary"
                        to={`/members/${record.id}`}
                      >
                        {record.name}
                      </Link>
                    </td>
                    <td>
                      {group ? (
                        <Link to={`/groups/${group.id}`}>{group.name}</Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {centre ? (
                        <Link to={`/centres/${centre.id}`}>{centre.name}</Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{record.phone || "—"}</td>
                    <td>
                      <span
                        className={`status-pill status-pill--${record.status}`}
                      >
                        {titleCase(record.status)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="empty-state">No matching records.</div>
        )}
      </section>
    </div>
  );
}
