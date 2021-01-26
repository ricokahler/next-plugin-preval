import fs from 'fs';
import type webpack from 'webpack';
import requireFromString from 'require-from-string';
// @ts-ignore
import { resolvePath as defaultResolvePath } from 'babel-plugin-module-resolver';
import { transform } from '@babel/core';
import { addHook } from 'pirates';
import { getOptions } from 'loader-utils';
import { createMatchPath, loadConfig } from 'tsconfig-paths';
import { isSerializableProps } from './is-serializable-props';

class PrevalError extends Error {}

interface PrevalLoaderOptions {
  extensions?: string[];
}

const defaultExtensions = ['.js', '.jsx', '.ts', '.tsx'];

export async function _prevalLoader(
  content: string,
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
            return matchPath(sourcePath, require, fs.existsSync, extensions);
          }

          return defaultResolvePath(sourcePath, currentFile, opts);
        },
      },
    ] as const);

  const hook = (code: string, filename?: string) => {
    const result = transform(code, {
      filename: filename || 'preval-file.ts',
      presets: ['next/babel'],
      plugins: [
        // conditionally add
        ...(moduleResolver ? [moduleResolver] : []),
      ],
    });

    if (!result?.code) {
      throw new PrevalError(
        `Could not get babel file result ${filename ? `for ${filename}` : ''} `
      );
    }

    return result.code;
  };

  const revert = addHook(hook, { exts: extensions });

  const data = await (async () => {
    try {
      const mod = requireFromString(hook(content), `${resource}.preval-run.js`);

      if (!mod.default) {
        throw new PrevalError(
          'No default export. Did you forget to `export default`?'
        );
      }

      return await mod.default;
    } catch (e) {
      throw new PrevalError(`Failed to pre-evaluate "${resource}". ${e}`);
    } finally {
      revert();
    }
  })();

  isSerializableProps(resource, 'preval', data);

  return `module.exports = JSON.parse('${JSON.stringify(data)}')`;
}

const loader: webpack.loader.Loader = function (content) {
  const callback = this.async();

  if (!callback) {
    throw new PrevalError('Async was not supported.');
  }

  _prevalLoader(content.toString(), this.resource, getOptions(this))
    .then((result) => {
      callback(null, result);
    })
    .catch((e) => {
      callback(e);
    });
};

export default loader;
