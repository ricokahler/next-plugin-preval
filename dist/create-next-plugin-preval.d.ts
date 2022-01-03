interface NextPluginPrevalOptions {
    tsConfigFile?: string;
}
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
declare type NextConfig = NextConfigValue | ((...args: any[]) => NextConfigValue);
declare function createNextPluginPreval(pluginOption?: NextPluginPrevalOptions): (_nextConfig?: NextConfig | undefined) => (...args: any[]) => NextConfigValue;
export default createNextPluginPreval;
