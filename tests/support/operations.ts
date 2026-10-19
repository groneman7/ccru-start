import { spawn } from 'node:child_process';

export async function operation<T = unknown>(
  baseURL: string,
  module: string,
  group: string,
  action: string,
  data?: unknown,
  cookie = '',
) {
  // Discover the application's compiled client reference; use TanStack's real
  // public RPC client for serialization, HTTP transport, and response decoding.
  const source = await (
    await fetch(`${baseURL}/src/features/${module}/functions.ts`)
  ).text();
  const mapping = source.match(
    new RegExp(`export const ${group} = \\{([\\s\\S]*?)\\};`),
  )?.[1];
  const name = mapping?.match(new RegExp(`\\b${action}: (\\w+)`))?.[1];
  const declaration =
    name &&
    source.match(
      new RegExp(
        `(?:const|let) ${name} = ([\\s\\S]*?)createClientRpc\\("([^"]+)"\\)`,
      ),
    );
  if (!declaration)
    throw new Error(`No client RPC reference for ${module}.${group}.${action}`);
  const method = /method:\s*["']POST["']/.test(declaration[1]) ? 'POST' : 'GET';
  return new Promise<{ ok: boolean; value?: T; error?: string }>(
    (done, reject) => {
      const child = spawn(
        process.execPath,
        ['tests/support/call-server-function.mjs'],
        { stdio: ['pipe', 'pipe', 'pipe'] },
      );
      let output = '',
        errors = '';
      child.stdout.on('data', (chunk) => (output += chunk));
      child.stderr.on('data', (chunk) => (errors += chunk));
      child.once('error', reject);
      child.once('exit', (code) => {
        if (code) reject(new Error(errors));
        else {
          try {
            done(JSON.parse(output));
          } catch {
            reject(new Error(output + errors));
          }
        }
      });
      child.stdin.end(
        JSON.stringify({ baseURL, id: declaration[2], method, data, cookie }),
      );
    },
  );
}

export async function signIn(baseURL: string, email: string) {
  const response = await fetch(`${baseURL}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'http://localhost:3000',
    },
    body: JSON.stringify({ email, password: 'fixture-password-36' }),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');
}
