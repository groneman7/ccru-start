import { neonConfig } from '@neondatabase/serverless';

// Replace only Neon's external HTTP transport. The app keeps its production
// Drizzle/Neon adapter, SQL, services, server functions, and authentication.
const endpoint = new URL(process.env.CCRU_TEST_SQL_URL);
if (endpoint.protocol !== 'http:' || endpoint.hostname !== '127.0.0.1') {
  throw new Error('The test SQL transport must be loopback HTTP.');
}
neonConfig.fetchEndpoint = endpoint.href;
