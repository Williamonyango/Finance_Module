import { useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { PaginationControls } from "./PaginationControls";
import { titleCase } from "../services/formatters";

const PAGE_SIZE = 8;

export function CentreMemberDirectory({ groups, members }) {
  const [query, setQuery] = useState("");
  const [groupId, setGroupId] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const filteredMembers = members.filter(
    (member) =>
      (groupId === "all" || member.groupId === groupId) &&
      (status === "all" || member.status === status) &&
      `${member.name} ${member.phone || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const pageCount = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE));
  const visibleMembers = filteredMembers.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  return (
    <section className="panel parish-panel" id="members">
      <div className="panel-heading parish-heading">
        <div>
          <span className="eyebrow">Centre directory</span>
          <h2>Members</h2>
          <p>View members across the groups in this centre.</p>
        </div>
        <span className="detail-count">{filteredMembers.length} members</span>
      </div>
      <div className="table-toolbar">
        <div className="search-box">
          <Search size={17} />
          <input
            aria-label="Search members by name or phone"
            placeholder="Search members by name or phone..."
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          aria-label="Filter members by group"
          value={groupId}
          onChange={(event) => {
            setGroupId(event.target.value);
            setPage(1);
          }}
        >
          <option value="all">All groups</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter members by status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Member</th>
              <th>Group</th>
              <th>Phone</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {visibleMembers.map((member) => {
              const group = groups.find((item) => item.id === member.groupId);
              return (
                <tr key={member.id}>
                  <td>
                    <Link
                      className="table-primary"
                      to={`/members/${member.id}`}
                    >
                      {member.name}
                    </Link>
                  </td>
                  <td>
                    {group ? (
                      <Link
                        className="table-primary"
                        to={`/groups/${group.id}`}
                      >
                        {group.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{member.phone || "—"}</td>
                  <td>
                    <span
                      className={`status-pill status-pill--${member.status}`}
                    >
                      {titleCase(member.status)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {visibleMembers.length === 0 && (
        <div className="empty-state">No members match these filters.</div>
      )}
      <PaginationControls
        page={page}
        pageCount={pageCount}
        total={filteredMembers.length}
        visibleCount={visibleMembers.length}
        onPage={setPage}
      />
    </section>
  );
}
