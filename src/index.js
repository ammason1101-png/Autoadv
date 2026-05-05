import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false
});

export function query(text, params) {
  return pool.query(text, params);
}

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL error:', err);
});

export default pool;
