import { defineConfig } from 'drizzle-kit';

// Generation is offline. Introspection/studio require an explicitly chosen target;
// migration execution goes through the guarded db:migrate command.
export default defineConfig({
  ...(process.env.MIGRATION_DATABASE_URL
    ? { dbCredentials: { url: process.env.MIGRATION_DATABASE_URL } }
    : {}),
  dialect: 'postgresql',
  migrations: {
    table: '_mvp_migrations',
    schema: '_drizzle',
  },
  schema: './src/server/db/schema.ts',
  schemaFilter: ['authz', 'better-auth', 'calendar', 'public'],
  out: './drizzle/mvp',
});
