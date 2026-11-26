const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildSummaryReportFilename,
  buildSummaryReportPdf,
} = require("../src/services/summaryReportPdf");

test("summary report filename includes a sanitized name and local date", () => {
  assert.equal(
    buildSummaryReportFilename("St. Mary's Parish", new Date("2026-11-27T00:00:00Z")),
    "St-Mary-s-Parish-summary-2026-11-27.pdf",
  );
});

test("summary report is serialized as a PDF", async () => {
  const content = await buildSummaryReportPdf(
    {
      name: "Example Parish",
      total: 2500,
      contributionCount: 3,
      memberRecordCount: 8,
      contributingMemberCount: 2,
      childCount: 4,
      childLabel: "Centres",
    },
    {},
    new Date("2026-11-27T00:00:00Z"),
  );

  assert.equal(content.subarray(0, 5).toString(), "%PDF-");
  assert.ok(content.length > 1000);
});
