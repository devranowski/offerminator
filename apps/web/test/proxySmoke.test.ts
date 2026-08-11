// @vitest-environment node

import { fileURLToPath } from 'node:url';
import type { AddressInfo } from 'node:net';

import { createServer, type ViteDevServer } from 'vite';
import { describe, expect, it } from 'vitest';

import { buildApp } from '../../api/src/app.js';
import { createDependencies, startApplication } from '../../api/src/bootstrap.js';
import type { JobRejectionLogger } from '../../api/src/ingestion/jobRejectionLogger.js';
import { createViteConfig } from '../vite.config.js';

const WEB_ROOT = fileURLToPath(new URL('..', import.meta.url));

const silentRejectionLogger: JobRejectionLogger = {
  logJobRejected: () => undefined,
};

describe('Vite API proxy', () => {
  it('forwards an approved jobs request to the ingested Fastify application', async () => {
    const dependencies = createDependencies({ host: '127.0.0.1', port: 0 }, silentRejectionLogger);
    const api = await buildApp(dependencies);
    let vite: ViteDevServer | undefined;

    try {
      await startApplication({
        app: api,
        ingestionService: dependencies.ingestionService,
        config: dependencies.config,
      });

      const apiPort = getServerPort(api.server.address(), 'Fastify');
      const viteConfig = createViteConfig(`http://127.0.0.1:${apiPort}`);

      vite = await createServer({
        ...viteConfig,
        configFile: false,
        logLevel: 'silent',
        root: WEB_ROOT,
        server: {
          ...viteConfig.server,
          host: '127.0.0.1',
          port: 0,
          strictPort: true,
        },
      });
      await vite.listen();

      const vitePort = getServerPort(vite.httpServer?.address() ?? null, 'Vite');
      const response = await fetch(`http://127.0.0.1:${vitePort}/api/jobs?country=GB`);
      const body: unknown = await response.json();

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        total: 1,
        items: [
          {
            title: 'Agile Project Lead',
            location: {
              kind: 'remote',
              country: 'GB',
            },
          },
        ],
      });
    } finally {
      try {
        await vite?.close();
      } finally {
        await api.close();
      }
    }
  }, 15_000);
});

function getServerPort(address: AddressInfo | string | null, serverName: string): number {
  if (address === null || typeof address === 'string') {
    throw new Error(`${serverName} did not expose a TCP port.`);
  }

  return address.port;
}
