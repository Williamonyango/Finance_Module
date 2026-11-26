const assert = require("node:assert/strict");
const test = require("node:test");
const { generateUsername } = require("../src/services/hierarchyService");
const {
  parse,
  parishCreate,
} = require("../src/validators/hierarchyValidators");

test("generated usernames include a normalized entity first name and unique identifier", () => {
  const first = generateUsername("Église Parish");
  const second = generateUsername("Église Parish");
  const suffix = "ab12";

  assert.match(first, /^eglise[a-z]{2}[0-9]{2}$/);
  assert.notEqual(first, second);
  assert.equal(
    generateUsername("St. Mary Parish", suffix),
    `maryparish${suffix}`,
  );
  assert.equal(
    generateUsername("St. Albert Ulanda", suffix),
    `albertulanda${suffix}`,
  );
  assert.equal(generateUsername("st patrick", suffix), `patrick${suffix}`);
  assert.equal(generateUsername("ST. Patrick", suffix), `patrick${suffix}`);
});

test("generated usernames fall back to a safe prefix for names without letters", () => {
  assert.match(generateUsername("... Group"), /^entity[a-z]{2}[0-9]{2}$/);
});

test("parish creation accepts the generated username preview", () => {
  const username = generateUsername("St. Mary Parish", "ab12");
  const input = parse(parishCreate, {
    name: "St. Mary Parish",
    administrator: {
      name: "Parish Administrator",
      username,
      password: "secure-password",
    },
  });

  assert.equal(input.administrator.username, username);
});
