const {
  filters: contributionFilters,
  parse: parseContributionFilters,
} = require("./contributionValidators");
const filters = contributionFilters.omit({ page: true, pageSize: true });

function parse(value) {
  return parseContributionFilters(filters, value);
}

module.exports = { parse };
