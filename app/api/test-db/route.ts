import { NextResponse } from 'next/server';
import { pgPool } from '@/lib/postgres';
import { mysqlPool } from '@/lib/mysql';

export async function GET() {
  const status: Record<string, any> = {
    postgres: { connected: false, vectorExtension: false, recordCount: 0 },
    mysql: { connected: false, recordCount: 0 },
  };

  // 1. Test PostgreSQL & pgvector
  try {
    const pgVersion = await pgPool.query('SELECT version()');
    const extCheck = await pgPool.query(
      "SELECT extname FROM pg_extension WHERE extname = 'vector'"
    );
    const pgCount = await pgPool.query(
      'SELECT COUNT(*) FROM opportunity_vectors'
    );

    status.postgres = {
      connected: true,
      version: pgVersion.rows[0].version,
      vectorExtension: extCheck.rows.length > 0,
      recordCount: parseInt(pgCount.rows[0].count, 10),
    };
  } catch (err: any) {
    status.postgres.error = err.message;
  }

  // 2. Test MySQL
  try {
    const [rows]: any = await mysqlPool.query(
      'SELECT COUNT(*) AS count FROM Opportunities'
    );
    status.mysql = {
      connected: true,
      recordCount: rows[0].count,
    };
  } catch (err: any) {
    status.mysql.error = err.message;
  }

  const allConnected = status.postgres.connected && status.mysql.connected;

  return NextResponse.json(
    { success: allConnected, status },
    { status: allConnected ? 200 : 500 }
  );
}