import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useSession } from "../context/SessionContext";
import { useRecords } from "../hooks/useRecords";
import {
  generateUsername,
  updateGeneratedUsername,
} from "../services/username";

const config = {
  parishes: {
    title: "Parishes",
    eyebrow: "Platform administration",
    description: "Manage independent parish environments.",
    singular: "parish",
    fields: ["name", "location", "priest", "username", "password", "status"],
    defaults: {
      name: "",
      location: "",
      priest: "",
      username: "",
      password: "",
      status: "active",
    },
  },
  centres: {
    title: "Centres",
    eyebrow: "Parish administration",
    description: "Manage centres belonging to your parish.",
    singular: "centre",
    fields: ["name", "location", "username", "password", "status"],
    defaults: {
      name: "",
      location: "",
      username: "",
      password: "",
      status: "active",
    },
  },
  groups: {
    title: "Groups",
    eyebrow: "Centre administration",
    description: "Manage church groups belonging to your centre.",
    singular: "group",
    fields: ["name", "username", "password", "status"],
    defaults: { name: "", username: "", password: "", status: "active" },
  },
  members: {
    title: "Members",
    eyebrow: "Group administration",
    description: "Manage members belonging to your group.",
    singular: "member",
    fields: ["name", "phone", "status"],
    defaults: { name: "", phone: "", status: "active" },
  },
};

