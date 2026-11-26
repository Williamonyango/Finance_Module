const ExcelJS = require("exceljs");

function displayLabel(value) {
  const text = String(value || "").replaceAll("_", " ").replaceAll("-", " ");
  if (text.toLowerCase() === "m pesa") return "M-Pesa";
  return text.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function excelDate(value) {
  const dateText =
    value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateText);
  if (!match) return dateText;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function localDateStamp(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Africa/Nairobi",
    year: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function buildContributionFilename(scopeName, date = new Date()) {
  const safeName =
    String(scopeName || "Contribution Report")
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "Contribution-Report";
  return `${safeName}-${localDateStamp(date)}.xlsx`;
}

function buildContributionWorkbook(
  rows,
  { title = "Contribution Register", generatedAt = new Date() } = {},
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Parish Ledger";
  workbook.created = generatedAt;
  const sheet = workbook.addWorksheet("Contribution Register", {
    properties: { tabColor: { argb: "FF2A9D8F" } },
    views: [{ state: "frozen", ySplit: 3, zoomScale: 90 }],
  });
  sheet.columns = [
    { key: "date", width: 18 },
    { key: "member", width: 30 },
    { key: "category", width: 24 },
    { key: "method", width: 20 },
    { key: "reference", width: 24 },
    { key: "amount", width: 18 },
    { key: "currency", width: 14 },
  ];

  sheet.mergeCells("A1:G1");
  sheet.getCell("A1").value = title;
  sheet.getCell("A1").font = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 18,
  };
  sheet.getCell("A1").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF16324F" },
  };
  sheet.getCell("A1").alignment = { vertical: "middle" };
  sheet.getRow(1).height = 34;

  sheet.mergeCells("A2:G2");
  const generatedText = new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Nairobi",
  }).format(generatedAt);
  sheet.getCell("A2").value = `Contribution report downloaded ${generatedText} EAT`;
  sheet.getCell("A2").font = { color: { argb: "FF536779" }, italic: true };
  sheet.getCell("A2").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF0F6F7" },
  };
  sheet.getRow(2).height = 22;

  const header = sheet.addRow([
    "Date",
    "Member",
    "Category",
    "Payment method",
    "Reference",
    "Amount",
    "Currency",
  ]);
  header.height = 24;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2A9D8F" },
    };
    cell.alignment = { vertical: "middle" };
    cell.border = {
      bottom: { style: "medium", color: { argb: "FF16324F" } },
    };
  });

  const totals = new Map();
  rows.forEach((record, index) => {
    const currency = record.currency || "KES";
    const row = sheet.addRow([
      excelDate(record.contribution_date),
      record.member_name || "",
      displayLabel(record.category),
      displayLabel(record.method),
      record.reference || "",
      Number(record.amount),
      currency,
    ]);
    row.height = 21;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.alignment = { vertical: "middle" };
      if (index % 2 === 1) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF4F8F9" },
        };
      }
      cell.border = {
        bottom: { style: "hair", color: { argb: "FFDDE6EA" } },
      };
    });
    row.getCell(1).numFmt = "dd mmm yyyy";
    row.getCell(6).numFmt = "#,##0.00;[Red]-#,##0.00";
    totals.set(currency, (totals.get(currency) || 0) + Number(record.amount));
  });

  if (rows.length) {
    sheet.autoFilter = {
      from: { row: 3, column: 1 },
      to: { row: rows.length + 3, column: 7 },
    };
    sheet.addRow([]);
    for (const [currency, amount] of totals) {
      const totalRow = sheet.addRow([
        `Total contributions (${currency})`,
        "",
        "",
        "",
        "",
        amount,
        currency,
      ]);
      totalRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { bold: true, color: { argb: "FF16324F" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFEAF4F3" },
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FF2A9D8F" } },
        };
      });
      totalRow.getCell(6).numFmt = "#,##0.00;[Red]-#,##0.00";
      totalRow.getCell(1).alignment = { horizontal: "right" };
    }
  } else {
    sheet.mergeCells("A4:G4");
    sheet.getCell("A4").value = "No contributions match the selected filters.";
    sheet.getCell("A4").font = { italic: true, color: { argb: "FF637381" } };
  }

  return workbook;
}

module.exports = { buildContributionFilename, buildContributionWorkbook };
