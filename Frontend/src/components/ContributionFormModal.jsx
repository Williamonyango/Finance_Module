import { useState } from "react";

export function ContributionFormModal({
  form,
  setForm,
  members,
  centres = [],
  groups = [],
  canChooseCentre = false,
  canChooseGroup = false,
  editing,
  onSubmit,
  onClose,
  copy = {},
}) {
  const [memberSearch, setMemberSearch] = useState(
    members.find((member) => member.id === form.memberId)?.name || "",
  );
  const displayedMemberSearch = form.memberId
    ? members.find((member) => member.id === form.memberId)?.name || memberSearch
    : memberSearch;
  const memberOptions = members.filter(
    (member) =>
      (!form.centreId || member.centreId === form.centreId) &&
      (!form.groupId || member.groupId === form.groupId),
  );
  const matchingMembers = memberOptions
    .filter((member) =>
      member.name.toLowerCase().includes(memberSearch.trim().toLowerCase()),
    )
    .slice(0, 6);
  const selectionReady =
    (!canChooseCentre || Boolean(form.centreId)) &&
    (!canChooseGroup || Boolean(form.groupId));

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "centreId" ? { groupId: "", memberId: "" } : {}),
      ...(field === "groupId" ? { memberId: "" } : {}),
    }));
    if (field === "centreId" || field === "groupId") setMemberSearch("");
  };
  const selectMember = (member) => {
    setForm((current) => ({ ...current, memberId: member.id }));
    setMemberSearch(member.name);
  };

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
          {canChooseCentre && (
            <label>
              Centre
              <select
                value={form.centreId || ""}
                onChange={(event) =>
                  updateField("centreId", event.target.value)
                }
              >
                <option value="">Select a centre</option>
                {centres.map((centre) => (
                  <option key={centre.id} value={centre.id}>
                    {centre.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {canChooseGroup && (
            <label>
              Group
              <select
                value={form.groupId || ""}
                disabled={canChooseCentre && !form.centreId}
                onChange={(event) => updateField("groupId", event.target.value)}
              >
                <option value="">Select a group</option>
                {groups
                  .filter(
                    (group) =>
                      !form.centreId || group.centreId === form.centreId,
                  )
                  .map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <label>
            Member
            <div className="member-autocomplete">
              <input
                autoComplete="off"
                aria-autocomplete="list"
                aria-controls="contribution-member-options"
                aria-expanded={selectionReady && !form.memberId && Boolean(memberSearch)}
                disabled={!selectionReady}
                placeholder={
                  selectionReady ? "Search member name..." : "Select a centre and group first"
                }
                value={displayedMemberSearch}
                onChange={(event) => {
                  setMemberSearch(event.target.value);
                  setForm((current) => ({ ...current, memberId: "" }));
                }}
              />
              {selectionReady && !form.memberId && memberSearch.trim() && (
                <ul
                  className="member-autocomplete-options"
                  id="contribution-member-options"
                  role="listbox"
                >
                  {matchingMembers.length ? (
                    matchingMembers.map((member) => (
                      <li key={member.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected="false"
                          onClick={() => selectMember(member)}
                        >
                          {member.name}
                        </button>
                      </li>
                    ))
                  ) : (
                    <li className="member-autocomplete-empty">
                      No matching members
                    </li>
                  )}
                </ul>
              )}
            </div>
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
