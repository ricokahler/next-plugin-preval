"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

function createNextPluginPreval(pluginOption) {
  function withNextPluginPreval(_nextConfig) {
    const normalizedNextConfig = typeof _nextConfig === 'function' ? _nextConfig : () => _nextConfig || {};
    return (...args) => {
      const nextConfig = normalizedNextConfig(...args);
      return { ...nextConfig,
        webpack: (config, options) => {
          var _nextConfig$webpack, _webpackConfig$module;

          const webpackConfig = ((_nextConfig$webpack = nextConfig.webpack) === null || _nextConfig$webpack === void 0 ? void 0 : _nextConfig$webpack.call(nextConfig, config, options)) || config;
          const rules = (_webpackConfig$module = webpackConfig.module) === null || _webpackConfig$module === void 0 ? void 0 : _webpackConfig$module.rules;

          if (!rules) {
            throw new Error('Next Plugin Preval could not find webpack rules. Please file an issue.');
          }

          rules.push({
            test: /\.preval\.(t|j)sx?$/,
            loader: require.resolve('./loader'),
            options: pluginOption
          });
          return webpackConfig;
        }
      };
    };
  }

  return withNextPluginPreval;
}

var _default = createNextPluginPreval;
exports.default = _default;
//# sourceMappingURL=create-next-plugin-preval.js.map