import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    driver: 'pg',
    schema: './src/lib/schema.ts',
    out: './drizzle',
    dbCredentials: {
        connectionString: process.env.DATABASE_URL!,
    },
});
