# Swagger Setup Guide (NestJS + Fastify Microservices)

> Reusable blueprint for replicating the Guardian Swagger setup in any new NestJS project.
> Written for AI code editors: every section is copy-paste ready. Replace `<PLACEHOLDERS>`.

This pattern gives you:
1. **Per-service Swagger UI** — each service exposes its own `/api/docs` + `/api/docs-json`.
2. **Rich per-service docs** — tags, examples, bearer auth, response envelope DTOs.
3. **Aggregator UI** — one standalone app that lists all services, fetches live specs, proxies "Try it out" through a single public port (for dev tunnels / LAN sharing).
4. **Static spec export** — snapshot OpenAPI JSON to disk for offline/CI use.

---

## Part 1 — Install

Per NestJS service:

```bash
pnpm add @nestjs/swagger
```

Aggregator app (standalone, no Nest):

```bash
pnpm add fastify @fastify/static @fastify/cors
```

---

## Part 2 — Per-Service Swagger (in `main.ts`)

Drop this into each service's `bootstrap()`, after the global pipes/filters/interceptors and before `app.listen()`.

```ts
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('<SERVICE TITLE>')
  .setDescription(
    `<One-line purpose of the service>.

**Core flows:**
- **<Flow name>** — \`POST /x\` → \`POST /y\`

**Response envelope** — All responses are wrapped:
\`\`\`json
{ "data": ..., "message": "...", "status": "success", "statusCode": 200 }
\`\`\`

**Authorization** — Include \`Authorization: Bearer <accessToken>\` header.`,
  )
  .setVersion('1.0')
  .addServer('/', 'Local dev')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Paste the access token from /auth/login',
    },
    'bearer', // <- security scheme name, reference it in @ApiBearerAuth('bearer')
  )
  // Numbered tags so tagsSorter:'alpha' keeps a logical order
  .addTag('[1] <Group> | <Subgroup>', '<what this group does>')
  .addTag('[2] <Group> | <Subgroup>', '<what this group does>')
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document, {
  swaggerOptions: {
    persistAuthorization: true,   // keep token across page reloads
    displayRequestDuration: true,
    tagsSorter: 'alpha',
    operationsSorter: 'method',
  },
});
```

This also auto-exposes the raw spec at **`/api/docs-json`** — the aggregator + export script depend on it.

> **Tag trick:** prefix tags with `[1]`, `[2]`, … because `tagsSorter: 'alpha'` sorts alphabetically. The numeric prefix forces your intended order. Use `|` to create visual group/subgroup nesting (e.g. `[1] Civilian Related | Auth`).

> **Global prefix note:** if you call `app.setGlobalPrefix('api/v1')`, the Swagger path `api/docs` is NOT prefixed (it is registered separately). Routes inside the spec WILL show the prefix. Keep them distinct.

---

## Part 3 — Decorating Controllers

```ts
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('[1] <Group> | <Subgroup>')   // must match a tag added in main.ts
@Controller('auth')
export class AuthController {
  @Post('otp/send')
  @ApiOperation({ summary: '<short imperative summary>' })
  @ApiBody({
    type: SendOtpDto,
    examples: {
      default: { value: { countryCode: '+91', phone: '9898789876' } },
      'with-mfa': {
        summary: 'With MFA enabled',
        value: { countryCode: '+91', phone: '9898789876', mfaCode: '654321' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'OTP dispatched', type: OtpSendResponseDto })
  @ApiResponse({ status: 400, description: 'Rate limit exceeded (5/hour)' })
  sendOtp(@Body() dto: SendOtpDto) { /* ... */ }
}
```

For protected routes add `@ApiBearerAuth('bearer')` (name must match `addBearerAuth(..., 'bearer')`):

```ts
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Get('me')
getProfile() { /* ... */ }
```

---

## Part 4 — Decorating DTOs

Use `@ApiProperty` (required) / `@ApiPropertyOptional` (optional). Always give an `example` — it powers the "Try it out" prefill.

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class LoginDto {
  @ApiPropertyOptional({ description: 'Email (alternative to phone)', example: 'jane@example.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ minLength: 8, example: 'SuperSecret1' })
  @IsString()
  @MinLength(8)
  password: string;
}
```

### Shared response-envelope DTOs

Put these in a shared package (e.g. `@guardian/common`) so the documented schema matches the `ResponseInterceptor` envelope:

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SuccessResponseDto<T = any> {
  @ApiProperty() data: T;
  @ApiProperty({ default: 'Operation successful' }) message: string;
  @ApiProperty({ default: 'success' }) status: string;
  @ApiProperty() statusCode: number;
}

export class ErrorResponseDto {
  @ApiPropertyOptional() data: any;
  @ApiProperty() message: string | string[];
  @ApiProperty({ default: 'error' }) status: string;
  @ApiProperty() statusCode: number;
}
```

---

## Part 5 — Aggregator App (multi-service UI)

Standalone Fastify app (no Nest). Lists every service, serves the Swagger UI frontend, fetches live specs, and proxies "Try it out" through one port — so only that one port needs to be public via a dev tunnel.

### `package.json`

```json
{
  "name": "swagger-ui",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "node server.js",
    "start": "node server.js"
  },
  "dependencies": {
    "fastify": "^4.28.0",
    "@fastify/static": "^7.0.0",
    "@fastify/cors": "^9.0.0"
  }
}
```

### `server.js`

```js
const fs = require('fs');
const path = require('path');
const fastify = require('fastify')({ logger: false });

const PORT = process.env.SWAGGER_PORT || 8089;
const SPECS_DIR = path.join(__dirname, 'public', 'specs');

// ---- Register every service here ----
const services = [
  { name: 'Identity Service',      slug: 'identity',      url: process.env.IDENTITY_URL      || 'http://localhost:3001', description: 'Auth, users & profile',        port: 3001 },
  { name: 'Emergency Service',     slug: 'emergency',     url: process.env.EMERGENCY_URL     || 'http://localhost:3002', description: 'SOS & incidents',              port: 3002 },
  // ...add the rest. `isHidden: true` keeps a service out of the UI list but still proxyable.
];

fastify.register(require('@fastify/cors'), { origin: true });
fastify.register(require('@fastify/static'), { root: path.join(__dirname, 'public') });

// Frontend config — returns service URLs relative to the request host (LAN/tunnel-safe)
fastify.get('/config', async (request) => {
  const host = request.headers['x-forwarded-host'] || request.hostname;
  const protocol = request.headers['x-forwarded-proto'] || request.protocol || 'http';

  return {
    services: services.map((s) => {
      let serviceUrl = `${protocol}://${host.split(':')[0]}:${s.port}`;

      // Auto-detect Dev Tunnels: swap port in the subdomain (br1wggdj-8089 -> br1wggdj-3001)
      if (host.includes('.devtunnels.ms')) {
        const tunnelParts = host.split('.');
        const tunnelId = tunnelParts[0].split('-')[0];
        serviceUrl = `${protocol}://${tunnelId}-${s.port}.${tunnelParts.slice(1).join('.')}`;
      }

      return {
        name: s.name, slug: s.slug, url: serviceUrl, description: s.description,
        port: s.port, isHidden: s.isHidden || false,
        hasStaticSpec: fs.existsSync(path.join(SPECS_DIR, `${s.slug}.json`)),
      };
    }),
  };
});

// Serve a static spec snapshot:  GET /specs/identity -> public/specs/identity.json
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
  const blocked = new Set(['connection','content-length','host','keep-alive','proxy-authenticate','proxy-authorization','te','trailer','transfer-encoding','upgrade']);
  return Object.fromEntries(Object.entries(headers).filter(([k]) => !blocked.has(k.toLowerCase())));
}

function getProxyBody(request) {
  if (['GET', 'HEAD'].includes(request.method)) return undefined;
  if (request.body === undefined) return undefined;
  if (Buffer.isBuffer(request.body) || typeof request.body === 'string') return request.body;
  return JSON.stringify(request.body);
}

// Fetch a live spec and rewrite its `servers` to point back at THIS proxy
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

// Proxy "Try it out" requests through this server to the local service
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
      if (!['content-encoding','content-length','transfer-encoding'].includes(key.toLowerCase())) reply.header(key, value);
    });
    reply.status(res.status)
      .header('Access-Control-Allow-Origin', request.headers.origin || '*')
      .header('Access-Control-Allow-Credentials', 'true')
      .send(Buffer.from(await res.arrayBuffer()));
  } catch (err) {
    reply.status(502).send({ error: `Could not proxy request to ${svc.slug}`, details: err.message, targetUrl });
  }
});

