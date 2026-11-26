const PDFDocument = require("pdfkit");

function localDateStamp(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function buildSummaryReportFilename(name, date = new Date()) {
  const safeName =
    String(name || "Financial Summary")
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "Financial-Summary";
  return `${safeName}-summary-${localDateStamp(date)}.pdf`;
}

function buildSummaryReportPdf(report, filters = {}, generatedAt = new Date()) {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: "A4", margin: 52 });
    const chunks = [];
    document.on("data", (chunk) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);

    document.info.Title = `${report.name} Financial Summary`;
    document.info.Author = "EcclesiaERP";
    document
      .fontSize(22)
      .fillColor("#16324f")
      .text(report.name || "Financial Summary");
    document
      .moveDown(0.35)
      .fontSize(14)
      .fillColor("#2a9d8f")
      .text("Financial Summary");
    document
      .moveDown(0.5)
      .fontSize(10)
      .fillColor("#536779")
      .text(
        `Generated ${new Intl.DateTimeFormat("en-KE", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Africa/Nairobi",
        }).format(generatedAt)} EAT`,
      );
    document.moveDown(0.4);
    document
      .fontSize(11)
      .fillColor("#16324f")
      .text(
        filters.fromDate || filters.toDate
          ? `Reporting period: ${filters.fromDate || "Start"} to ${filters.toDate || "Present"}`
          : "Reporting period: All recorded contributions",
      );
    document.moveDown(1);

    const rows = [
      ["Recorded contribution total", formatCurrency(report.total)],
      ["Recorded transactions", String(report.contributionCount)],
      ["Members", String(report.memberRecordCount)],
      ["Members with contributions", String(report.contributingMemberCount)],
    ];
    if (report.childCount !== null) {
      rows.push([report.childLabel, String(report.childCount)]);
    }

    document
      .fontSize(12)
      .fillColor("#16324f")
      .text("Report overview", { underline: true });
    document.moveDown(0.4);
    const margin = document.page.margins.left;
    const contentWidth =
      document.page.width - margin - document.page.margins.right;
    const valueWidth = 160;
    for (const [label, value] of rows) {
      const rowY = document.y;
      document
        .fontSize(11)
        .fillColor("#536779")
        .text(label, margin, rowY, { width: contentWidth - valueWidth - 16 });
      document
        .fillColor("#16324f")
        .text(
          value,
          margin + contentWidth - valueWidth,
          rowY,
          { width: valueWidth, align: "right" },
        );
      document.y = rowY + 22;
    }

    document
      .moveDown(1)
      .fontSize(9)
      .fillColor("#7b8791")
      .text("This report includes recorded contributions within your authorized scope.");
    document.end();
  });
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(Number(value) || 0);
}

module.exports = { buildSummaryReportFilename, buildSummaryReportPdf };
