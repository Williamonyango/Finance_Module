const assert = require("node:assert/strict");
const test = require("node:test");
const ExcelJS = require("exceljs");
const {
  buildContributionFilename,
  buildContributionWorkbook,
} = require("../src/services/contributionWorkbook");

test("contribution workbook is formatted and contains numeric totals", async () => {
  const generatedAt = new Date("2026-10-25T21:30:00.000Z");
  const workbook = buildContributionWorkbook([
    {
      contribution_date: "2026-10-26",
      member_name: "Felix Ouma",
      amount: "150000.00",
      currency: "KES",
      category: "sunday-offering",
      method: "m_pesa",
      reference: "JMMAA",
    },
  ], {
    title: "St Mary Parish",
    generatedAt,
  });
  const sheet = workbook.getWorksheet("Contribution Register");

  assert.equal(sheet.getCell("A1").value, "St Mary Parish");
  assert.equal(sheet.getCell("A3").value, "Date");
  assert.equal(sheet.getCell("D4").value, "M-Pesa");
  assert.equal(sheet.getCell("F4").value, 150000);
  assert.equal(sheet.getCell("F4").numFmt, "#,##0.00;[Red]-#,##0.00");
  assert.equal(sheet.getCell("A4").value.toISOString(), "2026-10-26T00:00:00.000Z");
  assert.equal(sheet.getCell("F6").value, 150000);
  assert.equal(sheet.getCell("F6").font.bold, true);
  assert.equal(sheet.autoFilter.to.row, 4);
  assert.match(sheet.getCell("A2").value, /Contribution report downloaded/);
  assert.match(sheet.getCell("A2").value, /EAT$/);
  assert.equal(
    buildContributionFilename("St Mary's Parish", generatedAt),
    "St-Mary-s-Parish-2026-10-26.xlsx",
  );

  const buffer = await workbook.xlsx.writeBuffer();
  const reloaded = new ExcelJS.Workbook();
  await reloaded.xlsx.load(buffer);
  assert.equal(
    reloaded.getWorksheet("Contribution Register").getCell("B4").value,
    "Felix Ouma",
  );
});

test("empty contribution workbook explains that no rows matched", () => {
  const workbook = buildContributionWorkbook([]);
  const sheet = workbook.getWorksheet("Contribution Register");

  assert.equal(
    sheet.getCell("A4").value,
    "No contributions match the selected filters.",
  );
  assert.equal(sheet.autoFilter, null);
});
