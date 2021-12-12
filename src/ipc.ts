import os from 'os';
import { Socket } from 'net';
import crypto from 'crypto';
import { createIpcRequestHandler } from './create-ipc-request-handler';
// @ts-expect-error these types need updating
import { IPCModule } from 'node-ipc';

type IpcRequest = { resource: string };
type IpcResponse = { result: unknown };
type Message<T> = { id: string; body: T };

function randomId() {
  return crypto.randomBytes(8).toString('hex');
}

function getPath(ipc: typeof import('node-ipc'), id: string) {
  return `${ipc.config.socketRoot}${ipc.config.appspace}${id}`;
}

export interface IpcOptions {
  /**
   * Provide options to `node-ipc` such as enabling the logger by setting
   * `nodeIpcConfig: {silent: false}`
   *
   * See here: https://github.com/RIAEvangelist/node-ipc#ipc-config
   */
  nodeIpcConfig?: Partial<typeof import('node-ipc')['config']>;
}

/**
 * Creates an inter-process communication server between the main build process
 * and separate processes created by next.js for generating pages in parallel.
 *
 * This uses the package [`node-ipc`][gh] and uses Unix sockets/Windows
 * sockets to communicate. A socket ID (to be passed to `createIpcClient`) is
 * returned
 *
 * [gh]: https://github.com/RIAEvangelist/node-ipc
 */
export async function createIpcServer({
  nodeIpcConfig = { silent: true },
}: IpcOptions = {}) {
  const ipc = new IPCModule() as typeof import('node-ipc');
  // const ipc = require('node-ipc').default as typeof import('node-ipc');
  const ipcRequestHandler = createIpcRequestHandler();

  const id = `next-plugin-preval-${randomId()}.${os.hostname()}`;
  Object.assign(ipc.config, nodeIpcConfig, { id });

  const promise = new Promise<void>((resolve, reject) => {
    ipc.serve(getPath(ipc, id), () => resolve());
    ipc.server.on('error', reject);
  });

  ipc.server.on(
    'request',
    async (message: Message<IpcRequest>, socket: Socket) => {
      const result = await ipcRequestHandler(message.body.resource);
      const responseMessage: Message<IpcResponse> = {
        id: message.id,
        body: { result },
      };
      ipc.server.emit(socket, 'response', responseMessage);
    }
  );

  ipc.server.start();

  await promise;
  return id;
}

/**
 * Creates an inter-process communication client between the main build process
 * and separate processes created by next.js for generating pages in parallel.
 *
 * This uses the package [`node-ipc`][gh] and uses Unix sockets/Windows
 * sockets to communicate. Takes in a socket ID and returns an object with a
 * request function.
 *
 * [gh]: https://github.com/RIAEvangelist/node-ipc
 */
export async function createIpcClient(
  id: string,
  { nodeIpcConfig = { silent: true } }: IpcOptions = {}
) {
  const resolvers = new Map<string, (response: IpcResponse) => void>();
  const rejectors = new Set<(error: unknown) => void>();

  const ipc = new IPCModule() as typeof import('node-ipc');
  Object.assign(ipc.config, nodeIpcConfig, { id });

  await new Promise<void>((resolve, reject) => {
    ipc.connectTo(id, getPath(ipc, id), resolve);
    ipc.of[id].on('error', reject);
  });

  ipc.of[id].on('response', (message: Message<IpcResponse>) => {
    const resolver = resolvers.get(message.id);
    if (!resolver) return;

    resolvers.delete(message.id);
    resolver(message.body);
  });

  ipc.of[id].on('error', (error) => {
    for (const rejector of rejectors) {
      rejector(error);
    }
  });

  function request(requestBody: IpcRequest) {
    const messageId = randomId();

    const message: Message<IpcRequest> = {
      id: messageId,
      body: requestBody,
    };

    const promise = new Promise<IpcResponse>((resolve, reject) => {
      rejectors.add(reject);
      resolvers.set(messageId, resolve);
    });

    ipc.of[id].emit('request', message);

    return promise;
  }

  return { request };
}
