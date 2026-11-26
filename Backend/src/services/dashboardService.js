const { pool } = require("../db/pool");
const { AppError } = require("../errors/AppError");
const {
  buildContributionFilename,
  buildContributionWorkbook,
} = require("./contributionWorkbook");
const {
  buildSummaryReportFilename,
  buildSummaryReportPdf,
} = require("./summaryReportPdf");
const {
  checkCentreAccess,
  checkGroupAccess,
  checkParishAccess,
} = require("../middleware/authorization");

function scope(user, alias = "c") {
  const conditions = [`${alias}.status = 'recorded'`];
  const values = [];
  if (user.role !== "owner") {
    conditions.push(`${alias}.parish_id = ?`);
    values.push(user.parish_id);
  }
  if (user.role === "centre" || user.role === "group") {
    conditions.push(`${alias}.centre_id = ?`);
    values.push(user.centre_id);
  }
  if (user.role === "group") {
    conditions.push(`${alias}.group_id = ?`);
    values.push(user.group_id);
  }
  return { conditions, values };
}

function dateScope(user, filters, alias = "c") {
  const result = scope(user, alias);
  if (filters.fromDate) {
    result.conditions.push(`${alias}.contribution_date >= ?`);
    result.values.push(filters.fromDate);
  }
  if (filters.toDate) {
    result.conditions.push(`${alias}.contribution_date <= ?`);
    result.values.push(filters.toDate);
  }
  return result;
}

function serializeContribution(row) {
  return {
    id: row.id,
    memberId: row.member_id,
    memberName: row.member_name,
    amount: row.amount,
    currency: row.currency,
    category: row.category,
    date: row.contribution_date,
    method: row.method,
    reference: row.reference,
  };
}

async function dashboard(user, filters = {}) {
  const financial = dateScope(user, filters);
  const [[totals]] = await pool.query(
    `SELECT COALESCE(SUM(c.amount), 0) AS total, COUNT(*) AS contribution_count
     FROM contributions c WHERE ${financial.conditions.join(" AND ")}`,
    financial.values,
  );
  const counts = {};
  for (const [name, table, condition, values] of [
    [
      "parishes",
      "parishes",
      user.role === "owner" ? "1 = 1" : "id = ?",
      user.role === "owner" ? [] : [user.parish_id],
    ],
    [
      "centres",
      "centres",
      user.role === "owner" ? "1 = 1" : "parish_id = ?",
      user.role === "owner" ? [] : [user.parish_id],
    ],
    [
      "groups",
      "`groups`",
      user.role === "owner" ? "1 = 1" : "parish_id = ?",
      user.role === "owner" ? [] : [user.parish_id],
    ],
    [
      "members",
      "members",
      user.role === "owner" ? "1 = 1" : "parish_id = ?",
      user.role === "owner" ? [] : [user.parish_id],
    ],
  ]) {
    const [[row]] = await pool.query(
      `SELECT COUNT(*) AS total FROM ${table} WHERE ${condition} AND status = 'active'`,
      values,
    );
    counts[name] = Number(row.total);
  }
  const [trendRows] = await pool.query(
    `SELECT DATE_FORMAT(c.contribution_date, '%Y-%m') AS month,
            COALESCE(SUM(c.amount), 0) AS total, COUNT(*) AS count
     FROM contributions c WHERE ${financial.conditions.join(" AND ")}
     GROUP BY month ORDER BY month ASC`,
    financial.values,
  );
  const [recentRows] = await pool.query(
    `SELECT c.id, c.member_id, m.name AS member_name, c.amount, c.currency,
            c.category, c.contribution_date, c.method, c.reference
     FROM contributions c JOIN members m ON m.id = c.member_id
     WHERE ${financial.conditions.join(" AND ")}
     ORDER BY c.contribution_date DESC, c.created_at DESC LIMIT 10`,
    financial.values,
  );
  const children = await childSummaries(user, filters);
  return {
    counts,
    contributions: {
      total: totals.total,
      count: Number(totals.contribution_count),
    },
    monthlyTrend: trendRows.map((row) => ({
      month: row.month,
      total: row.total,
      count: Number(row.count),
    })),
    recentContributions: recentRows.map(serializeContribution),
    childSummaries: children,
  };
}

