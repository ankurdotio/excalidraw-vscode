const browserConfig = require("./webpack.config");

/** @type {import('webpack').Configuration} */
module.exports = {
  ...browserConfig,
  target: "node",
  entry: "./src/extension-node.ts",
  output: {
    ...browserConfig.output,
    filename: "extension-node.js",
  },
  resolve: {
    ...browserConfig.resolve,
    fallback: {},
  },
};
