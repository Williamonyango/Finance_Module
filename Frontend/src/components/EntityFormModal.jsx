import { updateGeneratedUsername } from "../services/username";
import { titleCase } from "../services/formatters";

export function EntityFormModal({
  entity,
  definition,
  form,
  setForm,
  editing,
  onSubmit,
  onClose,
  fieldLabels = {},
  copy = {},
}) {
  const fields = editing
    ? definition.fields.filter(
        (field) => !["password", "username"].includes(field),
      )
    : definition.fields;
  const updateField = (field, value) => {
    const changes = { [field]: value };
    if (field === "name" && ["parishes", "centres", "groups"].includes(entity))
      changes.username = value.trim()
        ? updateGeneratedUsername(value, form.username)
        : "";
    setForm({ ...form, ...changes });
  };
  const label = (field) =>
    fieldLabels[field] ||
    (field === "username" ? "Generated username" : titleCase(field));

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-heading">
          <div>
            <span className="eyebrow">
              {editing
                ? (copy.editEyebrow ?? `Edit ${definition.singular}`)
                : (copy.createEyebrow ?? `New ${definition.singular}`)}
            </span>
            <h2>
              {editing
                ? (copy.editTitle ?? `Update ${definition.singular}`)
                : (copy.createTitle ?? `Create ${definition.singular}`)}
            </h2>
          </div>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <form className="modal-form" onSubmit={onSubmit}>
          {fields.map((field) => (
            <label key={field}>
              {label(field)}
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
              {editing
                ? (copy.editAction ?? "Save changes")
                : (copy.createAction ?? `Create ${definition.singular}`)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