async function childSummaries(user, filters) {
  let table;
  let idColumn;
  let groupBy;
  if (user.role === "owner") {
    table = "parishes";
    idColumn = "p.id";
    groupBy = "p.id, p.name";
  } else if (user.role === "parish") {
    table = "centres";
    idColumn = "x.id";
    groupBy = "x.id, x.name";
  } else if (user.role === "centre") {
    table = "`groups`";
    idColumn = "x.id";
    groupBy = "x.id, x.name";
  } else {
    table = "members";
    idColumn = "x.id";
    groupBy = "x.id, x.name";
  }
  const hierarchy =
    user.role === "owner"
      ? "1 = 1"
      : user.role === "parish"
        ? "x.parish_id = ?"
        : user.role === "centre"
          ? "x.parish_id = ? AND x.centre_id = ?"
          : "x.parish_id = ? AND x.centre_id = ? AND x.group_id = ?";
  const hierarchyValues =
    user.role === "parish"
      ? [user.parish_id]
      : user.role === "centre"
        ? [user.parish_id, user.centre_id]
        : user.role === "group"
          ? [user.parish_id, user.centre_id, user.group_id]
          : [];
  const join =
    user.role === "owner"
      ? "LEFT JOIN contributions c ON c.parish_id = p.id AND c.status = 'recorded'"
      : user.role === "parish"
        ? "LEFT JOIN contributions c ON c.centre_id = x.id AND c.status = 'recorded'"
        : user.role === "centre"
          ? "LEFT JOIN contributions c ON c.group_id = x.id AND c.status = 'recorded'"
          : "LEFT JOIN contributions c ON c.member_id = x.id AND c.status = 'recorded'";
  const dateConditions = [];
  const dateValues = [];
  if (filters.fromDate) {
    dateConditions.push("c.contribution_date >= ?");
    dateValues.push(filters.fromDate);
  }
  if (filters.toDate) {
    dateConditions.push("c.contribution_date <= ?");
    dateValues.push(filters.toDate);
  }
  const prefix = user.role === "owner" ? "p" : "x";
  const [rows] = await pool.query(
    `SELECT ${idColumn} AS id, ${prefix}.name,
            COALESCE(SUM(c.amount), 0) AS total, COUNT(c.id) AS contribution_count
     FROM ${table} ${prefix} ${join}
     WHERE ${hierarchy} ${dateConditions.length ? `AND ${dateConditions.join(" AND ")}` : ""}
     GROUP BY ${groupBy} ORDER BY total DESC, ${prefix}.name ASC`,
    [...hierarchyValues, ...dateValues],
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    total: row.total,
    contributionCount: Number(row.contribution_count),
  }));
}

async function assertReportScope(user, resource, id) {
  const allowed =
    resource === "parishes"
      ? await checkParishAccess(user, id)
      : resource === "centres"
        ? await checkCentreAccess(user, id)
        : await checkGroupAccess(user, id);
  if (!allowed)
    throw new AppError(
      404,
      "RESOURCE_NOT_FOUND",
      `The requested ${resource.slice(0, -1)} was not found`,
    );
}

function reportScope(user, resource, id) {
  const result = scope(user);
  if (resource === "parishes") {
    result.conditions.push("c.parish_id = ?");
    result.values.push(id);
  } else if (resource === "centres") {
    result.conditions.push("c.centre_id = ?");
    result.values.push(id);
  } else {
    result.conditions.push("c.group_id = ?");
    result.values.push(id);
  }
  return result;
}

async function summary(user, resource, id, filters = {}) {
  await assertReportScope(user, resource, id);
  const hierarchy = {
    parishes: {
      table: "parishes",
      memberColumn: "parish_id",
      childTable: "centres",
      childColumn: "parish_id",
      childLabel: "Centres",
    },
    centres: {
      table: "centres",
      memberColumn: "centre_id",
      childTable: "`groups`",
      childColumn: "centre_id",
      childLabel: "Groups",
    },
    groups: {
      table: "`groups`",
      memberColumn: "group_id",
      childTable: null,
      childColumn: null,
      childLabel: null,
    },
  }[resource];
  const current = reportScope(user, resource, id);
  if (filters.fromDate) {
    current.conditions.push("c.contribution_date >= ?");
    current.values.push(filters.fromDate);
  }
  if (filters.toDate) {
    current.conditions.push("c.contribution_date <= ?");
    current.values.push(filters.toDate);
  }
  const [[row]] = await pool.query(
    `SELECT COALESCE(SUM(c.amount), 0) AS total, COUNT(*) AS count,
            COUNT(DISTINCT c.member_id) AS members
     FROM contributions c WHERE ${current.conditions.join(" AND ")}`,
    current.values,
  );
  const [[entity]] = await pool.query(
    `SELECT name FROM ${hierarchy.table} WHERE id = ?`,
    [id],
  );
  const [[memberCount]] = await pool.query(
    `SELECT COUNT(*) AS total FROM members WHERE ${hierarchy.memberColumn} = ?`,
    [id],
  );
  let childCount = null;
  if (hierarchy.childTable) {
    const [[children]] = await pool.query(
      `SELECT COUNT(*) AS total FROM ${hierarchy.childTable} WHERE ${hierarchy.childColumn} = ?`,
      [id],
    );
    childCount = Number(children.total);
  }
  return {
    resource,
    id,
    name: entity.name,
    total: row.total,
    contributionCount: Number(row.count),
    memberCount: Number(row.members),
    contributingMemberCount: Number(row.members),
    memberRecordCount: Number(memberCount.total),
    childCount,
    childLabel: hierarchy.childLabel,
  };
}

