import knex from 'knex';

export const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL || {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'allgo_db',
  },
  pool: { min: 2, max: 20 },
});
