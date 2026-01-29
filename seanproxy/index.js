// index.js
const axios = require('axios');
const url = require('url');

module.exports = async function (context, req) {
  // const targetA = 'https://devcontainera.azure.com';
  const targetA = 'https://n8n-app-test-east2.calmwater-92abf6cd.eastus2.azurecontainerapps.io/';
  const targetB = 'https://devcontainerb.azure.com';

  // Parse original URL to forward path + query
  const path = req.params.path || '';
  const query = req.url.split('?')[1] || '';
  const pathname = path + (query ? `?${query}` : '');
  console.log('Proxying request for path:', pathname);
  const relativePath = pathname.replace('/api/proxy', ''); // Remove proxy prefix

  let targetUrl;
  if (relativePath.startsWith('/b') || relativePath.includes('containerb')) {
    targetUrl = `${targetB}${relativePath}`;
  } else {
    targetUrl = `${targetA}${relativePath}`; // default to A
  }
  console.log('TargetUrl:', targetUrl);

  try {
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: {
        ...req.headers,
        host: url.host, // rewrite Host header
        'x-forwarded-for': req.headers['x-forwarded-for'] || context.req.connection?.remoteAddress,
        'x-forwarded-host': url.host,
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