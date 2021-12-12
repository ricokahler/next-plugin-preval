import { prevalResource } from './preval-resource';

export function createIpcRequestHandler() {
  const inflightResources = new Map<string, Set<(result: unknown) => void>>();
  const resolvedResources = new Map<string, unknown>();

  return async function ipcRequestHandler(resource: string): Promise<unknown> {
    if (resolvedResources.has(resource)) {
      return resolvedResources.get(resource);
    }

    const inflight = inflightResources.get(resource);
    if (inflight) {
      return new Promise((resolve) => {
        inflight.add(resolve);
      });
    }

    const inflightRequests = new Set<(result: unknown) => void>();
    inflightResources.set(resource, inflightRequests);
    const result = await prevalResource(resource);
    resolvedResources.set(resource, result);

    for (const resolver of inflightRequests) {
      resolver(result);
    }
    inflightResources.delete(resource);

    return result;
  };
}
