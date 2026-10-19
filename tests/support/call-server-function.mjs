import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { createClientRpc } from '@tanstack/react-start/client-rpc';

// Initialize only the RPC client's framework options outside a Start server.
// Authentication and request context are established independently by real HTTP.
const startRequire = createRequire(
  import.meta.resolve('@tanstack/react-start/client-rpc'),
);
const coreRequire = createRequire(
  startRequire.resolve('@tanstack/start-client-core/package.json'),
);
const contextPackage = coreRequire.resolve(
  '@tanstack/start-storage-context/package.json',
);
const entry = JSON.parse(readFileSync(contextPackage, 'utf8')).exports['.']
  .import.default;
const { runWithStartContext } = await import(
  new URL(entry, pathToFileURL(contextPackage)).href
);
let input = '';
for await (const chunk of process.stdin) input += chunk;
const { baseURL, id, method, data, cookie } = JSON.parse(input);
process.env.TSS_SERVER_FN_BASE = `${baseURL}/_serverFn/`;
try {
  const value = await runWithStartContext({ startOptions: {} }, () =>
    createClientRpc(id)({
      method,
      data,
      headers: { cookie, origin: baseURL },
      signal: AbortSignal.timeout(15000),
    }),
  );
  if (value?.error) throw value.error;
  console.log(JSON.stringify({ ok: true, value: value?.result ?? value }));
} catch (error) {
  console.log(
    JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
}
