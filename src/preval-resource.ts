import { createMatchPath, loadConfig } from 'tsconfig-paths';
import requireFromString from 'require-from-string';
// @ts-expect-error
import register, { revert } from '@babel/register';
// @ts-expect-error
import { resolvePath as defaultResolvePath } from 'babel-plugin-module-resolver';
import isSerializable from './is-serializable';
import { PrevalError } from './preval-error';

const extensions = ['.js', '.jsx', '.ts', '.tsx'];

const isRecord = (something: unknown): something is Record<string, unknown> =>
  typeof something === 'object' && !!something && !Array.isArray(something);

/**
 * Takes in a file path (aka resource) and pre-evaluates it inside of node via
 * babel + babel-register for on-demand compilation and tsconfig-paths for
 * tsconfig-paths support.
 */
export async function prevalResource(resource: string) {
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
              return matchPath(sourcePath, undefined, undefined, extensions);
            } catch {
              return defaultResolvePath(sourcePath, currentFile, opts);
            }
          }

          return defaultResolvePath(sourcePath, currentFile, opts);
        },
      },
    ] as const);

  register({
    // this is used by `next/babel` preset to conditionally remove loaders.
    // without it, it causes the dreaded `e.charCodeAt is not a function` error.
    // see:
    // - https://github.com/ricokahler/next-plugin-preval/issues/66
    // - https://github.com/vercel/next.js/blob/37d11008250b3b87dfa4625cd228ac173d4d3563/packages/next/build/babel/preset.ts#L65
    caller: { isServer: true },
    presets: ['next/babel', ['@babel/preset-env', { targets: 'node 12' }]],
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
        `require('next');\nmodule.exports = require(${JSON.stringify(
          resource
        )})`,
        `${resource}.preval.js`
      );

      if (!mod.default) {
        throw new PrevalError(
          'No default export. Did you forget to `export default`?'
        );
      }

      return await mod.default;
    } catch (e) {
      if (isRecord(e) && 'stack' in e) {
        // TODO: use the webpack logger. i tried this and it didn't output anything.
        console.error('[next-plugin-preval]', e.stack);
      }

      throw new PrevalError(
        `Failed to pre-evaluate "${resource}". ${e} See above for full stack trace.`
      );
    } finally {
      revert();
    }
  })();

  isSerializable(resource, data);

  return data;
}
