// index.js
const axios = require('axios');
const url = require('url');

module.exports = async function (context, req) {
  const targetA = 'https://devcontainera.azure.com';
  const targetB = 'https://devcontainerb.azure.com';

  // Parse original URL to forward path + query
  const pathname = url.parse(req.url).pathname;
  const relativePath = pathname.replace('/api/proxy', ''); // Remove proxy prefix

  let targetUrl;
  if (relativePath.startsWith('/b') || relativePath.includes('containerb')) {
    targetUrl = `${targetB}${relativePath}`;
  } else {
    targetUrl = `${targetA}${relativePath}`; // default to A
  }

  try {
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: {
        ...req.headers,
        host: url.parse(targetUrl).host, // rewrite Host header
        'x-forwarded-for': req.headers['x-forwarded-for'] || context.req.connection?.remoteAddress,
        'x-forwarded-host': url.parse(targetUrl).host,
      },
      responseType: 'stream', // preserves binary data (images, etc.)
      validateStatus: null, // don't throw on 4xx/5xx
    });

    context.res = {
      status: response.status,
      headers: {
        ...response.headers,
        'content-type': response.headers['content-type'],
        'x-proxied-by': 'azure-function',
      },
      body: response.data, // stream passthrough
    };
  } catch (error) {
    context.log.error('Proxy error:', error.message);
    context.res = {
      status: 502,
      body: { error: 'Bad Gateway', message: error.message },
      headers: { 'content-type': 'application/json' },
    };
  }
};