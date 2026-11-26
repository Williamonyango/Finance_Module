import { useState } from "react";
import { Building2, Plus, Search, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { EntityFormModal } from "../components/EntityFormModal";
import { MetricCard } from "../components/MetricCard";
import { PaginationControls } from "../components/PaginationControls";
import { entityDefinitions } from "../config/entityDefinitions";
import { useRecords } from "../hooks/useRecords";
import { useSession } from "../context/SessionContext";
import { useDashboard } from "../hooks/useDashboard";
import { generateUsername } from "../services/username";
import { getGreeting } from "../services/greeting";
import { titleCase } from "../services/formatters";
import { ParishDashboardPage } from "./ParishDashboardPage";
import { CentreDashboardPage } from "./CentreDashboardPage";
import { GroupDashboardPage } from "./GroupDashboardPage";

const PAGE_SIZE = 5;

export function WorkspacePage() {
  const { session } = useSession();
  const { dashboard } = useDashboard();
  if (session?.role === "parish")
    return <ParishDashboardPage dashboard={dashboard} />;
  if (session?.role === "centre")
    return <CentreDashboardPage dashboard={dashboard} />;
  if (session?.role === "group")
    return <GroupDashboardPage dashboard={dashboard} />;
  return <OwnerWorkspacePage dashboard={dashboard} user={session} />;
}

function OwnerWorkspacePage({ dashboard, user }) {
  const { records: parishes, create, update, remove } = useRecords("parishes");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [isFormOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "",
    location: "",
    priest: "",
    username: "",
    password: "",
    status: "active",
  });
  const filteredParishes = parishes.filter(
    (parish) =>
      (status === "all" || parish.status === status) &&
      `${parish.name} ${parish.location}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const pageCount = Math.max(1, Math.ceil(filteredParishes.length / PAGE_SIZE));
  const visibleParishes = filteredParishes.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      location: "",
      priest: "",
      username: "",
      password: "",
      status: "active",
    });
    setFormOpen(true);
  };
  const openEdit = (parish) => {
    setEditing(parish);
    setForm({
      name: parish.name,
      location: parish.location || "",
      priest: parish.priest || "",
      username: "",
      password: "",
      status: parish.status,
    });
    setFormOpen(true);
  };
  const submitParish = async (event) => {
    event.preventDefault();
    if (
      !form.name ||
      !form.location ||
      !form.priest ||
      (!editing && !form.password)
    )
      return toast.error("Complete all parish fields and login credentials.");
    try {
      if (editing) {
        const changes = Object.fromEntries(
          Object.entries(form).filter(
            ([field]) => !["password", "username"].includes(field),
          ),
        );
        await update(editing.id, changes);
      } else {
        const created = await create(form);
        toast.success(
          `Parish created. Login username: ${created.administratorUsername}`,
          { duration: 10000 },
        );
      }
      setFormOpen(false);
      if (editing) toast.success("Parish updated.");
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
  const toggleStatus = async (parish) => {
    try {
      await update(parish.id, {
        status: parish.status === "active" ? "inactive" : "active",
      });
      toast.success(
        `${parish.name} is now ${parish.status === "active" ? "inactive" : "active"}.`,
      );
    } catch (error) {
      toast.error(error.message);
    }
  };
  const deleteParish = async (parish) => {
    if (!window.confirm(`Delete ${parish.name}? This action cannot be undone.`))
      return;
    try {
      await remove(parish.id);
      toast.success("Parish deleted.");
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="workspace-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">ERP owner dashboard</span>
          <h1>{getGreeting(user?.name)}</h1>
          <p>Manage parish environments from one place.</p>
        </div>
      </div>
      <section className="metric-grid">
        <MetricCard
          icon={Building2}
          label="Registered parishes"
          value={dashboard?.counts?.parishes ?? parishes.length}
          detail={`${dashboard?.counts?.parishes ?? parishes.filter((item) => item.status === "active").length} active environments`}
        />
      </section>
      <section className="panel parish-panel" id="parishes">
        <div className="panel-heading parish-heading">
          <div>
            <span className="eyebrow">Platform administration</span>
            <h2>Parish management</h2>
            <p>
              Manage independent parish environments and their current status.
            </p>
          </div>
          <button
            className="primary-button compact-button"
            onClick={openCreate}
          >
            <Plus size={16} /> Add parish
          </button>
        </div>
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={17} />
            <input
              placeholder="Search parishes..."
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
                <th>Parish</th>
                <th>Username</th>
                <th>Location</th>
                <th>Priest</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {visibleParishes.map((parish) => (
                <tr key={parish.id}>
                  <td>
                    <strong className="table-primary">{parish.name}</strong>
                  </td>
                  <td>{parish.administratorUsername || "—"}</td>
                  <td>{parish.location}</td>
                  <td>{parish.priest}</td>
                  <td>
                    <span
                      className={`status-pill status-pill--${parish.status}`}
                    >
                      {titleCase(parish.status)}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        title="Edit parish"
                        onClick={() => openEdit(parish)}
                      >
                        Edit
                      </button>
                      <button
                        title="Toggle parish status"
                        onClick={() => toggleStatus(parish)}
                      >
                        {parish.status === "active" ? "Suspend" : "Activate"}
                      </button>{" "}
                      <button
                        className="destructive-action"
                        title="Delete parish"
                        aria-label="Delete parish"
                        onClick={() => deleteParish(parish)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {visibleParishes.length === 0 && (
          <div className="empty-state">No parishes match your filters.</div>
        )}
        <PaginationControls
          page={page}
          pageCount={pageCount}
          total={filteredParishes.length}
          visibleCount={visibleParishes.length}
          onPage={setPage}
        />
      </section>
      {isFormOpen && (
        <EntityFormModal
          entity="parishes"
          definition={entityDefinitions.parishes}
          form={form}
          setForm={setForm}
          editing={editing}
          onSubmit={submitParish}
          onClose={() => setFormOpen(false)}
          fieldLabels={{ name: "Parish name", priest: "Parish priest" }}
          copy={{
            createEyebrow: "New environment",
            editEyebrow: "Edit environment",
          }}
        />
      )}
    </div>
  );
}
