import assert from "node:assert/strict";
import test from "node:test";
import { getGreeting } from "../src/services/greeting.js";

test("greeting uses the current time period and signed-in first name", () => {
  assert.equal(
    getGreeting("William Onyango", new Date(2026, 0, 1, 8)),
    "Good morning, William.",
  );
  assert.equal(
    getGreeting("William Onyango", new Date(2026, 0, 1, 14)),
    "Good afternoon, William.",
  );
  assert.equal(
    getGreeting("William Onyango", new Date(2026, 0, 1, 20)),
    "Good evening, William.",
  );
});

test("greeting has a safe fallback when a name is unavailable", () => {
  assert.equal(
    getGreeting("", new Date(2026, 0, 1, 8)),
    "Good morning, there.",
  );
});
