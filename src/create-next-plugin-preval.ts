export interface NextPluginPrevalOptions {}

interface WebpackConfig {
  module?: {
    rules: any[];
  };
  [key: string]: any;
}

interface WebpackOptions {
  buildId: string;
  dev: boolean;
  isServer: boolean;
  defaultLoaders: object;
  babel: object;
}

interface NextConfigValue {
  webpack?: (config: WebpackConfig, options: WebpackOptions) => WebpackConfig;
  [key: string]: any;
}

type NextConfig = NextConfigValue | ((...args: any[]) => NextConfigValue);

function createNextPluginPreval(options: NextPluginPrevalOptions) {
  function withNextPluginPreval(_nextConfig?: NextConfig) {
    const normalizedNextConfig =
      typeof _nextConfig === 'function' ? _nextConfig : () => _nextConfig || {};

    return (...args: any[]) => {
      const nextConfig = normalizedNextConfig(...args);

      return {
        ...nextConfig,
        webpack: (config: WebpackConfig, options: WebpackOptions) => {
          const webpackConfig = nextConfig.webpack?.(config, options) || {};

          const rules = webpackConfig.module?.rules;

          if (!rules) {
            throw new Error(
              'Next Plugin Preval could not find webpack rules. This may be an unsupported version of Next.js.'
            );
          }

          rules.push({
            test: /\.preval\.(t|j)sx?$/,
            loader: require.resolve('next-plugin-preval/loader'),
          });

          return webpackConfig;
        },
      };
    };
  }

  return withNextPluginPreval;
}

export default createNextPluginPreval;
