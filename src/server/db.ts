import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const connectionString = (
  process.env.DATABASE_URL_POOLED ||
  process.env.DATABASE_URL ||
  ''
).trim();

export const pool = new Pool({
  connectionString: connectionString || undefined,
  ssl: connectionString ? { rejectUnauthorized: false } : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on('error', (err) => {
  console.error('[Neon PostgreSQL] Unexpected pool client error:', err.message);
});

export async function query<T extends pg.QueryResultRow = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  const res = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (process.env.DEBUG_SQL === 'true') {
    console.log('[Neon PostgreSQL Query]', { text, duration: `${duration}ms`, rows: res.rowCount });
  }
  return res;
}

export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  vendor: string;
  host: string;
  database: string;
  latencyMs: number;
  serverVersion?: string;
  tableCount?: number;
  triggerCount?: number;
  indexCount?: number;
  error?: string;
}> {
  const connStr = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL || '';
  if (!connStr) {
    return {
      connected: false,
      vendor: 'neon',
      host: 'not-configured',
      database: 'not-configured',
      latencyMs: 0,
      error: 'DATABASE_URL or DATABASE_URL_POOLED is not set.'
    };
  }

  try {
    const url = new URL(connStr);
    const host = url.hostname;
    const database = url.pathname.replace(/^\//, '') || 'neondb';

    const start = Date.now();
    const verRes = await pool.query('SELECT version();');
    const latencyMs = +(Date.now() - start);

    const statsRes = await pool.query(`
      SELECT 
        (SELECT count(*) FROM information_schema.tables WHERE table_schema IN ('crm', 'crm_v2', 'public')) as tables,
        (SELECT count(*) FROM information_schema.triggers WHERE trigger_schema IN ('crm', 'crm_v2', 'public')) as triggers,
        (SELECT count(*) FROM pg_indexes WHERE schemaname IN ('crm', 'crm_v2', 'public')) as indexes
    `);

    return {
      connected: true,
      vendor: 'neon',
      host,
      database,
      latencyMs,
      serverVersion: verRes.rows[0]?.version || 'PostgreSQL 18 (Neon Serverless)',
      tableCount: Number(statsRes.rows[0]?.tables || 0),
      triggerCount: Number(statsRes.rows[0]?.triggers || 0),
      indexCount: Number(statsRes.rows[0]?.indexes || 0)
    };
  } catch (err: any) {
    return {
      connected: false,
      vendor: 'neon',
      host: 'neon.tech',
      database: 'neondb',
      latencyMs: 0,
      error: err?.message || 'Database connection error'
    };
  }
}
