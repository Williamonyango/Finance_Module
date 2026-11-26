import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowUpRight,
  CircleDollarSign,
  MoreHorizontal,
  Plus,
  Search,
  UsersRound,
} from "lucide-react";
import toast from "react-hot-toast";
import { EntityFormModal } from "../components/EntityFormModal";
import { MetricCard } from "../components/MetricCard";
import { PaginationControls } from "../components/PaginationControls";
import { entityDefinitions } from "../config/entityDefinitions";
import { useSession } from "../context/SessionContext";
import { useRecords } from "../hooks/useRecords";
import { generateUsername } from "../services/username";
import { getMonthlyTrend } from "../services/monthlyTrend";
import { formatCurrency as money, titleCase } from "../services/formatters";

const PAGE_SIZE = 5;

export function CentreDashboardPage({ dashboard }) {
  const { session } = useSession();
  const { records: centres } = useRecords("centres");
  const { records: groups, create, update, remove } = useRecords("groups");
  const { records: members } = useRecords("members");
  const { records: contributions } = useRecords("contributions");
  const centre = centres.find((item) => item.id === session.centreId);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [isFormOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "",
    username: "",
    password: "",
    status: "active",
  });
  const total = Number(
    dashboard?.contributions?.total ??
      contributions.reduce((sum, item) => sum + Number(item.amount), 0),
  );
  const trend = getMonthlyTrend(dashboard?.monthlyTrend);
  const filtered = groups.filter(
    (group) =>
      (status === "all" || group.status === status) &&
      group.name.toLowerCase().includes(query.toLowerCase()),
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name || (!editing && !form.password))
      return toast.error("Complete the group name and login credentials.");
    try {
      if (editing) {
        const changes = Object.fromEntries(
          Object.entries(form).filter(
            ([field]) => !["password", "username"].includes(field),
          ),
        );
        await update(editing.id, changes);
      } else {
        const created = await create({
          name: form.name,
          username: form.username,
          password: form.password,
          parishId: session.parishId,
          centreId: session.centreId,
        });
        toast.success(
          `Group created. Login username: ${created.administratorUsername}`,
          { duration: 10000 },
        );
      }
      setFormOpen(false);
      if (editing) toast.success("Group updated.");
    } catch (error) {
      if (error.code === "USERNAME_TAKEN") {
        setForm((current) => ({
          ...current,
          username: generateUsername(current.name),
        }));
        toast.error(
          "That username is already in use. A new suggestion is ready; submit again.",
        );
      } else toast.error(error.message);
    }
  };
  const toggle = async (group) => {
    try {
      await update(group.id, {
        status: group.status === "active" ? "inactive" : "active",
      });
      toast.success(`${group.name} status updated.`);
    } catch (error) {
      toast.error(error.message);
    }
  };
  const deleteGroup = async (group) => {
    if (!window.confirm(`Delete ${group.name}? This action cannot be undone.`))
      return;
    try {
      await remove(group.id);
      toast.success("Group deleted.");
    } catch (error) {
      toast.error(error.message);
    }
  };
  const generateReport = () => {
    const report = `${centre?.name || "Centre"} financial summary\nRecorded contributions: ${money(total)}\nGroups: ${groups.length}\nMembers: ${members.length}\nGenerated: ${new Date().toLocaleDateString()}`;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([report], { type: "text/plain" }));
    link.download = `${centre?.id || "centre"}-summary.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("Centre summary report generated.");
  };

  return (
    <div className="workspace-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Centre administrator dashboard</span>
          <h1>{centre?.name || "Centre workspace"}</h1>
          <p>
            Manage church groups, monitor members and steward centre
            contributions.
          </p>
        </div>
        <div className="heading-actions">
          <div className="date-chip">Monday, 26 October 2026</div>
          <button className="secondary-button" onClick={generateReport}>
            Generate report
          </button>
          <Link className="primary-button compact-button" to="/contributions">
            <Plus size={16} /> Record contribution
          </Link>
        </div>
      </div>
      <section className="metric-grid">
        <MetricCard
          icon={UsersRound}
          label="Church groups"
          value={groups.length}
          detail={`${groups.filter((item) => item.status === "active").length} active groups`}
        />
        <MetricCard
          icon={UsersRound}
          label="Members"
          value={members.length}
          detail="Across this centre"
        />
        <MetricCard
          icon={CircleDollarSign}
          label="Contribution total"
          value={money(total)}
          detail={`${contributions.length} recorded transactions`}
        />
        <MetricCard
          icon={Activity}
          label="Recent activity"
          value={
            contributions.filter((item) => item.date >= "2026-10-18").length
          }
          detail="Transactions this period"
        />
      </section>
      <section className="dashboard-grid">
        <article className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Centre contribution trend</span>
              <h2>Financial stewardship</h2>
            </div>
            <span className="trend-badge">
              <ArrowUpRight size={14} /> Tracking
            </span>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient
                    id="centreContributionFill"
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#2a9d8f" stopOpacity=".28" />
                    <stop offset="100%" stopColor="#2a9d8f" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e8eef1" vertical={false} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#637381" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#637381" }}
                  tickFormatter={(value) => `${value / 1000}k`}
                />
                <Tooltip formatter={(value) => money(value)} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#2a9d8f"
                  strokeWidth={3}
                  fill="url(#centreContributionFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Centre activity</span>
              <h2>Recent contributions</h2>
            </div>
            <CircleDollarSign size={19} color="#2a9d8f" />
          </div>
          {contributions.slice(0, 4).map((item) => (
            <div className="activity-item" key={item.id}>
              <span className="activity-dot" />
              <div>
                <strong>{titleCase(item.category)}</strong>
                <p>
                  {item.date} · {item.method}
                </p>
              </div>
              <b>{money(item.amount)}</b>
            </div>
          ))}
        </article>
      </section>
      <section className="panel parish-panel" id="groups">
        <div className="panel-heading parish-heading">
          <div>
            <span className="eyebrow">Group administration</span>
            <h2>Church group management</h2>
            <p>
              Manage groups belonging exclusively to{" "}
              {centre?.name || "this centre"}.
            </p>
          </div>{" "}
          <button
            className="primary-button compact-button"
            onClick={() => {
              setEditing(null);
              setForm({
                name: "",
                username: "",
                password: "",
                status: "active",
              });
              setFormOpen(true);
            }}
          >
            <Plus size={16} /> Add group
          </button>
        </div>
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={17} />
            <input
              placeholder="Search groups..."
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
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
                <th>Group</th>
                <th>Members</th>
                <th>Contributions</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {visible.map((group) => (
                <tr key={group.id}>
                  <td>
                    <Link className="table-primary" to={`/groups/${group.id}`}>
                      {group.name}
                    </Link>
                    <span className="table-secondary">
                      Scoped to {centre?.name}
                    </span>
                  </td>
                  <td>
                    {members.filter((item) => item.groupId === group.id).length}
                  </td>
                  <td>
                    {money(
                      contributions
                        .filter((item) => item.groupId === group.id)
                        .reduce((sum, item) => sum + item.amount, 0),
                    )}
                  </td>
                  <td>
                    <span
                      className={`status-pill status-pill--${group.status}`}
                    >
                      {titleCase(group.status)}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      {" "}
                      <button
                        onClick={() => {
                          setEditing(group);
                          setForm({ ...group, username: "", password: "" });
                          setFormOpen(true);
                        }}
                      >
                        Edit
                      </button>
                      <button onClick={() => toggle(group)}>
                        {group.status === "active" ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        title="Delete group"
                        onClick={() => deleteGroup(group)}
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {visible.length === 0 && (
          <div className="empty-state">No groups match your filters.</div>
        )}
        <PaginationControls
          page={page}
          pageCount={pageCount}
          total={filtered.length}
          visibleCount={visible.length}
          onPage={setPage}
        />
      </section>
      {isFormOpen && (
        <EntityFormModal
          entity="groups"
          definition={entityDefinitions.groups}
          form={form}
          setForm={setForm}
          editing={editing}
          onSubmit={submit}
          onClose={() => setFormOpen(false)}
          fieldLabels={{ name: "Group name" }}
        />
      )}
    </div>
  );
}
