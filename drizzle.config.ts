import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env.local' });
config({ path: '.env' });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in the .env file');
}

export default defineConfig({
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  dialect: 'postgresql',
  migrations: {
    table: '_migrations',
    schema: '_drizzle',
  },
  schema: './src/server/db/schema.ts',
  schemaFilter: ['_migrations', 'authz', 'better-auth', 'calendar', 'public'],
  out: './drizzle',
});
