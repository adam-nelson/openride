import {
  request as httpRequest,
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createLocalSupabaseProxyMiddleware } = require('../../scripts/dev-supabase-proxy.cjs') as {
  createLocalSupabaseProxyMiddleware: (targetUrl: string) => (
    request: IncomingMessage,
    response: ServerResponse,
    next: () => void,
  ) => void;
};

async function listen(server: Server): Promise<number> {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected a TCP listener');
  return address.port;
}

async function close(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

async function requestRaw(
  port: number,
  path: string,
  headers: Record<string, string>,
  body: string,
): Promise<{ status: number; headers: IncomingMessage['headers']; body: string }> {
  return new Promise((resolve, reject) => {
    const request = httpRequest({ hostname: '127.0.0.1', port, path, method: 'POST', headers }, (response) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => chunks.push(chunk));
      response.on('end', () => {
        resolve({
          status: response.statusCode ?? 0,
          headers: response.headers,
          body: Buffer.concat(chunks).toString('utf8'),
        });
      });
    });
    request.on('error', reject);
    request.end(body);
  });
}

describe('dev Supabase proxy', () => {
  it('strips the local proxy prefix and forwards Auth requests to loopback', async () => {
    let upstreamRequestPath = '';
    let forwardedApiKey = '';
    let forwardedAuthorization = '';
    let forwardedBody = '';
    let forwardedConnectionNominatedHeader = '';
    const upstream = createServer((request, response) => {
      upstreamRequestPath = request.url ?? '';
      const apiKeyHeader = request.headers.apikey;
      forwardedApiKey = Array.isArray(apiKeyHeader) ? apiKeyHeader[0] ?? '' : apiKeyHeader ?? '';
      const authorizationHeader = request.headers.authorization;
      forwardedAuthorization = Array.isArray(authorizationHeader)
        ? authorizationHeader[0] ?? ''
        : authorizationHeader ?? '';
      const privateHopHeader = request.headers['x-private-hop'];
      forwardedConnectionNominatedHeader = Array.isArray(privateHopHeader)
        ? privateHopHeader[0] ?? ''
        : privateHopHeader ?? '';
      request.setEncoding('utf8');
      request.on('data', (chunk: string) => {
        forwardedBody += chunk;
      });
      request.on('end', () => {
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end('{"ok":true}');
      });
    });
    const upstreamPort = await listen(upstream);
    const proxyMiddleware = createLocalSupabaseProxyMiddleware(`http://127.0.0.1:${upstreamPort}`);
    const preview = createServer((request, response) => {
      proxyMiddleware(request, response, () => {
        response.writeHead(404);
        response.end();
      });
    });
    const previewPort = await listen(preview);

    try {
      const result = await requestRaw(previewPort, '/supabase/auth/v1/otp?flow=sms', {
        apikey: 'test-anon-key',
        authorization: 'Bearer test-access-token',
        'content-type': 'application/json',
        connection: 'keep-alive, x-private-hop',
        'x-private-hop': 'must-not-forward',
        'proxy-connection': 'keep-alive',
      }, JSON.stringify({ phone: '+2348012345678' }));

      expect(result.status).toBe(200);
      expect(upstreamRequestPath).toBe('/auth/v1/otp?flow=sms');
      expect(forwardedApiKey).toBe('test-anon-key');
      expect(forwardedAuthorization).toBe('Bearer test-access-token');
      expect(forwardedConnectionNominatedHeader).toBe('');
      expect(forwardedBody).toBe('{"phone":"+2348012345678"}');
      expect(JSON.parse(result.body)).toEqual({ ok: true });
    } finally {
      await close(preview);
      await close(upstream);
    }
  });

  it('returns a decompressed response without stale encoding or hop-by-hop headers', async () => {
    const compressedBody = gzipSync(Buffer.from('{"ok":true,"source":"compressed"}'));
    const upstream = createServer((_request, response) => {
      response.writeHead(200, {
        'content-type': 'application/json',
        'content-encoding': 'gzip',
        'content-length': compressedBody.length,
        connection: 'x-response-hop',
        'x-response-hop': 'must-not-forward',
      });
      response.end(compressedBody);
    });
    const upstreamPort = await listen(upstream);
    const proxyMiddleware = createLocalSupabaseProxyMiddleware(`http://127.0.0.1:${upstreamPort}`);
    const preview = createServer((request, response) => {
      proxyMiddleware(request, response, () => {
        response.writeHead(404);
        response.end();
      });
    });
    const previewPort = await listen(preview);

    try {
      const result = await fetch(`http://127.0.0.1:${previewPort}/supabase/rest/v1/drivers`);

      expect(result.status).toBe(200);
      expect(result.headers.has('content-encoding')).toBe(false);
      expect(result.headers.has('content-length')).toBe(false);
      expect(result.headers.has('x-response-hop')).toBe(false);
      await expect(result.json()).resolves.toEqual({ ok: true, source: 'compressed' });
    } finally {
      await close(preview);
      await close(upstream);
    }
  });

  it('rejects non-loopback upstream targets', () => {
    expect(() => createLocalSupabaseProxyMiddleware('https://remote.supabase.co')).toThrow(
      'loopback local Supabase target',
    );
  });
});
