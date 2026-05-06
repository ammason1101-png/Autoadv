import pkg from 'pg';
const { Pool } = pkg;

// 🔍 Debug (remove later if you want)
console.log("DATABASE_URL =", process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export async function query(text, params) {
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (err) {
    console.error("❌ Database query error:", err);
    throw err;
  }
}

export default pool;
