const fs = require('fs');
const path = require('path');
const fastify = require('fastify')({ logger: false });

const PORT = process.env.SWAGGER_PORT || 8089;
const SPECS_DIR = path.join(__dirname, 'public', 'specs');

const services = [
  {
    name: 'Yes Boss API',
    slug: 'backend',
    url: process.env.BACKEND_URL || 'http://localhost:4000',
    description: 'Call recording, SMS parsing, location tracking & smart auto-reply',
    port: 4000,
  },
];

fastify.register(require('@fastify/cors'), { origin: true });
fastify.register(require('@fastify/static'), { root: path.join(__dirname, 'public') });

fastify.get('/config', async (request) => {
  const host = request.headers['x-forwarded-host'] || request.hostname;
  const protocol = request.headers['x-forwarded-proto'] || request.protocol || 'http';

  return {
    services: services.map((s) => {
      let serviceUrl = `${protocol}://${host.split(':')[0]}:${s.port}`;

      if (host.includes('.devtunnels.ms')) {
        const tunnelParts = host.split('.');
        const tunnelId = tunnelParts[0].split('-')[0];
        serviceUrl = `${protocol}://${tunnelId}-${s.port}.${tunnelParts.slice(1).join('.')}`;
      }

      return {
        name: s.name,
        slug: s.slug,
        url: serviceUrl,
        description: s.description,
        port: s.port,
        isHidden: s.isHidden || false,
        hasStaticSpec: fs.existsSync(path.join(SPECS_DIR, `${s.slug}.json`)),
      };
    }),
  };
});

fastify.get('/specs/:service', async (request, reply) => {
  const slug = request.params.service.replace('.json', '');
  const filePath = path.join(SPECS_DIR, `${slug}.json`);
  if (!fs.existsSync(filePath)) {
    return reply.status(404).send({ error: `No static spec for "${slug}". Run: node export-specs.js` });
  }
  reply.type('application/json').send(JSON.parse(fs.readFileSync(filePath, 'utf-8')));
});

function getRequestBaseUrl(request) {
  const host = request.headers['x-forwarded-host'] || request.hostname;
  const protocol = request.headers['x-forwarded-proto'] || request.protocol || 'http';
  return `${protocol}://${host}`;
}

function stripHopByHopHeaders(headers) {
  const blocked = new Set(['connection', 'content-length', 'host', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade']);
  return Object.fromEntries(Object.entries(headers).filter(([k]) => !blocked.has(k.toLowerCase())));
}

function getProxyBody(request) {
  if (['GET', 'HEAD'].includes(request.method)) return undefined;
  if (request.body === undefined) return undefined;
  if (Buffer.isBuffer(request.body) || typeof request.body === 'string') return request.body;
  return JSON.stringify(request.body);
}

fastify.get('/proxy-spec/:slug', async (request, reply) => {
  const svc = services.find((s) => s.slug === request.params.slug);
  if (!svc) return reply.status(404).send({ error: 'Service not found' });
  try {
    const res = await fetch(`${svc.url}/api/docs-json`);
    if (!res.ok) throw new Error(`Failed to fetch from ${svc.url}`);
    const spec = await res.json();
    spec.servers = [{ url: `${getRequestBaseUrl(request)}/proxy-api/${svc.slug}`, description: 'Swagger UI proxy' }];
    reply.type('application/json').send(spec);
  } catch (err) {
    reply.status(500).send({ error: `Could not fetch live spec from ${svc.slug}`, details: err.message });
  }
});

fastify.all('/proxy-api/:slug/*', async (request, reply) => {
  const svc = services.find((s) => s.slug === request.params.slug);
  if (!svc) return reply.status(404).send({ error: 'Service not found' });
  const proxiedPath = request.params['*'] ? `/${request.params['*']}` : '';
  const query = request.url.includes('?') ? request.url.slice(request.url.indexOf('?')) : '';
  const targetUrl = `${svc.url}${proxiedPath}${query}`;
  try {
    const res = await fetch(targetUrl, {
      method: request.method,
      headers: stripHopByHopHeaders(request.headers),
      body: getProxyBody(request),
    });
    res.headers.forEach((value, key) => {
      if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(key.toLowerCase())) reply.header(key, value);
    });
    reply.status(res.status)
      .header('Access-Control-Allow-Origin', request.headers.origin || '*')
      .header('Access-Control-Allow-Credentials', 'true')
      .send(Buffer.from(await res.arrayBuffer()));
  } catch (err) {
    reply.status(502).send({ error: `Could not proxy request to ${svc.slug}`, details: err.message, targetUrl });
  }
});

fastify.get('/health/:slug', async (request, reply) => {
  const svc = services.find((s) => s.slug === request.params.slug);
  if (!svc) return reply.status(404).send({ status: 'unknown' });
  try {
    const res = await fetch(`${svc.url}/api/docs-json`, { signal: AbortSignal.timeout(3000) });
    reply.send({ status: res.ok ? 'online' : 'error' });
  } catch {
    reply.send({ status: 'offline' });
  }
});

fastify.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
  if (err) { console.error(err); process.exit(1); }
  console.log(`\n  Yes Boss Swagger UI at http://localhost:${PORT}\n`);
});
