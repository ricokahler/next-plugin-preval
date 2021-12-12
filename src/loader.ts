import type webpack from 'webpack';
import { getOptions } from 'loader-utils';
import { createIpcClient, IpcOptions } from './ipc';
import { PrevalError } from './preval-error';

interface PrevalLoaderOptions {
  ipcServerId: string;
  ipcOptions?: IpcOptions;
}

export async function _prevalLoader(
  _: string,
  resource: string,
  { ipcServerId, ipcOptions }: PrevalLoaderOptions
) {
  const client = await createIpcClient(ipcServerId, ipcOptions);
  const { result } = await client.request({ resource });

  // NOTE we wrap in JSON.parse because that's faster for JS engines to parse
  // over javascript. see here https://v8.dev/blog/cost-of-javascript-2019#json
  //
  // We wrap in JSON.stringify twice. Once for a JSON string and once again for
  // a JSON string that can be embeddable in javascript.
  return `module.exports = JSON.parse(${JSON.stringify(
    JSON.stringify(result)
  )})`;
}

const loader = function (
  this: webpack.LoaderContext<PrevalLoaderOptions>,
  content: string
) {
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
