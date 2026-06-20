const fs = require('fs');
const path = require('path');
const SPECS_DIR = path.join(__dirname, 'public', 'specs');

const services = [
  { name: 'backend', url: process.env.BACKEND_URL || 'http://localhost:4000' },
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