async function summaryPdf(user, resource, id, filters = {}) {
  const report = await summary(user, resource, id, filters);
  const generatedAt = new Date();
  return {
    content: await buildSummaryReportPdf(report, filters, generatedAt),
    filename: buildSummaryReportFilename(report.name, generatedAt),
  };
}

async function contributionRows(user, filters = {}) {
  const current = dateScope(user, filters);
  const add = (condition, ...values) => {
    current.conditions.push(condition);
    current.values.push(...values);
  };
  if (filters.q) {
    add(
      "(m.name LIKE ? OR c.reference LIKE ? OR c.notes LIKE ? OR c.method LIKE ? OR c.contribution_date LIKE ?)",
      ...Array(5).fill(`%${filters.q}%`),
    );
  }
  if (filters.parishId) add("c.parish_id = ?", filters.parishId);
  if (filters.centreId) add("c.centre_id = ?", filters.centreId);
  if (filters.groupId) add("c.group_id = ?", filters.groupId);
  if (filters.memberId) add("c.member_id = ?", filters.memberId);
  if (filters.category) add("c.category = ?", filters.category);
  if (filters.method) add("c.method = ?", filters.method);
  const orderBy =
    {
      date_asc: "c.contribution_date ASC, c.created_at ASC",
      amount_asc: "c.amount ASC, c.created_at DESC",
      amount_desc: "c.amount DESC, c.created_at DESC",
      date_desc: "c.contribution_date DESC, c.created_at DESC",
    }[filters.sort] || "c.contribution_date DESC, c.created_at DESC";
  const [rows] = await pool.query(
    `SELECT c.contribution_date, c.amount, c.currency, c.category, c.method,
            c.reference, m.name AS member_name
     FROM contributions c JOIN members m ON m.id = c.member_id
     WHERE ${current.conditions.join(" AND ")}
     ORDER BY ${orderBy}`,
    current.values,
  );
  return rows;
}

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

async function csv(user, filters) {
  const rows = await contributionRows(user, filters);
  const header = [
    "date",
    "member",
    "amount",
    "currency",
    "category",
    "method",
    "reference",
  ];
  return [
    header,
    ...rows.map((row) => [
      row.contribution_date,
      row.member_name,
      row.amount,
      row.currency,
      row.category,
      row.method,
      row.reference,
    ]),
  ]
    .map((row) => row.map(csvEscape).join(","))
    .join("\r\n");
}

async function contributionReportName(user, filters = {}) {
  let table;
  let id;
  const conditions = ["id = ?"];
  const values = [];
  const addCondition = (field, value) => {
    conditions.push(`${field} = ?`);
    values.push(value);
  };

  if (user.role === "owner") {
    if (filters.groupId) {
      table = "`groups`";
      id = filters.groupId;
      if (filters.centreId) addCondition("centre_id", filters.centreId);
      if (filters.parishId) addCondition("parish_id", filters.parishId);
    } else if (filters.centreId) {
      table = "centres";
      id = filters.centreId;
      if (filters.parishId) addCondition("parish_id", filters.parishId);
    } else if (filters.parishId) {
      table = "parishes";
      id = filters.parishId;
    } else {
      return "All Parishes";
    }
  } else if (user.role === "group") {
    table = "`groups`";
    id = user.group_id;
    addCondition("parish_id", user.parish_id);
    addCondition("centre_id", user.centre_id);
  } else if (user.role === "centre") {
    addCondition("parish_id", user.parish_id);
    if (filters.groupId) {
      table = "`groups`";
      id = filters.groupId;
      addCondition("centre_id", user.centre_id);
    } else {
      table = "centres";
      id = user.centre_id;
    }
  } else if (user.role === "parish") {
    addCondition("parish_id", user.parish_id);
    if (filters.groupId) {
      table = "`groups`";
      id = filters.groupId;
      if (filters.centreId) addCondition("centre_id", filters.centreId);
    } else if (filters.centreId) {
      table = "centres";
      id = filters.centreId;
    } else {
      table = "parishes";
      id = user.parish_id;
    }
  } else {
    return "Contribution Report";
  }

  const [rows] = await pool.query(
    `SELECT name FROM ${table} WHERE ${conditions.join(" AND ")} LIMIT 1`,
    [id, ...values],
  );
  return rows[0]?.name || "Contribution Report";
}

async function excel(user, filters) {
  const rows = await contributionRows(user, filters);
  const reportName = await contributionReportName(user, filters);
  const generatedAt = new Date();
  const workbook = buildContributionWorkbook(rows, {
    title: reportName,
    generatedAt,
  });
  return {
    content: await workbook.xlsx.writeBuffer(),
    filename: buildContributionFilename(reportName, generatedAt),
  };
}

module.exports = { csv, dashboard, excel, summary, summaryPdf };
