const { getDefaultConfig } = require('expo/metro-config');

const { createLocalSupabaseProxyMiddleware } = require('./scripts/dev-supabase-proxy.cjs');

const config = getDefaultConfig(__dirname);

if (process.env.NODE_ENV !== 'production') {
  const localSupabaseUrl = process.env.EXPO_LOCAL_SUPABASE_URL || 'http://127.0.0.1:54321';
  const proxy = createLocalSupabaseProxyMiddleware(localSupabaseUrl);
  const enhanceMiddleware = config.server?.enhanceMiddleware;

  config.server = {
    ...config.server,
    enhanceMiddleware(middleware, server) {
      const withSupabaseProxy = (request, response, next) => {
        if (request.url?.startsWith('/supabase')) {
          proxy(request, response, next);
          return;
        }
        middleware(request, response, next);
      };
      return enhanceMiddleware ? enhanceMiddleware(withSupabaseProxy, server) : withSupabaseProxy;
    },
  };
}

module.exports = config;
