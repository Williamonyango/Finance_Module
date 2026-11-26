const roleLabels = {
  owner: "ERP owner",
  parish: "parish administrator",
  centre: "centre administrator",
  group: "group treasurer",
};
const hierarchyNames = {
  parishes: "parish",
  centres: "centre",
  groups: "group",
  members: "member",
};

function titleCase(value) {
  return String(value)
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function createAuditMetadata(user, summary, details = {}, changes) {
  const metadata = {
    summary,
    performedBy: {
      name: user?.name || user?.username || "Unknown user",
      role: roleLabels[user?.role] || titleCase(user?.role || "unknown role"),
    },
    details,
  };
  if (changes?.length) metadata.changes = changes;
  return metadata;
}

const hierarchyFields = {
  parishes: {
    name: "Name",
    location: "Location",
    priest: "Priest",
    status: "Status",
  },
  centres: {
    name: "Name",
    location: "Location",
    status: "Status",
  },
  groups: {
    name: "Name",
    status: "Status",
  },
  members: {
    name: "Name",
    phone: "Phone number",
    status: "Status",
  },
};

function displayHierarchyValue(field, value) {
  if (value === undefined || value === null || value === "") {
    return "Not provided";
  }
  return field === "status" ? titleCase(value) : String(value);
}

function buildHierarchyAuditMetadata({
  action,
  resource,
  current,
  input = {},
  user,
}) {
  const fields = hierarchyFields[resource];
  const singular = hierarchyNames[resource];
  const next = { ...current, ...input };
  const details = Object.fromEntries(
    Object.entries(fields).map(([field, label]) => [
      label,
      displayHierarchyValue(field, next[field]),
    ]),
  );
  const changes = Object.entries(input)
    .filter(([field]) => fields[field])
    .map(([field, value]) => ({
      field: fields[field],
      from: displayHierarchyValue(field, current[field]),
      to: displayHierarchyValue(field, value),
    }))
    .filter((change) => change.from !== change.to);
  const name = next.name || "Unnamed record";
  let summary;
  if (action === "create") {
    summary = `Created ${singular} "${name}".`;
  } else if (action === "delete") {
    summary = `Deleted ${singular} "${name}".`;
  } else if (action === "status") {
    summary = `Changed the status of ${singular} "${name}" from ${displayHierarchyValue("status", current.status)} to ${displayHierarchyValue("status", input.status)}.`;
  } else if (changes.length) {
    summary = `Updated ${singular} "${name}": ${changes.map((change) => change.field).join(", ")}.`;
  } else {
    summary = `Updated ${singular} "${name}".`;
  }
  return createAuditMetadata(user, summary, details, changes);
}

const contributionFields = {
  amount: "Amount",
  category: "Category",
  date: "Date",
  method: "Payment method",
  reference: "Reference",
  notes: "Notes",
};

function displayContributionValue(field, value, currency = "KES") {
  if (value === undefined || value === null || value === "") {
    return "Not provided";
  }
  if (field === "amount") {
    return `${currency} ${Number(value).toLocaleString("en-KE")}`;
  }
  if (field === "category") return titleCase(value);
  if (
    field === "method" &&
    ["m_pesa", "m-pesa", "mpesa"].includes(String(value).toLowerCase())
  ) {
    return "M-Pesa";
  }
  if (field === "method") return titleCase(value);
  if (field === "date" && value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value);
}

function buildContributionAuditMetadata({
  action,
  current,
  input = {},
  reason,
  user,
}) {
  const record = action === "create" ? current : { ...current, ...input };
  const currency = record.currency || "KES";
  const memberName = record.memberName || "Unknown member";
  const details = {
    Member: memberName,
    Amount: displayContributionValue("amount", record.amount, currency),
    Category: displayContributionValue("category", record.category),
    Date: displayContributionValue("date", record.date),
    "Payment method": displayContributionValue("method", record.method),
    Reference: displayContributionValue("reference", record.reference),
  };
  if (record.notes) details.Notes = String(record.notes);
  if (action === "void") details["Void reason"] = reason || "Not provided";

  const changes =
    action === "update"
      ? Object.entries(input)
          .filter(([field]) => contributionFields[field])
          .map(([field, value]) => ({
            field: contributionFields[field],
            from: displayContributionValue(field, current[field], currency),
            to: displayContributionValue(field, value, currency),
          }))
          .filter((change) => change.from !== change.to)
      : undefined;
  const summary =
    action === "create"
      ? `Recorded ${details.Amount} contribution for ${memberName}.`
      : action === "update"
        ? `Updated contribution for ${memberName}${changes?.length ? `: ${changes.map((change) => change.field).join(", ")}` : ""}.`
        : `Voided ${details.Amount} contribution for ${memberName}.`;
  return createAuditMetadata(user, summary, details, changes);
}

module.exports = {
  buildContributionAuditMetadata,
  buildHierarchyAuditMetadata,
  createAuditMetadata,
};
