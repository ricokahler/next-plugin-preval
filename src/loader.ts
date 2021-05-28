import fs from 'fs';
import type webpack from 'webpack';
import requireFromString from 'require-from-string';
// @ts-expect-error
import { resolvePath as defaultResolvePath } from 'babel-plugin-module-resolver';
import { getOptions } from 'loader-utils';
import { createMatchPath, loadConfig } from 'tsconfig-paths';
import isSerializable from './is-serializable';
// @ts-expect-error
import register, { revert } from '@babel/register';

class PrevalError extends Error {}

interface PrevalLoaderOptions {
  extensions?: string[];
}

const defaultExtensions = ['.js', '.jsx', '.ts', '.tsx'];

const readJson = (filename: string) => {
  try {
    return require(filename);
  } catch {
    return undefined;
  }
};

const fileExists = (filename: string) => {
  try {
    return fs.existsSync(filename);
  } catch {
    return false;
  }
};

export async function _prevalLoader(
  _: string,
  resource: string,
  options: PrevalLoaderOptions
) {
  const { extensions = defaultExtensions } = options;

  const configLoaderResult = loadConfig();

  const configLoaderSuccessResult =
    configLoaderResult.resultType === 'failed' ? null : configLoaderResult;

  const matchPath =
    configLoaderSuccessResult &&
    createMatchPath(
      configLoaderSuccessResult.absoluteBaseUrl,
      configLoaderSuccessResult.paths
    );

  const moduleResolver =
    configLoaderSuccessResult &&
    ([
      'module-resolver',
      {
        extensions,
        resolvePath: (sourcePath: string, currentFile: string, opts: any) => {
          if (matchPath) {
            try {
              return matchPath(sourcePath, readJson, fileExists, extensions);
            } catch {
              return defaultResolvePath(sourcePath, currentFile, opts);
            }
          }

          return defaultResolvePath(sourcePath, currentFile, opts);
        },
      },
    ] as const);

  register({
    presets: ['next/babel', ['@babel/preset-env', { targets: 'node 10' }]],
    plugins: [
      // conditionally add
      ...(moduleResolver ? [moduleResolver] : []),
    ],
    rootMode: 'upward-optional',
    // TODO: this line may cause performance issues, it makes babel compile
    // things `node_modules` however this is currently required for setups that
    // include the use of sym-linked deps as part of workspaces (both yarn and
    // npm)
    ignore: [],
    // disables the warning "Babel has de-optimized the styling of..."
    compact: true,
    extensions,
  });

  const data = await (async () => {
    try {
      const mod = requireFromString(
        `module.exports = require(${JSON.stringify(resource)})`,
        `${resource}.preval.js`
      );

      if (!mod.default) {
        throw new PrevalError(
          'No default export. Did you forget to `export default`?'
        );
      }

      return await mod.default;
    } catch (e) {
      // TODO: use the webpack logger. i tried this and it didn't output anything.
      console.error('[next-plugin-preval]', e.stack);

      throw new PrevalError(
        `Failed to pre-evaluate "${resource}". ${e} See above for full stack trace.`
      );
    } finally {
      revert();
    }
  })();

  isSerializable(resource, data);

  // NOTE we wrap in JSON.parse because that's faster for JS engines to parse
  // over javascript. see here https://v8.dev/blog/cost-of-javascript-2019#json
  //
  // We wrap in JSON.stringify twice. Once for a JSON string and once again for
  // a JSON string that can be embeddable in javascript.
  return `module.exports = JSON.parse(${JSON.stringify(JSON.stringify(data))})`;
}

const loader: webpack.loader.Loader = function (content) {
  const callback = this.async();

  this.cacheable(false);

  if (!callback) {
    throw new PrevalError(
      'Async was not supported by webpack. Please open an issue in next-plugin-preval.'
    );
  }

  _prevalLoader(content.toString(), this.resourcePath, getOptions(this))
    .then((result) => {
      callback(null, result);
    })
    .catch((e) => {
      callback(e);
    });
};

export default loader;
