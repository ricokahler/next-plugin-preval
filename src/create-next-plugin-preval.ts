import { createIpcServer, IpcOptions } from './ipc';
import { PrevalError } from './preval-error';

interface NextPluginPrevalOptions extends IpcOptions {}

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
  generateBuildId?: (
    ...args: unknown[]
  ) => string | null | Promise<string | null>;
  [key: string]: any;
}

type NextConfig = NextConfigValue | ((...args: any[]) => NextConfigValue);

function createNextPluginPreval({
  // ...other options in the future
  ...ipcOptions
}: NextPluginPrevalOptions = {}) {
  function withNextPluginPreval(_nextConfig?: NextConfig) {
    const normalizedNextConfig =
      typeof _nextConfig === 'function' ? _nextConfig : () => _nextConfig || {};

    return (...args: any[]): NextConfigValue => {
      const nextConfig = normalizedNextConfig(...args);

      let ipcServerId: string | undefined;

      return {
        ...nextConfig,
        // hi-jack `generateBuildId` because it allows a promise,
        // the `webpack` config option does not allow promises
        generateBuildId: async (...args: unknown[]) => {
          // sneak in an await here
          ipcServerId = await createIpcServer(ipcOptions);

          // then run the provided `generateBuildId` function
          const buildId = await nextConfig.generateBuildId?.(...args);
          return buildId || null;
        },
        webpack: (config: WebpackConfig, options: WebpackOptions) => {
          // this should always be defined because of the above.
          if (!ipcServerId) {
            throw new PrevalError(
              'Next Plugin Preval could not to start IPC caching server before webpack ran. Please file an issue.'
            );
          }

          const webpackConfig = nextConfig.webpack?.(config, options) || config;
          const rules = webpackConfig.module?.rules;

          if (!rules) {
            throw new PrevalError(
              'Next Plugin Preval could not find webpack rules. Please file an issue.'
            );
          }

          rules.push({
            test: /\.preval\.(t|j)sx?$/,
            loader: require.resolve('./loader'),
            options: { ipcServerId, ipcOptions },
          });

          return webpackConfig;
        },
      };
    };
  }

  return withNextPluginPreval;
}

export default createNextPluginPreval;
