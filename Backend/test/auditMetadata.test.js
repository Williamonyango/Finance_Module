const assert = require("node:assert/strict");
const test = require("node:test");
const {
  buildContributionAuditMetadata,
  buildHierarchyAuditMetadata,
} = require("../src/services/auditMetadata");

const user = {
  id: "user-id",
  name: "Jordan Admin",
  role: "parish",
};

test("hierarchy audit metadata describes a status change without raw IDs", () => {
  const metadata = buildHierarchyAuditMetadata({
    action: "status",
    resource: "members",
    current: {
      id: "member-id",
      name: "Felix Ouma",
      phone: "0712345678",
      status: "active",
      groupId: "group-id",
    },
    input: { status: "inactive" },
    user,
  });

  assert.equal(
    metadata.summary,
    'Changed the status of member "Felix Ouma" from Active to Inactive.',
  );
  assert.equal(metadata.performedBy.name, "Jordan Admin");
  assert.deepEqual(metadata.changes, [
    { field: "Status", from: "Active", to: "Inactive" },
  ]);
  assert.equal(JSON.stringify(metadata).includes("member-id"), false);
  assert.equal(JSON.stringify(metadata).includes("group-id"), false);
});

test("contribution void metadata includes readable contribution details", () => {
  const metadata = buildContributionAuditMetadata({
    action: "void",
    current: {
      id: "contribution-id",
      memberId: "member-id",
      memberName: "Felix Ouma",
      amount: "150000.00",
      currency: "KES",
      category: "sunday-offering",
      date: "2026-10-26",
      method: "m_pesa",
      reference: "JMMAA",
    },
    reason: "Recorded in error",
    user,
  });

  assert.equal(
    metadata.summary,
    "Voided KES 150,000 contribution for Felix Ouma.",
  );
  assert.equal(metadata.details.Category, "Sunday Offering");
  assert.equal(metadata.details["Payment method"], "M-Pesa");
  assert.equal(metadata.details["Void reason"], "Recorded in error");
  assert.equal(JSON.stringify(metadata).includes("contribution-id"), false);
  assert.equal(JSON.stringify(metadata).includes("member-id"), false);
});
