export function ContributionFormModal({
  form,
  setForm,
  members,
  editing,
  onSubmit,
  onClose,
  copy = {},
}) {
  const updateField = (field, value) => setForm({ ...form, [field]: value });

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-heading">
          <div>
            <span className="eyebrow">
              {editing
                ? (copy.editEyebrow ?? "Edit contribution")
                : (copy.createEyebrow ?? "New contribution")}
            </span>
            <h2>
              {editing
                ? (copy.editTitle ?? "Update contribution")
                : (copy.createTitle ?? "Record contribution")}
            </h2>
          </div>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <form className="modal-form" onSubmit={onSubmit}>
          <label>
            Member
            <select
              value={form.memberId}
              onChange={(event) => updateField("memberId", event.target.value)}
            >
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Amount (KES)
            <input
              type="number"
              min="1"
              value={form.amount}
              onChange={(event) => updateField("amount", event.target.value)}
            />
          </label>
          <label>
            Category
            <select
              value={form.category}
              onChange={(event) => updateField("category", event.target.value)}
            >
              <option value="tithes">Tithes</option>
              <option value="sunday-offering">Sunday Offering</option>
              <option value="development-fund">Development Fund</option>
            </select>
          </label>
          <label>
            Date
            <input
              type="date"
              value={form.date}
              onChange={(event) => updateField("date", event.target.value)}
            />
          </label>
          <label>
            Method
            <select
              value={form.method}
              onChange={(event) => updateField("method", event.target.value)}
            >
              <option>M-Pesa</option>
              <option>Cash</option>
              <option>Bank Transfer</option>
            </select>
          </label>
          <label>
            Reference
            <input
              value={form.reference}
              onChange={(event) => updateField("reference", event.target.value)}
            />
          </label>
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
                : (copy.createAction ?? "Record contribution")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
