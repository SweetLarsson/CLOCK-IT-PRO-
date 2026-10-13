import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

let _isPgOnline: boolean = false;
let _hasCheckedOnline: boolean = false;
let _lastHealthCheck = 0;

export const isPgConfigured = () => {
  const host = process.env.SQL_HOST || process.env.DATABASE_URL || process.env.PGHOST;
  return Boolean(host && host.trim() !== "");
};

export const isPgOnline = () => {
  return _hasCheckedOnline && _isPgOnline;
};

export const setPgOffline = () => {
  _isPgOnline = false;
  _hasCheckedOnline = true;
};

export const checkPgConnection = async (timeoutMs = 1200): Promise<boolean> => {
  if (!isPgConfigured()) {
    _isPgOnline = false;
    _hasCheckedOnline = true;
    return false;
  }

  const now = Date.now();
  // If checked recently (within 45s for offline, or 15s for online), reuse cached state
  if (_hasCheckedOnline && now - _lastHealthCheck < (_isPgOnline ? 15000 : 45000)) {
    return _isPgOnline;
  }

  _lastHealthCheck = now;

  try {
    const p = createPool();
    const probe = new Promise<boolean>((resolve, reject) => {
      p.connect((err, client, release) => {
        if (err || !client) {
          return reject(err || new Error("Failed to acquire client"));
        }
        client.query("SELECT 1", (qErr) => {
          release();
          if (qErr) reject(qErr);
          else resolve(true);
        });
      });
    });

    const timeout = new Promise<boolean>((_, reject) => {
      setTimeout(() => reject(new Error("Database probe timeout")), timeoutMs);
    });

    await Promise.race([probe, timeout]);
    _isPgOnline = true;
    _hasCheckedOnline = true;
    return true;
  } catch {
    _isPgOnline = false;
    _hasCheckedOnline = true;
    return false;
  }
};

export const createPool = () => {
  if (!global._postgresPool) {
    const host = process.env.SQL_HOST || 'localhost';
    const isSocket = host.startsWith('/');
    global._postgresPool = new Pool({
      host,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 5,
      connectionTimeoutMillis: 1500,
      idleTimeoutMillis: 10000,
      keepAlive: false,
      ...(isSocket ? {} : { port: process.env.SQL_PORT ? Number(process.env.SQL_PORT) : 5432 }),
    });

    global._postgresPool.on('error', (_err) => {
      // Quietly mark offline on pool connection drop
      _isPgOnline = false;
    });
  }
  return global._postgresPool;
};

const pool = createPool();

export const db = drizzle(pool, { schema });
