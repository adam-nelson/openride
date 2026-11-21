const SUPABASE_PROXY_PREFIX = '/supabase';
const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-length',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'proxy-connection',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

function connectionHeaders(value) {
  return new Set(
    (value || '')
      .split(',')
      .map((header) => header.trim().toLowerCase())
      .filter(Boolean),
  );
}

function createLocalSupabaseProxyMiddleware(targetUrl) {
  const target = new URL(targetUrl);
  if (target.protocol !== 'http:' || !['localhost', '127.0.0.1', '::1'].includes(target.hostname)) {
    throw new Error('The Expo web proxy only supports a loopback local Supabase target.');
  }

  return function proxyLocalSupabase(req, res, next) {
    const requestUrl = new URL(req.url || '/', 'http://metro.local');
    if (requestUrl.pathname !== SUPABASE_PROXY_PREFIX && !requestUrl.pathname.startsWith(`${SUPABASE_PROXY_PREFIX}/`)) {
      next();
      return;
    }

    const upstreamPath = `${requestUrl.pathname.slice(SUPABASE_PROXY_PREFIX.length) || '/'}${requestUrl.search}`;
    const bodyChunks = [];
    req.on('data', (chunk) => bodyChunks.push(Buffer.from(chunk)));
    req.on('end', async () => {
      try {
        const requestConnectionHeaders = connectionHeaders(req.headers.connection);
        const headers = new Headers();
        for (const [name, value] of Object.entries(req.headers)) {
          if (!value || HOP_BY_HOP_HEADERS.has(name) || requestConnectionHeaders.has(name)) continue;
          headers.set(name, Array.isArray(value) ? value.join(', ') : value);
        }
        const body = Buffer.concat(bodyChunks);
        const upstreamResponse = await fetch(new URL(upstreamPath, target), {
          method: req.method,
          headers,
          body: ['GET', 'HEAD'].includes(req.method || '') ? undefined : body,
        });
        res.statusCode = upstreamResponse.status;
        res.removeHeader('content-length');
        res.removeHeader('content-encoding');
        res.removeHeader('transfer-encoding');
        const responseConnectionHeaders = connectionHeaders(upstreamResponse.headers.get('connection'));
        upstreamResponse.headers.forEach((value, name) => {
          if (HOP_BY_HOP_HEADERS.has(name) || responseConnectionHeaders.has(name)) return;
          if (name === 'content-encoding' || name === 'content-length') return;
          res.setHeader(name, value);
        });
        if (!['HEAD'].includes(req.method || '') && ![204, 304].includes(upstreamResponse.status)) {
          res.setHeader('transfer-encoding', 'chunked');
        }
        res.end(Buffer.from(await upstreamResponse.arrayBuffer()));
      } catch {
        if (res.headersSent) return;
        res.statusCode = 502;
        res.setHeader('content-type', 'text/plain; charset=utf-8');
        res.end('Local Supabase is unavailable.');
      }
    });
  };
}

module.exports = { createLocalSupabaseProxyMiddleware };
