import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { TicketData } from './verification';

const DB_NAME = 'gambia_validator.db';

export interface TicketRecord {
  id: number;
  ticket_id: string;
  data: string; // JSON string of the ticket data
  prev_hash: string;
  current_hash: string;
  scanned_at: string;
}

// Singleton promise to ensure we only open the DB once
let dbInstance: SQLite.SQLiteDatabase | null = null;
let dbInitPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export const getDB = async (): Promise<SQLite.SQLiteDatabase> => {
  if (dbInstance) return dbInstance;
  
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id TEXT NOT NULL UNIQUE,
        data TEXT NOT NULL,
        prev_hash TEXT NOT NULL,
        current_hash TEXT NOT NULL,
        scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    dbInstance = db;
    return db;
  })();

  return dbInitPromise;
};

// Kept for backward compatibility if needed, but getDB is preferred
export const initDatabase = async () => {
  await getDB();
};

export const getLatestHash = async (): Promise<string> => {
  const db = await getDB();
  const result = await db.getFirstAsync<{ current_hash: string }>(
    'SELECT current_hash FROM ledger ORDER BY id DESC LIMIT 1'
  );
  return result?.current_hash || 'GENESIS_HASH';
};

export const checkTicketExists = async (ticketId: string): Promise<boolean> => {
  const db = await getDB();
  const result = await db.getFirstAsync(
    'SELECT 1 FROM ledger WHERE ticket_id = ?',
    [ticketId]
  );
  return !!result;
};

export const insertTicket = async (ticketData: TicketData): Promise<void> => {
  const db = await getDB();
  
  const prevHash = await getLatestHash();
  const dataString = JSON.stringify(ticketData);
  const timestamp = new Date().toISOString();
  
  // Hash Chain Rule: SHA256( Ticket_ID + Timestamp + Previous_Row_Hash )
  const contentToHash = `${ticketData.ticket_id}${timestamp}${prevHash}`;
  const currentHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    contentToHash
  );

  await db.runAsync(
    'INSERT INTO ledger (ticket_id, data, prev_hash, current_hash, scanned_at) VALUES (?, ?, ?, ?, ?)',
    [ticketData.ticket_id, dataString, prevHash, currentHash, timestamp]
  );
};

export const getAllTickets = async (): Promise<TicketRecord[]> => {
  const db = await getDB();
  return await db.getAllAsync<TicketRecord>('SELECT * FROM ledger ORDER BY id DESC');
};

// "Tamper Test": Delete a random row to break the chain (logic to detect this would be usually verifying the chain)
export const corruptDatabase = async () => {
  const db = await getDB();
  // Delete a middle row
  await db.runAsync('DELETE FROM ledger WHERE id = (SELECT id FROM ledger ORDER BY id DESC LIMIT 1 OFFSET 1)');
};
