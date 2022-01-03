import type webpack from 'webpack';
interface PrevalLoaderOptions {
    extensions?: string[];
    tsConfigFile?: string;
}
export declare function _prevalLoader(_: string, resource: string, options: PrevalLoaderOptions): Promise<string>;
declare const loader: (this: webpack.LoaderContext<PrevalLoaderOptions>, content: string) => void;
export default loader;