// Health check (server-side to avoid browser CORS)
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
  console.log(`\n  Swagger UI Aggregator running at http://localhost:${PORT}\n`);
});
```

### Why the proxy?

- Browser-side Swagger "Try it out" calls hit different ports → CORS + multiple public tunnels needed.
- Routing through `/proxy-api/:slug/*` means **only port `8089` must be public**. The server rewrites each spec's `servers` to itself, then forwards requests to the local service.
- Dev-tunnel detection rewrites subdomain ports so it works through VS Code / `devtunnel` URLs.

---

## Part 5b — Aggregator Frontend (`public/index.html`)

Single static page (stock `swagger-ui-dist` via unpkg + vanilla JS). Two views:

1. **Dashboard** — card grid of services with live health dots + a **Static / Live mode toggle**.
2. **Swagger view** — embedded Swagger UI with a topbar **service switcher dropdown** + mode badge.

### Static vs Live mode

| | Static Docs | Live Mode |
|---|---|---|
| Spec source | `/specs/:slug` (exported JSON on disk) | `/proxy-spec/:slug` (fetched live, `servers` rewritten to proxy) |
| Services running? | **No** — reads snapshots from `export-specs.js` | **Yes** — required |
| "Try it out" | Disabled (`supportedSubmitMethods: []`) | Enabled (routed through `/proxy-api/:slug/*`) |
| Use case | Share/read API offline, CI artifacts, diffing | Real requests against running stack / tunnel |

The toggle just flips `currentMode`; `getSpecUrl()` picks the spec endpoint and `loadSwagger()` enables/disables submit methods accordingly. Cards in static mode grey out if no exported spec exists (`hasStaticSpec` from `/config`).

### Service switching

- **Dashboard**: click any card → `openService(slug)`.
- **Inside Swagger view**: the topbar `<select>` (`#service-selector`, populated from non-`isHidden` services) re-calls `openService` on change — switch service without leaving the page.
- `isHidden: true` services (e.g. the gateway) stay out of the dropdown + grid but remain proxyable.

> This is the same UX as the reference deployment: `https://api.righttapuae.com/api/docs#/` — landing grid, mode toggle, then a service dropdown in the embedded Swagger topbar.

### `public/index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title><PROJECT> API Documentation</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui.css" />
    <style>
      :root {
        --primary:#2563eb; --bg:#f8fafc; --card-bg:#fff; --text-main:#1e293b;
        --text-muted:#64748b; --online:#10b981; --offline:#94a3b8; --border:#e2e8f0;
      }
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family:system-ui,sans-serif; background:var(--bg); color:var(--text-main); min-height:100vh; }
      .dashboard { max-width:1200px; margin:0 auto; padding:60px 24px; }
      header { margin-bottom:48px; }
      header h1 { font-size:32px; font-weight:700; color:#0f172a; margin-bottom:12px; }
      header p { color:var(--text-muted); font-size:18px; }
      .mode-toggle { display:inline-flex; background:#e2e8f0; border-radius:8px; padding:3px; margin-top:20px; }
      .mode-btn { padding:8px 20px; border:none; border-radius:6px; font-size:14px; font-weight:500;
        cursor:pointer; background:transparent; color:var(--text-muted); transition:all .2s; font-family:inherit; }
      .mode-btn.active { background:#fff; color:var(--text-main); box-shadow:0 1px 3px rgba(0,0,0,.1); }
      .mode-hint { display:block; margin-top:10px; font-size:13px; color:var(--text-muted); }
      .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); gap:24px; }
      .card { background:var(--card-bg); border:1px solid var(--border); border-radius:12px; padding:28px;
        transition:all .2s ease; cursor:pointer; display:flex; flex-direction:column; height:100%; }
      .card:hover { transform:translateY(-4px); box-shadow:0 12px 24px -8px rgba(0,0,0,.08); border-color:var(--primary); }
      .card.disabled { opacity:.5; cursor:not-allowed; }
      .card.disabled:hover { transform:none; box-shadow:none; border-color:var(--border); }
      .card-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; }
      .card h3 { font-size:20px; font-weight:600; color:var(--primary); margin-bottom:12px; }
      .card p { font-size:15px; line-height:1.5; color:var(--text-muted); flex-grow:1; margin-bottom:24px; }
      .card-footer { display:flex; align-items:center; gap:12px; }
      .port-pill { background:#f1f5f9; color:#475569; padding:4px 10px; border-radius:6px; font-size:13px; font-family:monospace; }
      .mode-pill { padding:4px 10px; border-radius:6px; font-size:12px; font-weight:500; }
      .mode-pill.static { background:#dbeafe; color:#1e40af; }
      .mode-pill.live { background:#d1fae5; color:#065f46; }
      .mode-pill.unavailable { background:#fee2e2; color:#991b1b; }
      .health-indicator { width:10px; height:10px; border-radius:50%; background:var(--offline); }
      .health-indicator.online { background:var(--online); box-shadow:0 0 8px var(--online); }
      #swagger-container { display:none; }
      .topbar { background:#1e293b; padding:12px 24px; display:flex; align-items:center;
        justify-content:space-between; position:sticky; top:0; z-index:1000; }
      .topbar-brand { color:#fff; font-weight:700; text-decoration:none; font-size:18px; }
      .back-btn { color:#94a3b8; text-decoration:none; font-size:14px; cursor:pointer; }
      .back-btn:hover { color:#fff; }
      .service-nav { display:flex; align-items:center; gap:16px; }
      .topbar select { background:#334155; color:#fff; border:1px solid #475569; padding:6px 12px; border-radius:6px; cursor:pointer; }
      .topbar-mode-badge { font-size:12px; padding:4px 10px; border-radius:6px; font-weight:600; }
      .topbar-mode-badge.static { background:#1e40af; color:#dbeafe; }
      .topbar-mode-badge.live { background:#065f46; color:#d1fae5; }
      #swagger-ui .topbar { display:none; }
      .swagger-notice { padding:12px 20px; font-size:14px; text-align:center; }
      .swagger-notice.static { background:#dbeafe; color:#1e40af; }
      .swagger-notice.live { background:#d1fae5; color:#065f46; }
    </style>
  </head>
  <body>
    <!-- Dashboard View -->
    <div id="dashboard" class="dashboard">
      <header>
        <h1><PROJECT> — API Documentation</h1>
        <p>Select a service to view its detailed API documentation and schemas.</p>
        <div class="mode-toggle">
          <button class="mode-btn active" data-mode="static" onclick="setMode('static')">Static Docs</button>
          <button class="mode-btn" data-mode="live" onclick="setMode('live')">Live Mode</button>
        </div>
        <span id="mode-hint" class="mode-hint">Reading from exported specs — services don't need to be running.</span>
      </header>
      <div id="service-grid" class="grid"></div>
    </div>

    <!-- Swagger View -->
    <div id="swagger-container">
      <div class="topbar">
        <div class="service-nav">
          <a class="back-btn" onclick="showDashboard(event)">&#8592; Back to Dashboard</a>
          <div style="width:1px; height:20px; background:#475569"></div>
          <select id="service-selector"></select>
          <span id="topbar-mode-badge" class="topbar-mode-badge static">STATIC</span>
        </div>
        <a href="/" class="topbar-brand"><PROJECT></a>
      </div>
      <div id="swagger-notice" class="swagger-notice static">
        Read-only mode — showing exported API specs. Services do not need to be running.
      </div>
      <div id="swagger-ui"></div>
    </div>

    <script src="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui-bundle.js"></script>
    <script>
      const DOCS_BASE = window.location.pathname.replace(/\/$/, '') || '';
      let currentUi = null, allServices = [], currentMode = 'static', currentSlug = null;

      async function init() {
        const res = await fetch(`${DOCS_BASE}/config`);
        allServices = (await res.json()).services;
        renderGrid();
        setupSelector();
        checkAllHealth();
      }

      function setMode(mode) {
        currentMode = mode;
        document.querySelectorAll('.mode-btn').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
        document.getElementById('mode-hint').textContent = mode === 'static'
          ? "Reading from exported specs — services don't need to be running."
          : 'Connects to running services — you can "Try it out" with real requests.';
        renderGrid();
      }

      function renderGrid() {
        const grid = document.getElementById('service-grid');
        grid.innerHTML = allServices.map((svc) => {
          const available = currentMode === 'static' ? svc.hasStaticSpec : true;
          const modePill = currentMode === 'static'
            ? (svc.hasStaticSpec
                ? '<span class="mode-pill static">Static spec available</span>'
                : '<span class="mode-pill unavailable">No spec exported</span>')
            : '<span class="mode-pill live">Live — service must be running</span>';
          return `
            <div class="card ${available ? '' : 'disabled'}" onclick="${available ? `openService('${svc.slug}')` : ''}">
              <div class="card-header">
                <h3>${svc.name}</h3>
                <div id="health-${svc.slug}" class="health-indicator"></div>
              </div>
              <p>${svc.description || 'API documentation for ' + svc.name}</p>
              <div class="card-footer">
                <span class="port-pill">:${svc.port}</span>${modePill}
              </div>
            </div>`;
        }).join('');
      }

      function setupSelector() {
        const selector = document.getElementById('service-selector');
        selector.innerHTML = allServices.filter((s) => !s.isHidden)
          .map((svc) => `<option value="${svc.slug}">${svc.name}</option>`).join('');
        selector.addEventListener('change', (e) => openService(e.target.value));
      }

      async function checkAllHealth() {
        for (const svc of allServices) {
          const dot = document.getElementById(`health-${svc.slug}`);
          if (!dot) continue;
          try {
            const data = await (await fetch(`${DOCS_BASE}/health/${svc.slug}`)).json();
            dot.classList.toggle('online', data.status === 'online');
          } catch { dot.classList.remove('online'); }
        }
      }

      // Mode decides spec source: disk snapshot vs live proxy
      function getSpecUrl(slug) {
        return currentMode === 'static'
          ? `${DOCS_BASE}/specs/${slug}`
          : `${DOCS_BASE}/proxy-spec/${slug}`;
      }

      function openService(slug) {
        currentSlug = slug;
        document.getElementById('dashboard').style.display = 'none';
        document.getElementById('swagger-container').style.display = 'block';
        document.getElementById('service-selector').value = slug;

        const badge = document.getElementById('topbar-mode-badge');
        badge.className = `topbar-mode-badge ${currentMode}`;
        badge.textContent = currentMode === 'static' ? 'STATIC' : 'LIVE';

        const notice = document.getElementById('swagger-notice');
        notice.className = `swagger-notice ${currentMode}`;
        notice.textContent = currentMode === 'static'
          ? 'Read-only mode — showing exported API specs. Services do not need to be running.'
          : 'Live mode — connected to running service. You can "Try it out" with real requests.';

        loadSwagger(slug);
      }

      function showDashboard(e) {
        if (e) e.preventDefault();
        document.getElementById('dashboard').style.display = 'block';
        document.getElementById('swagger-container').style.display = 'none';
        window.scrollTo(0, 0);
      }

      function loadSwagger(slug) {
        if (currentUi) { document.getElementById('swagger-ui').innerHTML = ''; currentUi = null; }
        currentUi = SwaggerUIBundle({
          url: getSpecUrl(slug),
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
          layout: 'BaseLayout',
          // Static mode = read-only: hide "Try it out" since services may be down
          supportedSubmitMethods: currentMode === 'static'
            ? []
            : ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'],
        });
      }

      init();
    </script>
  </body>
</html>
```

### Frontend ↔ backend endpoint map

| Frontend call | `server.js` handler | Purpose |
|---|---|---|
| `GET /config` | config | List services + `hasStaticSpec` flags + tunnel-aware URLs |
| `GET /health/:slug` | health | Drive the green/grey health dots |
| `GET /specs/:slug` | static spec | **Static mode** spec (disk) |
| `GET /proxy-spec/:slug` | proxy-spec | **Live mode** spec (live, `servers` rewritten) |
| `* /proxy-api/:slug/*` | proxy-api | **Live mode** "Try it out" passthrough |

---

## Part 6 — Static Spec Export (`export-specs.js`)

Snapshot live specs to disk (CI, offline docs, diffing API changes). Requires services running.

```js
const fs = require('fs');
const path = require('path');
const SPECS_DIR = path.join(__dirname, 'public', 'specs');

const services = [
  { name: 'identity',  url: 'http://localhost:3001' },
  { name: 'emergency', url: 'http://localhost:3002' },
  // ...
];

async function exportAll() {
  if (!fs.existsSync(SPECS_DIR)) fs.mkdirSync(SPECS_DIR, { recursive: true });
  for (const svc of services) {
    try {
      const res = await fetch(`${svc.url}/api/docs-json`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const spec = await res.json();
      fs.writeFileSync(path.join(SPECS_DIR, `${svc.name}.json`), JSON.stringify(spec, null, 2));
      console.log(`  ✓ ${svc.name}`);
    } catch (err) {
      console.log(`  ✗ ${svc.name} — ${err.message} (is the service running?)`);
    }
  }
}
exportAll();
```

---

## Part 7 — Optional: Gateway Docs Index

If you have an API gateway, add a tiny controller that lists where each service's docs live:

```ts
@ApiTags('docs')
@Controller('docs')
export class DocsController {
  private readonly serviceUrls: Record<string, string>;
  constructor(private readonly config: ConfigService) {
    this.serviceUrls = {
      identity: this.config.get('IDENTITY_SERVICE_URL', 'http://localhost:3001'),
      // ...
    };
  }

  @Get('services')
  @ApiOperation({ summary: 'List all service Swagger docs URLs' })
  getServiceDocs() {
    return {
      services: Object.entries(this.serviceUrls).map(([name, url]) => ({ name, docs: `${url}/api/docs` })),
    };
  }
}
```

---

## Part 8 — Root `package.json` Scripts

```json
{
  "scripts": {
    "dev:swagger": "kill-port 8089 && turbo run dev --filter=swagger-ui",
    "swagger:export": "node apps/swagger-ui/export-specs.js"
  }
}
```

---

## Setup Checklist

- [ ] `pnpm add @nestjs/swagger` in every service.
- [ ] Add the `DocumentBuilder` block to each `main.ts` → `SwaggerModule.setup('api/docs', ...)`.
- [ ] Use numbered `[n] Group | Subgroup` tags + `tagsSorter: 'alpha'`.
- [ ] `addBearerAuth(..., 'bearer')` in main.ts; `@ApiBearerAuth('bearer')` on protected routes.
- [ ] Decorate every controller (`@ApiTags`, `@ApiOperation`, `@ApiBody` w/ examples, `@ApiResponse`).
- [ ] Decorate every DTO (`@ApiProperty` / `@ApiPropertyOptional` + `example`).
- [ ] Shared `SuccessResponseDto` / `ErrorResponseDto` matching your response interceptor.
- [ ] Verify each service serves `/api/docs` (UI) and `/api/docs-json` (raw spec).
- [ ] Scaffold `apps/swagger-ui` (server.js + package.json + public/index.html); register every service in the `services` array.
- [ ] Frontend: static/live mode toggle, service-switcher dropdown, health dots all wired to the 5 server endpoints.
- [ ] Run `swagger:export` once so static mode has specs to read.
- [ ] Add `export-specs.js` and root scripts.
- [ ] Test: `pnpm dev:swagger`, open `http://localhost:8089`, run a "Try it out".

---

## Gotchas

- **Spec endpoint is `/api/docs-json`** — auto-generated by `SwaggerModule.setup('api/docs', ...)`. The aggregator + export both rely on it; if you change the docs path, change both.
- **CORS on services** — services need `app.enableCors(...)` for direct browser access; the aggregator proxy sidesteps this for shared/tunnel scenarios.
- **Keep tag strings identical** between `addTag(...)` in main.ts and `@ApiTags(...)` on controllers, or operations land in an untagged bucket.
- **`persistAuthorization: true`** keeps the bearer token across reloads — big QA quality-of-life win.
- **Examples drive prefill** — `@ApiBody({ examples: {...} })` and DTO `example` fields populate "Try it out", saving manual typing.
</content>
</invoke>
