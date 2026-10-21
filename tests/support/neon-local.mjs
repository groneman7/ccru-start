import { readFileSync } from 'node:fs';
import { neonConfig } from '@neondatabase/serverless';

// Replace only Neon's external HTTP transport. The app keeps its production
// Drizzle/Neon adapter, SQL, services, server functions, and authentication.
const endpoint = new URL(process.env.CCRU_TEST_SQL_URL);
if (endpoint.protocol !== 'http:' || endpoint.hostname !== '127.0.0.1') {
  throw new Error('The test SQL transport must be loopback HTTP.');
}
neonConfig.fetchEndpoint = endpoint.href;

// Capture Resend requests locally; tests never send mail or use real credentials.
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = input instanceof Request ? input.url : String(input);
  if (url === 'https://oauth2.googleapis.com/token') {
    return originalFetch(process.env.CCRU_TEST_GOOGLE_URL, init);
  }
  if (url.startsWith('https://api.resend.com/')) {
    return originalFetch(process.env.CCRU_TEST_EMAIL_URL, init);
  }
  return originalFetch(input, init);
};

// The approved clock seam affects this fixture process only, never production.
if (process.env.CCRU_TEST_NOW_FILE) {
  const NativeDate = globalThis.Date;
  const now = () =>
    Number(readFileSync(process.env.CCRU_TEST_NOW_FILE, 'utf8'));
  globalThis.Date = class extends NativeDate {
    constructor(...args) {
      if (args.length) super(...args);
      else super(now());
    }
    static now() {
      return now();
    }
  };
}