const titleCase = (value) =>
  value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export function EntityManagementPage({ entity }) {
  const { session } = useSession();
  const definition = config[entity];
  const { records, create, update, remove } = useRecords(entity);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(definition.defaults);
  const [isFormOpen, setFormOpen] = useState(false);
  const filtered = records.filter(
    (item) =>
      (status === "all" || item.status === status) &&
      Object.values(item).join(" ").toLowerCase().includes(query.toLowerCase()),
  );

  const openForm = (record) => {
    setEditing(record);
    setForm(
      record
        ? Object.fromEntries(
            definition.fields.map((field) => [
              field,
              field === "password" ? "" : record[field] || "",
            ]),
          )
        : { ...definition.defaults },
    );
    setFormOpen(true);
  };
  const submit = async (event) => {
    event.preventDefault();
    if (
      !form.name ||
      (["parishes", "centres", "groups"].includes(entity) &&
        !editing &&
        !form.password) ||
      (entity === "parishes" && (!form.location || !form.priest)) ||
      (entity === "centres" && !form.location) ||
      (entity === "members" && !form.phone)
    )
      return toast.error(`Complete the ${definition.singular} details.`);
    try {
      const hierarchy =
        entity === "centres"
          ? { parishId: session.parishId }
          : entity === "groups"
            ? { parishId: session.parishId, centreId: session.centreId }
            : entity === "members"
              ? {
                  parishId: session.parishId,
                  centreId: session.centreId,
                  groupId: session.groupId,
                }
              : {};
      if (editing) {
        const changes = Object.fromEntries(
          Object.entries(form).filter(
            ([field]) => !["password", "username"].includes(field),
          ),
        );
        await update(editing.id, changes);
      } else {
        const created = await create({ ...form, ...hierarchy });
        toast.success(
          `${definition.singular} created. Login username: ${created.administratorUsername}`,
          { duration: 10000 },
        );
      }
      setFormOpen(false);
      if (editing) toast.success(`${definition.singular} updated.`);
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
  const deleteRecord = async (record) => {
    if (!window.confirm(`Delete ${record.name}? This action cannot be undone.`))
      return;
    try {
      await remove(record.id);
      toast.success(`${definition.singular} deleted.`);
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="workspace-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">{definition.eyebrow}</span>
          <h1>{definition.title}</h1>
          <p>{definition.description}</p>
        </div>
        <button
          className="primary-button compact-button"
          onClick={() => openForm(null)}
        >
          <Plus size={16} /> Add {definition.singular}
        </button>
      </div>
      <section className="metric-grid">
        <Metric
          label={`Total ${definition.title.toLowerCase()}`}
          value={records.length}
          detail={`${records.filter((item) => item.status === "active").length} active`}
        />
        <Metric
          label="Filtered records"
          value={filtered.length}
          detail="Matching your search"
        />
      </section>
      <section className="panel parish-panel register-panel">
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={17} />
            <input
              placeholder={`Search ${definition.title.toLowerCase()}...`}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            {entity === "parishes" && (
              <option value="suspended">Suspended</option>
            )}
          </select>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                {entity === "parishes" && (
                  <>
                    <th>Location</th>
                    <th>Priest</th>
                  </>
                )}
                {entity === "centres" && (
                  <>
                    <th>Username</th>
                    <th>Location</th>
                  </>
                )}
                {entity === "groups" && <th>Username</th>}
                {entity === "members" && <th>Phone</th>}
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((record) => (
                <tr key={record.id}>
                  <td>
                    <Link
                      className="table-primary"
                      to={`/${entity}/${record.id}`}
                    >
                      {record.name}
                    </Link>
                  </td>
                  {entity === "parishes" && (
                    <>
                      <td>{record.location}</td>
                      <td>{record.priest}</td>
                    </>
                  )}
                  {entity === "centres" && (
                    <>
                      <td>{record.administratorUsername || "—"}</td>
                      <td>{record.location}</td>
                    </>
                  )}
                  {entity === "groups" && (
                    <td>{record.administratorUsername || "—"}</td>
                  )}
                  {entity === "members" && <td>{record.phone}</td>}
                  <td>
                    <span
                      className={`status-pill status-pill--${record.status}`}
                    >
                      {titleCase(record.status)}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button onClick={() => openForm(record)}>Edit</button>{" "}
                      <button
                        className="destructive-action"
                        onClick={() => deleteRecord(record)}
                        title={`Delete ${definition.singular}`}
                        aria-label={`Delete ${definition.singular}`}
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
        {filtered.length === 0 && (
          <div className="empty-state">No matching records.</div>
        )}
      </section>
      {isFormOpen && (
        <EntityForm
          definition={definition}
          entity={entity}
          form={form}
          setForm={setForm}
          editing={editing}
          onSubmit={submit}
          onClose={() => setFormOpen(false)}
        />
      )}
    </div>
  );
}

function Metric({ label, value, detail }) {
  return (
    <article className="metric-card">
      <div className="metric-icon">
        <Plus size={19} />
      </div>
      <div>
        <span className="eyebrow">{label}</span>
        <strong>{value}</strong>
        <p>{detail}</p>
      </div>
    </article>
  );
}
function EntityForm({
  definition,
  entity,
  form,
  setForm,
  editing,
  onSubmit,
  onClose,
}) {
  const fields = editing
    ? definition.fields.filter(
        (field) => !["password", "username"].includes(field),
      )
    : definition.fields;
  const updateField = (field, value) => {
    const changes = { [field]: value };
    if (
      field === "name" &&
      ["parishes", "centres", "groups"].includes(entity)
    ) {
      changes.username = value.trim()
        ? updateGeneratedUsername(value, form.username)
        : "";
    }
    setForm({ ...form, ...changes });
  };
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-heading">
          <div>
            <span className="eyebrow">
              {editing
                ? `Edit ${definition.singular}`
                : `New ${definition.singular}`}
            </span>
            <h2>
              {editing
                ? `Update ${definition.singular}`
                : `Create ${definition.singular}`}
            </h2>
          </div>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <form className="modal-form" onSubmit={onSubmit}>
          {fields.map((field) => (
            <label key={field}>
              {field === "username" ? "Generated username" : titleCase(field)}
              {field === "status" ? (
                <select
                  value={form[field]}
                  onChange={(event) => updateField(field, event.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  {entity === "parishes" && (
                    <option value="suspended">Suspended</option>
                  )}
                </select>
              ) : (
                <input
                  type={field === "password" ? "password" : "text"}
                  value={form[field]}
                  readOnly={field === "username"}
                  onChange={(event) => updateField(field, event.target.value)}
                />
              )}
            </label>
          ))}
          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button className="primary-button compact-button" type="submit">
              {editing ? "Save changes" : `Create ${definition.singular}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
