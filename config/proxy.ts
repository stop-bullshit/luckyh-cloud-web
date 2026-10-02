export default {
  dev: {
    '/api/': {
      target: process.env.API_TARGET || 'http://127.0.0.1:8080',
      changeOrigin: true,
    },
  },
  test: {
    '/api/': {
      target: process.env.API_TARGET || 'http://127.0.0.1:8080',
      changeOrigin: true,
    },
  },
  pre: {
    '/api/': {
      target: process.env.API_TARGET || 'http://127.0.0.1:8080',
      changeOrigin: true,
    },
  },
};
