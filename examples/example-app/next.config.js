const createNextPluginPreval = require('next-plugin-preval/config');
const withNextPluginPreval = createNextPluginPreval();

module.exports = withNextPluginPreval({
  future: { webpack5: true },
});
