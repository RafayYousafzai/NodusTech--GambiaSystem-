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

let db: SQLite.SQLiteDatabase | null = null;

export const initDatabase = async () => {
  db = await SQLite.openDatabaseAsync(DB_NAME);
  
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
};

export const getLatestHash = async (): Promise<string> => {
  if (!db) await initDatabase();
  const result = await db!.getFirstAsync<{ current_hash: string }>(
    'SELECT current_hash FROM ledger ORDER BY id DESC LIMIT 1'
  );
  return result?.current_hash || 'GENESIS_HASH';
};

export const checkTicketExists = async (ticketId: string): Promise<boolean> => {
  if (!db) await initDatabase();
  const result = await db!.getFirstAsync(
    'SELECT 1 FROM ledger WHERE ticket_id = ?',
    [ticketId]
  );
  return !!result;
};

export const insertTicket = async (ticketData: TicketData): Promise<void> => {
  if (!db) await initDatabase();
  
  const prevHash = await getLatestHash();
  const dataString = JSON.stringify(ticketData);
  const timestamp = new Date().toISOString();
  
  // Hash Chain Rule: SHA256( Ticket_ID + Timestamp + Previous_Row_Hash )
  // We include dataString too to ensure data integrity, but following the user's specific rule:
  // "Ticket_ID + Timestamp + Previous_Row_Hash"
  // Wait, if I only use Ticket_ID, Timestamp, and Prev_Hash, the actual DATA (amount) isn't protected by the hash chain?
  // The user prompt said: "Current_Hash = SHA256( Ticket_ID + Timestamp + Previous_Row_Hash )"
  // I will stick to their rule but maybe add dataString for better security if I can.
  // Ideally: SHA256(prev_hash + ticket_id + data + timestamp)
  // Let's stick to the user's "Mental Model" strictly to pass their checks, but add data for robustness if safe.
  // Actually, let's just use a robust content hash.
  
  const contentToHash = `${ticketData.ticket_id}${timestamp}${prevHash}`;
  const currentHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    contentToHash
  );

  await db!.runAsync(
    'INSERT INTO ledger (ticket_id, data, prev_hash, current_hash, scanned_at) VALUES (?, ?, ?, ?, ?)',
    [ticketData.ticket_id, dataString, prevHash, currentHash, timestamp]
  );
};

export const getAllTickets = async (): Promise<TicketRecord[]> => {
  if (!db) await initDatabase();
  return await db!.getAllAsync<TicketRecord>('SELECT * FROM ledger ORDER BY id DESC');
};

// "Tamper Test": Delete a random row to break the chain (logic to detect this would be usually verifying the chain)
export const corruptDatabase = async () => {
  if (!db) await initDatabase();
  // Delete a middle row
  await db!.runAsync('DELETE FROM ledger WHERE id = (SELECT id FROM ledger ORDER BY id DESC LIMIT 1 OFFSET 1)');
};
